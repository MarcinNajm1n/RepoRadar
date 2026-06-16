import { expect, test } from "@playwright/test";

test("shows the RepoRadar shell", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("RepoRadar").first()).toBeVisible();
  await expect(page.getByText("Radar dzisiaj").first()).toBeVisible();
  await expect(page.getByText("Biblioteka").first()).toBeVisible();
  await expect(page.getByText("Repo do sprawdzenia").first()).toBeVisible();
});
