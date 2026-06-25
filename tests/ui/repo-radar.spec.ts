import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Sygnaly do decyzji").first()).toBeVisible();
});

test("shows the redesigned desktop shell", async ({ page }) => {
  await expect(page.getByText("RepoRadar").first()).toBeVisible();
  await expect(page.getByText("Radar dzisiaj").first()).toBeVisible();
  await expect(page.getByText("Biblioteka").first()).toBeVisible();
  await expect(page.getByText("Repo do sprawdzenia").first()).toBeVisible();
  await expect(page.getByText("Sygnaly do decyzji").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("keeps repository filters usable", async ({ page }) => {
  await page.getByRole("navigation").getByRole("button", { name: "Biblioteka" }).click();

  await expect(page.getByPlaceholder("Szukaj nazwy, ownera, topics...")).toBeVisible();
  await expect(page.getByText(/wynik/).first()).toBeVisible();

  await page.getByPlaceholder("Szukaj nazwy, ownera, topics...").fill("__brak_takiego_repo__");
  await expect(page.getByText("Szukaj: __brak_takiego_repo__")).toBeVisible();
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.getByText(/Brak aktywnych/).first()).toBeVisible();
  await expect(page.getByText("Pokazano 100 z")).toBeVisible();
  await page.getByRole("button", { name: /Pokaz kolejne/ }).click();
  await expect(page.getByText("Pokazano 200 z")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("supports sidebar keyboard activation and aria-current state", async ({ page }) => {
  const navigation = page.getByRole("navigation", { name: "Widoki RepoRadar" });
  const radarButton = navigation.getByRole("button", { name: "Radar dzisiaj" });
  const libraryButton = page.getByRole("navigation").getByRole("button", { name: "Biblioteka" });

  await expect(radarButton).toHaveAttribute("aria-current", "page");
  await expect(libraryButton).not.toHaveAttribute("aria-current", "page");

  await libraryButton.focus();
  await expect(libraryButton).toBeFocused();
  await page.keyboard.press("Enter");
  const searchInput = page.getByPlaceholder("Szukaj nazwy, ownera, topics...");
  await expect(searchInput).toBeVisible();
  await expect(libraryButton).toHaveAttribute("aria-current", "page");
  await expect(radarButton).not.toHaveAttribute("aria-current", "page");

  await page.keyboard.press("/");
  await expect(searchInput).toBeFocused();
  await expectNoHorizontalOverflow(page);
});

test("opens the command palette with Ctrl+K, traps focus, and restores focus on Escape", async ({ page }) => {
  const libraryButton = page.getByRole("navigation").getByRole("button", { name: "Biblioteka" });
  await libraryButton.focus();
  await expect(libraryButton).toBeFocused();

  await page.keyboard.press("Control+K");
  const dialog = page.getByRole("dialog", { name: "Paleta komend" });
  const commandInput = page.getByRole("combobox", { name: "Szukaj komend albo repozytoriow" });
  const scanCommand = page.getByRole("option", { name: /Uruchom scan/ });

  await expect(dialog).toBeVisible();
  await expect(commandInput).toBeFocused();
  await expect(commandInput).toHaveAttribute("aria-activedescendant", "command-scan");
  await expect(scanCommand).toHaveAttribute("id", "command-scan");
  await expect(scanCommand).toHaveAttribute("data-active", "true");

  await page.keyboard.press("Tab");
  await expect(commandInput).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(commandInput).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(libraryButton).toBeFocused();

  await expectNoHorizontalOverflow(page);
});

test("supports keyboard navigation shortcuts", async ({ page }) => {
  const settingsButton = page.getByRole("navigation").getByRole("button", { name: "Ustawienia" });
  await settingsButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ustawienia MVP")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("expands and collapses repository details by keyboard", async ({ page }) => {
  await page.getByRole("navigation").getByRole("button", { name: "Biblioteka" }).click();

  const initialToggle = page.getByRole("button", { name: "Rozwin szczegoly" }).first();
  await expect(initialToggle).toBeVisible();
  await expect(initialToggle).toHaveAttribute("aria-expanded", "false");
  const detailsId = await initialToggle.getAttribute("aria-controls");
  expect(detailsId).toBeTruthy();
  const repoToggle = page.locator(`button[aria-controls="${detailsId}"]`).last();
  const detailsPanel = page.locator(`[id="${detailsId}"]`);

  await repoToggle.focus();
  await expect(repoToggle).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(repoToggle).toHaveAttribute("aria-expanded", "true");
  await expect(detailsPanel).toBeVisible();

  await page.keyboard.press("Space");
  await expect(repoToggle).toHaveAttribute("aria-expanded", "false");
  await expect(detailsPanel).toBeHidden();

  await expectNoHorizontalOverflow(page);
});

test("runs derived navigation commands from the command palette keyboard selection", async ({ page }) => {
  await page.getByRole("button", { name: "Komendy" }).click();
  const commandInput = page.getByRole("combobox", { name: "Szukaj komend albo repozytoriow" });
  await expect(commandInput).toBeFocused();

  await commandInput.fill("zadania");
  const tasksCommand = page.getByRole("option", { name: /Otworz Zadania/ });
  const librarySearchCommand = page.getByRole("option", { name: "Szukaj w Bibliotece" });
  await expect(tasksCommand).toBeVisible();
  await expect(tasksCommand).toHaveAttribute("data-active", "true");
  await expect(commandInput).toHaveAttribute("aria-activedescendant", "command-tab-tasks");

  await page.keyboard.press("ArrowDown");
  await expect(librarySearchCommand).toHaveAttribute("data-active", "true");
  await expect(commandInput).toHaveAttribute("aria-activedescendant", "repo-search");
  await page.keyboard.press("ArrowUp");
  await expect(tasksCommand).toHaveAttribute("data-active", "true");
  await page.keyboard.press("End");
  await expect(librarySearchCommand).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Home");
  await expect(tasksCommand).toHaveAttribute("data-active", "true");
  await page.keyboard.press("Enter");

  await expect(page.getByText("Kolejka akcji")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Paleta komend" })).toBeHidden();
  await expectNoHorizontalOverflow(page);
});

test("runs repository results from the command palette keyboard selection", async ({ page }) => {
  await page.getByRole("button", { name: "Komendy" }).click();
  const commandInput = page.getByRole("combobox", { name: "Szukaj komend albo repozytoriow" });
  await commandInput.fill("affaan-m/ECC");

  await expect(page.getByRole("option", { name: /affaan-m\/ECC/ })).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("option", { name: "Szukaj w Bibliotece" })).toHaveAttribute("data-active", "true");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Enter");

  const librarySearch = page.getByPlaceholder("Szukaj nazwy, ownera, topics...");
  await expect(librarySearch).toBeVisible();
  await expect(librarySearch).toHaveValue("affaan-m/ECC");
  await expectNoHorizontalOverflow(page);
});

test("keeps secondary global actions in the command palette", async ({ page }) => {
  const topBar = page.locator("header").first();

  await expect(topBar.getByRole("button", { name: "Komendy" })).toBeVisible();
  await expect(topBar.getByRole("button", { name: "Uruchom scan" })).toBeVisible();
  await expect(topBar.getByRole("button", { name: "Briefing dzienny" })).toHaveCount(0);
  await expect(topBar.getByRole("button", { name: "Raport tygodniowy" })).toHaveCount(0);
  await expect(topBar.getByRole("button", { name: "Eksport CSV" })).toHaveCount(0);
  await expect(topBar.getByRole("button", { name: "RepoRadar Brief" })).toHaveCount(0);

  await topBar.getByRole("button", { name: "Komendy" }).click();
  await expect(page.getByRole("heading", { name: "Paleta komend" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Skan i raporty" })).toBeVisible();
  await expect(page.getByRole("option", { name: /Utworz briefing dzienny/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Utworz raport tygodniowy/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Eksportuj CSV pomyslow/ })).toBeVisible();
  await expect(page.getByRole("option", { name: /Utworz RepoRadar Brief/ })).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("keeps the library view within a 1280px desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("navigation").getByRole("button", { name: "Biblioteka" }).click();
  await expect(page.getByPlaceholder("Szukaj nazwy, ownera, topics...")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("keeps idea and settings navigation reachable", async ({ page }) => {
  await page.getByRole("complementary").getByRole("button", { name: /Pomys/ }).click();
  await expect(page.getByText("Kandydaci").first()).toBeVisible();
  await expect(page.getByText("Szybka ocena okazji przed pelnym pomyslem.")).toBeVisible();

  await page.getByRole("complementary").getByRole("button", { name: "Repo" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Ustawienia" }).click();
  await expect(page.getByText("Ustawienia MVP")).toBeVisible();
  await expect(page.getByText("Status konfiguracji")).toBeVisible();
  await expect(page.getByRole("switch").first()).toBeVisible();
  await page.getByRole("button", { name: "AI i koszty" }).click();
  await expect(page.getByText("Business Research")).toBeVisible();
  await page.getByRole("button", { name: "Integracje" }).click();
  await expect(page.getByText("Źródła zewnętrzne")).toBeVisible();
  await page.getByRole("button", { name: "Observability" }).click();
  await expect(page.getByText("Sredni czas skanu")).toBeVisible();
  await page.getByRole("button", { name: "Maintenance" }).click();
  await expect(page.getByText("Graphify maintenance")).toBeVisible();
  await expect(page.getByText("Dane i maintenance")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
}
