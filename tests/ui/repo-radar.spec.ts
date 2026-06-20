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
  await expect(page.getByText("wyników w tym widoku")).toBeVisible();

  await page.getByPlaceholder("Szukaj nazwy, ownera, topics...").fill("__brak_takiego_repo__");
  await expect(page.getByText("Szukaj: __brak_takiego_repo__")).toBeVisible();
  await page.getByRole("button", { name: /Reset/ }).click();
  await expect(page.getByText("Brak aktywnych filtrów")).toBeVisible();
  await expect(page.getByText("Pokazano 100 z")).toBeVisible();
  await page.getByRole("button", { name: /Pokaż kolejne/ }).click();
  await expect(page.getByText("Pokazano 200 z")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("keeps the library view within a 1280px desktop viewport", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole("navigation").getByRole("button", { name: "Biblioteka" }).click();
  await expect(page.getByPlaceholder("Szukaj nazwy, ownera, topics...")).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

test("keeps idea and settings navigation reachable", async ({ page }) => {
  await page.getByRole("complementary").getByRole("button", { name: "Pomysły" }).click();
  await expect(page.getByText("Kandydaci").first()).toBeVisible();
  await expect(page.getByText("Szybka ocena okazji przed pelnym pomyslem.")).toBeVisible();

  await page.getByRole("complementary").getByRole("button", { name: "Repo" }).click();
  await page.getByRole("navigation").getByRole("button", { name: "Ustawienia" }).click();
  await expect(page.getByText("Ustawienia MVP")).toBeVisible();
  await expect(page.getByText("Status konfiguracji")).toBeVisible();
  await expect(page.getByRole("switch").first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
});

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
}
