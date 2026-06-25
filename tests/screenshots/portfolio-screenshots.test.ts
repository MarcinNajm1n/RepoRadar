import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildPortfolioScreenshotFilePath,
  buildPortfolioScreenshotPaths,
  isAllowedPortfolioCaptureUrl,
  isPortfolioScreenshotOutputDirectoryAllowed,
  isLocalPortfolioPageUrl,
  parsePortfolioScreenshotArgs,
  portfolioScreenshotManifest,
  PORTFOLIO_SCREENSHOT_OUTPUT_DIR,
  readLocalBaseUrl
} from "../../src/lib/screenshots/portfolio";

describe("portfolio screenshot workflow helpers", () => {
  it("keeps every configured screenshot as a PNG under test-results/portfolio-screenshots", () => {
    const cwd = path.resolve("C:/repo");
    const paths = buildPortfolioScreenshotPaths(cwd);

    expect(paths.outputDir).toBe(path.resolve(cwd, PORTFOLIO_SCREENSHOT_OUTPUT_DIR));
    expect(paths.files).toHaveLength(portfolioScreenshotManifest.length);

    for (const file of paths.files) {
      expect(path.extname(file.filename)).toBe(".png");
      expect(file.path).toBe(path.resolve(paths.outputDir, file.filename));
      expect(path.relative(paths.outputDir, file.path).startsWith("..")).toBe(false);
    }

    expect(isPortfolioScreenshotOutputDirectoryAllowed("test-results/portfolio-screenshots", cwd)).toBe(true);
    expect(isPortfolioScreenshotOutputDirectoryAllowed("docs/screenshots", cwd)).toBe(false);
    expect(isPortfolioScreenshotOutputDirectoryAllowed("../outside", cwd)).toBe(false);
  });

  it("rejects non-PNG files and nested screenshot paths", () => {
    expect(() => buildPortfolioScreenshotFilePath("report.jpg", "C:/repo")).toThrow("PNG");
    expect(() => buildPortfolioScreenshotFilePath("../report.png", "C:/repo")).toThrow("directory segments");
    expect(() => buildPortfolioScreenshotFilePath("nested/report.png", "C:/repo")).toThrow("directory segments");
    expect(() => buildPortfolioScreenshotFilePath("nested\\report.png", "C:/repo")).toThrow("directory segments");
  });

  it("parses local-only base URLs and simple script flags", () => {
    expect(parsePortfolioScreenshotArgs([], {})).toMatchObject({
      baseUrl: "http://127.0.0.1:3000",
      list: false,
      help: false
    });
    expect(parsePortfolioScreenshotArgs(["--base-url", "http://localhost:3010", "--timeout-ms=5000"], {})).toMatchObject({
      baseUrl: "http://localhost:3010",
      timeoutMs: 5000
    });
    expect(parsePortfolioScreenshotArgs(["--list"], {})).toMatchObject({ list: true });
    expect(parsePortfolioScreenshotArgs(["--help"], {})).toMatchObject({ help: true });
    expect(parsePortfolioScreenshotArgs(["--list"], { PLAYWRIGHT_BASE_URL: "https://example.com" })).toMatchObject({
      baseUrl: "http://127.0.0.1:3000",
      list: true
    });
  });

  it("rejects remote or non-http capture URLs", () => {
    expect(() => readLocalBaseUrl("https://127.0.0.1:3000")).toThrow("localhost URL");
    expect(() => readLocalBaseUrl("http://example.com")).toThrow("localhost URL");
    expect(() => parsePortfolioScreenshotArgs(["--unknown"], {})).toThrow("Unknown portfolio screenshot argument");
  });

  it("allows only local HTTP(S), browser data, and blob requests during capture", () => {
    expect(isAllowedPortfolioCaptureUrl("http://127.0.0.1:3000/_next/static/app.js")).toBe(true);
    expect(isAllowedPortfolioCaptureUrl("https://localhost:3000/asset.png")).toBe(true);
    expect(isAllowedPortfolioCaptureUrl("data:image/png;base64,AA==")).toBe(true);
    expect(isAllowedPortfolioCaptureUrl("blob:http://127.0.0.1:3000/id")).toBe(true);
    expect(isAllowedPortfolioCaptureUrl("blob:https://example.com/id")).toBe(false);
    expect(isAllowedPortfolioCaptureUrl("https://example.com/asset.png")).toBe(false);
    expect(isLocalPortfolioPageUrl("http://localhost:3000/library")).toBe(true);
    expect(isLocalPortfolioPageUrl("data:text/html,ok")).toBe(false);
  });
});
