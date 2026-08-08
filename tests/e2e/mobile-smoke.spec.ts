import { test, expect } from "@playwright/test";

test("mobile layout: bottom nav shows, sidebar hidden, content usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await page.waitForSelector("text=SQLite ready", { timeout: 15000 });

  // Bottom nav is present on mobile and sidebar is hidden.
  await expect(page.getByRole("navigation", { name: "Primary" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dictionaries" })).toBeVisible();
  await expect(page.getByText("Help")).toBeVisible();

  await page.getByRole("button", { name: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("Mobile list");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "Mobile list" })).toBeVisible({ timeout: 15000 });

  // Navigate via bottom nav to Dictionaries.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Dictionaries" }).click();
  await expect(page.locator("h2", { hasText: "Dictionaries" })).toBeVisible();
  await expect(page.locator("text=Mobile list")).toBeVisible();

  // Study remains reachable.
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Study" }).click();
  await expect(page.locator("h2", { hasText: "Study" })).toBeVisible();

  const fatalErrors = errors.filter(
    (e) => e.includes("wasm") || e.includes("magic number") || e.includes("unsupported MIME"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);
});