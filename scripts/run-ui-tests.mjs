import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const explicitBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
let baseUrl = readLocalBaseUrl(explicitBaseUrl ?? "http://127.0.0.1:3000");
let serverUrl = new URL(baseUrl);
const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
const playwrightBin = path.join(projectRoot, "node_modules", "@playwright", "test", "cli.js");

let server;

try {
  if (await canConnect(baseUrl)) {
    if (explicitBaseUrl) {
      throw new Error(`UI test URL already responds at ${baseUrl}. Stop the existing server before running npm run test:ui.`);
    }

    baseUrl = await findAvailableBaseUrl();
    serverUrl = new URL(baseUrl);
  }

  server = spawn(process.execPath, [nextBin, "start", "-H", serverUrl.hostname, "-p", serverUrl.port || "3000"], {
    cwd: projectRoot,
    env: process.env,
    stdio: ["ignore", "inherit", "inherit"]
  });

  server.on("exit", (code, signal) => {
    if (code !== null && code !== 0) {
      console.error(`UI test server exited early with code ${code}.`);
    }
    if (signal) {
      console.error(`UI test server exited early from signal ${signal}.`);
    }
  });

  await waitForServer(baseUrl, 30_000);

  const playwright = spawn(process.execPath, [playwrightBin, "test", ...process.argv.slice(2)], {
    cwd: projectRoot,
    env: { ...process.env, PLAYWRIGHT_BASE_URL: baseUrl },
    stdio: "inherit"
  });

  const [code] = await once(playwright, "exit");
  process.exitCode = code ?? 1;
} finally {
  stopServer(server);
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server?.exitCode !== null) {
      throw new Error("UI test server stopped before it became ready.");
    }

    if (await canConnect(url)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for UI test server at ${url}.`);
}

function canConnect(url) {
  return new Promise((resolve) => {
    const request = http.get(url, (response) => {
      response.resume();
      resolve((response.statusCode ?? 500) < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1_000, () => {
      request.destroy();
      resolve(false);
    });
  });
}

function findAvailableBaseUrl() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve(`http://127.0.0.1:${port}`);
      });
    });
  });
}

function stopServer(child) {
  if (!child?.pid || child.exitCode !== null) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    child.kill();
    child.unref();
    return;
  }

  child.kill("SIGTERM");
  child.unref();
}

function readLocalBaseUrl(rawUrl) {
  const parsed = new URL(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";

  if (parsed.protocol !== "http:" || !isLocalhost) {
    throw new Error("PLAYWRIGHT_BASE_URL for UI tests must be an http:// localhost URL.");
  }

  return parsed.toString().replace(/\/$/, "");
}
