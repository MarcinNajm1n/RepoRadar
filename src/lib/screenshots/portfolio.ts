import path from "node:path";

export const PORTFOLIO_SCREENSHOT_OUTPUT_DIR = path.join("test-results", "portfolio-screenshots");
export const DEFAULT_PORTFOLIO_SCREENSHOT_BASE_URL = "http://127.0.0.1:3000";
export const DEFAULT_PORTFOLIO_SCREENSHOT_TIMEOUT_MS = 30_000;

export type PortfolioScreenshotManifestItem = {
  id: string;
  filename: string;
  title: string;
  description: string;
};

export const portfolioScreenshotManifest = [
  {
    id: "radar-today",
    filename: "01-radar-today.png",
    title: "Radar dzisiaj",
    description: "Daily decision dashboard with top repository signals, actions and portfolio metrics."
  },
  {
    id: "library-expanded",
    filename: "02-library-expanded-repo.png",
    title: "Biblioteka with expanded repo",
    description: "Repository list, filters and the decision/timeline panel for a selected repository."
  },
  {
    id: "action-queue",
    filename: "03-action-queue.png",
    title: "Kolejka akcji",
    description: "Task queue used to track reading, demos, validation and follow-up decisions."
  },
  {
    id: "ideas-candidates",
    filename: "04-ideas-candidates.png",
    title: "Kandydaci",
    description: "Idea candidate panel and its empty or seeded portfolio state."
  },
  {
    id: "weekly-reports",
    filename: "05-weekly-reports.png",
    title: "Raporty tygodniowe",
    description: "Weekly report list, comparison panel and empty state from local reports."
  },
  {
    id: "command-palette",
    filename: "06-command-palette.png",
    title: "Paleta komend",
    description: "Keyboard command palette with scan, reporting and navigation commands."
  }
] as const satisfies readonly PortfolioScreenshotManifestItem[];

export type PortfolioScreenshotShotId = (typeof portfolioScreenshotManifest)[number]["id"];

export type PortfolioScreenshotOptions = {
  baseUrl: string;
  timeoutMs: number;
  list: boolean;
  help: boolean;
};

export function parsePortfolioScreenshotArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env
): PortfolioScreenshotOptions {
  let baseUrl = env.PLAYWRIGHT_BASE_URL ?? DEFAULT_PORTFOLIO_SCREENSHOT_BASE_URL;
  let timeoutMs = DEFAULT_PORTFOLIO_SCREENSHOT_TIMEOUT_MS;
  let list = false;
  let help = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--list") {
      list = true;
      continue;
    }

    if (arg === "--base-url") {
      index += 1;
      baseUrl = requireValue(arg, argv[index]);
      continue;
    }

    if (arg.startsWith("--base-url=")) {
      baseUrl = requireValue("--base-url", arg.slice("--base-url=".length));
      continue;
    }

    if (arg === "--timeout-ms") {
      index += 1;
      timeoutMs = readTimeoutMs(requireValue(arg, argv[index]));
      continue;
    }

    if (arg.startsWith("--timeout-ms=")) {
      timeoutMs = readTimeoutMs(requireValue("--timeout-ms", arg.slice("--timeout-ms=".length)));
      continue;
    }

    throw new Error(`Unknown portfolio screenshot argument: ${arg}`);
  }

  return {
    baseUrl: list || help ? readLocalBaseUrl(DEFAULT_PORTFOLIO_SCREENSHOT_BASE_URL) : readLocalBaseUrl(baseUrl),
    timeoutMs,
    list,
    help
  };
}

export function buildPortfolioScreenshotPaths(cwd = process.cwd()) {
  const outputDir = path.resolve(cwd, PORTFOLIO_SCREENSHOT_OUTPUT_DIR);

  return {
    outputDir,
    files: portfolioScreenshotManifest.map((shot) => ({
      ...shot,
      path: buildPortfolioScreenshotFilePath(shot.filename, cwd)
    }))
  };
}

export function buildPortfolioScreenshotFilePath(filename: string, cwd = process.cwd()) {
  if (filename !== path.basename(filename) || filename.includes("/") || filename.includes("\\")) {
    throw new Error("Portfolio screenshot filenames must not include directory segments.");
  }

  if (path.extname(filename).toLowerCase() !== ".png") {
    throw new Error("Portfolio screenshots must be PNG files.");
  }

  const outputDir = path.resolve(cwd, PORTFOLIO_SCREENSHOT_OUTPUT_DIR);
  const filePath = path.resolve(outputDir, filename);

  if (!isPathInsideDirectory(filePath, outputDir)) {
    throw new Error("Portfolio screenshot output must stay inside test-results/portfolio-screenshots.");
  }

  return filePath;
}

export function isPortfolioScreenshotOutputDirectoryAllowed(outputDir: string, cwd = process.cwd()) {
  return isPathInsideDirectory(path.resolve(cwd, outputDir), path.resolve(cwd, "test-results"));
}

export function isPathInsideDirectory(candidate: string, parent: string) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!!relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

export function readLocalBaseUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);

  if (parsed.protocol !== "http:" || !isLocalhostHostname(parsed.hostname)) {
    throw new Error("Portfolio screenshot base URL must be an http:// localhost URL.");
  }

  return parsed.toString().replace(/\/$/, "");
}

export function isAllowedPortfolioCaptureUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);

  if (parsed.protocol === "http:" || parsed.protocol === "https:") {
    return isLocalhostHostname(parsed.hostname);
  }

  if (parsed.protocol === "blob:") {
    try {
      const blobOrigin = new URL(parsed.pathname);
      return (blobOrigin.protocol === "http:" || blobOrigin.protocol === "https:") && isLocalhostHostname(blobOrigin.hostname);
    } catch {
      return false;
    }
  }

  return rawUrl === "about:blank" || parsed.protocol === "data:";
}

export function isLocalPortfolioPageUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);

  return (parsed.protocol === "http:" || parsed.protocol === "https:") && isLocalhostHostname(parsed.hostname);
}

export function getPortfolioScreenshotHelp() {
  const shots = portfolioScreenshotManifest.map((shot) => `- ${shot.filename}: ${shot.title}`).join("\n");

  return [
    "Usage: npm run screenshots:portfolio -- [--base-url=http://127.0.0.1:3000] [--list]",
    "",
    `Output directory: ${PORTFOLIO_SCREENSHOT_OUTPUT_DIR}`,
    "",
    "Shots:",
    shots
  ].join("\n");
}

function requireValue(flag: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${flag} requires a value.`);
  }

  return value;
}

function readTimeoutMs(value: string) {
  const timeoutMs = Number(value);

  if (!Number.isInteger(timeoutMs) || timeoutMs < 1_000) {
    throw new Error("--timeout-ms must be an integer greater than or equal to 1000.");
  }

  return timeoutMs;
}

function isLocalhostHostname(hostname: string) {
  const normalized = hostname.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
}
