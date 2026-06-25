import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "@playwright/test";
import {
  buildPortfolioScreenshotPaths,
  getPortfolioScreenshotHelp,
  isAllowedPortfolioCaptureUrl,
  isPortfolioScreenshotOutputDirectoryAllowed,
  isLocalPortfolioPageUrl,
  isPathInsideDirectory,
  parsePortfolioScreenshotArgs,
  type PortfolioScreenshotShotId
} from "../src/lib/screenshots/portfolio";

type CaptureContext = {
  page: Page;
  baseUrl: string;
};

const captureHandlers: Record<PortfolioScreenshotShotId, (context: CaptureContext) => Promise<void>> = {
  "radar-today": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
  },
  "library-expanded": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
    await openNavigationTab(page, "Biblioteka");
    await page.getByRole("button", { name: "Rozwin szczegoly" }).first().click();
    await page.getByText("Centrum decyzji").first().waitFor();
    await settlePage(page);
  },
  "action-queue": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
    await openNavigationTab(page, "Zadania");
    await page.getByRole("button", { name: "Dodaj zadanie" }).waitFor();
    await settlePage(page);
  },
  "ideas-candidates": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
    await page.getByRole("complementary").getByRole("button", { name: /Pomys/ }).click();
    await page.getByText("Szybka ocena okazji przed pelnym pomyslem.").waitFor();
    await settlePage(page);
  },
  "weekly-reports": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
    await openNavigationTab(page, "Raporty tygodniowe");
    await waitForAnyText(page, ["Lokalne podsumowania zapisane jako markdown.", "Porownanie tydzien do tygodnia"]);
    await settlePage(page);
  },
  "command-palette": async ({ page, baseUrl }) => {
    await openHome(page, baseUrl);
    await page.getByRole("button", { name: "Komendy" }).click();
    await page.getByRole("dialog", { name: "Paleta komend" }).waitFor();
    await settlePage(page);
  }
};

async function main() {
  const options = parsePortfolioScreenshotArgs(process.argv.slice(2));

  if (options.help) {
    console.log(getPortfolioScreenshotHelp());
    return;
  }

  const paths = buildPortfolioScreenshotPaths();

  if (options.list) {
    console.log(getPortfolioScreenshotHelp());
    return;
  }

  await ensurePortfolioScreenshotOutputDirectory(paths.outputDir);

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light"
    });
    page.setDefaultTimeout(options.timeoutMs);
    page.setDefaultNavigationTimeout(options.timeoutMs);
    await installLocalhostOnlyNetwork(page);

    for (const shot of paths.files) {
      await captureHandlers[shot.id]({ page, baseUrl: options.baseUrl });
      assertLocalPageUrl(page);
      const screenshot = await page.screenshot({ fullPage: true, animations: "disabled" });
      await writeVerifiedScreenshot(shot.path, screenshot, paths.outputDir);
      console.log(`${shot.filename} -> ${path.relative(process.cwd(), shot.path)}`);
    }
  } finally {
    await browser.close();
  }
}

async function openHome(page: Page, baseUrl: string) {
  await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  assertLocalPageUrl(page);
  await page.getByText("Sygnaly do decyzji").first().waitFor();
  await settlePage(page);
}

async function openNavigationTab(page: Page, name: string) {
  await page.getByRole("navigation", { name: "Widoki RepoRadar" }).getByRole("button", { name }).click();
  assertLocalPageUrl(page);
}

async function settlePage(page: Page) {
  await page.waitForLoadState("networkidle");
  await waitForLazyPanelsToSettle(page);
  await page.waitForTimeout(250);
  assertLocalPageUrl(page);
}

async function waitForAnyText(page: Page, texts: string[]) {
  await page.waitForFunction(
    (expectedTexts) => expectedTexts.some((text) => document.body?.innerText.includes(text)),
    texts
  );
}

async function waitForLazyPanelsToSettle(page: Page) {
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'));

  if (await page.getByRole("button", { name: "Ponow pobieranie" }).count()) {
    throw new Error("Portfolio screenshot workflow stopped on a lazy panel error state.");
  }
}

async function installLocalhostOnlyNetwork(page: Page) {
  await page.route("**/*", async (route) => {
    if (isAllowedPortfolioCaptureUrl(route.request().url())) {
      await route.continue();
      return;
    }

    await route.abort("blockedbyclient");
  });
}

