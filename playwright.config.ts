import { defineConfig, devices } from "@playwright/test";

const baseURL = readLocalBaseURL(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000");

export default defineConfig({
  testDir: "./tests/ui",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry"
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    }
  ]
});

function readLocalBaseURL(rawUrl: string) {
  const parsed = new URL(rawUrl);
  const hostname = parsed.hostname.toLowerCase();
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1" || hostname === "[::1]";

  if (parsed.protocol !== "http:" || !isLocalhost) {
    throw new Error("PLAYWRIGHT_BASE_URL must be an http:// localhost URL.");
  }

  return parsed.toString().replace(/\/$/, "");
}
