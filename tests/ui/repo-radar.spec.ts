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

test("supports keyboard navigation shortcuts", async ({ page }) => {
  const libraryButton = page.getByRole("navigation").getByRole("button", { name: "Biblioteka" });
  await libraryButton.focus();
  await expect(libraryButton).toBeFocused();
  await page.keyboard.press("Enter");
  const searchInput = page.getByPlaceholder("Szukaj nazwy, ownera, topics...");
  await expect(searchInput).toBeVisible();

  await page.keyboard.press("/");
  await expect(searchInput).toBeFocused();

  await page.keyboard.press("Control+K");
  await expect(page.getByRole("heading", { name: "Paleta komend" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Paleta komend" })).toBeHidden();

  const settingsButton = page.getByRole("navigation").getByRole("button", { name: "Ustawienia" });
  await settingsButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText("Ustawienia MVP")).toBeVisible();

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
  await expect(page.getByRole("button", { name: /Utworz briefing dzienny/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Utworz raport tygodniowy/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Eksportuj CSV pomyslow/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Utworz RepoRadar Brief/ })).toBeVisible();

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