function assertLocalPageUrl(page: Page) {
  if (!isLocalPortfolioPageUrl(page.url())) {
    throw new Error(`Portfolio screenshot navigation left localhost: ${page.url()}`);
  }
}

async function ensurePortfolioScreenshotOutputDirectory(outputDir: string) {
  const testResultsDir = path.resolve(process.cwd(), "test-results");
  const projectRoot = await fs.realpath(process.cwd());

  if (!isPortfolioScreenshotOutputDirectoryAllowed(outputDir)) {
    throw new Error("Portfolio screenshot output directory must stay under ignored test-results/.");
  }

  await fs.mkdir(testResultsDir, { recursive: true });
  const realTestResultsDir = await fs.realpath(testResultsDir);

  if (!isSamePath(realTestResultsDir, path.join(projectRoot, "test-results"))) {
    throw new Error("Portfolio screenshot test-results directory must resolve inside the project workspace.");
  }

  const resolvedOutputDir = path.resolve(outputDir);
  const relativeOutput = path.relative(testResultsDir, resolvedOutputDir);
  const segments = relativeOutput ? relativeOutput.split(path.sep).filter(Boolean) : [];
  let currentDir = testResultsDir;

  for (const segment of segments) {
    currentDir = path.join(currentDir, segment);

    try {
      await fs.lstat(currentDir);
    } catch (error) {
      if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") {
        throw error;
      }

      await fs.mkdir(currentDir);
    }

    const realCurrentDir = await fs.realpath(currentDir);
    if (!isPathInsideDirectory(realCurrentDir, realTestResultsDir)) {
      throw new Error("Portfolio screenshot output directory must resolve inside ignored test-results/.");
    }
  }

  const realOutputDir = await fs.realpath(outputDir);
  if (!isPathInsideDirectory(realOutputDir, realTestResultsDir)) {
    throw new Error("Portfolio screenshot output directory must resolve inside ignored test-results/.");
  }
}

async function writeVerifiedScreenshot(filePath: string, screenshot: Buffer, outputDir: string) {
  const realOutputDir = await fs.realpath(outputDir);
  const fileParent = path.dirname(path.resolve(filePath));
  const realFileParent = await fs.realpath(fileParent);

  if (!isSamePath(realFileParent, realOutputDir)) {
    throw new Error("Portfolio screenshot file must resolve inside the verified screenshot output directory.");
  }

  await assertReplaceableScreenshotTarget(filePath);

  const tempPath = path.join(realOutputDir, `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`);
  await fs.writeFile(tempPath, screenshot, { flag: "wx" });

  try {
    const tempStats = await fs.lstat(tempPath);
    if (tempStats.isSymbolicLink() || !tempStats.isFile() || tempStats.nlink !== 1) {
      throw new Error("Temporary screenshot file is not a single-link regular file.");
    }

    await removeExistingScreenshotTarget(filePath);
    await fs.rename(tempPath, filePath);
  } catch (error) {
    await fs.rm(tempPath, { force: true });
    throw error;
  }
}

async function assertReplaceableScreenshotTarget(filePath: string) {
  const stats = await lstatIfExists(filePath);
  if (!stats) {
    return;
  }

  if (stats.isSymbolicLink() || !stats.isFile() || stats.nlink !== 1) {
    throw new Error("Refusing to overwrite a screenshot target that is not a single-link regular file.");
  }
}

async function removeExistingScreenshotTarget(filePath: string) {
  const stats = await lstatIfExists(filePath);
  if (!stats) {
    return;
  }

  if (stats.isSymbolicLink() || !stats.isFile() || stats.nlink !== 1) {
    throw new Error("Refusing to replace a screenshot target that is not a single-link regular file.");
  }

  await fs.unlink(filePath);
}

async function lstatIfExists(filePath: string) {
  try {
    return await fs.lstat(filePath);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

function isSamePath(firstPath: string, secondPath: string) {
  const normalizedFirst = path.normalize(firstPath);
  const normalizedSecond = path.normalize(secondPath);

  return process.platform === "win32" ? normalizedFirst.toLowerCase() === normalizedSecond.toLowerCase() : normalizedFirst === normalizedSecond;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
