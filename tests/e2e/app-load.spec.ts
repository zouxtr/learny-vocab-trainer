import { test, expect } from "@playwright/test";

test("app loads without js errors and database initializes", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  // Database health and cloud sync live on the Settings page.
  await page.getByRole("link", { name: "Settings" }).first().click();
  await page.waitForSelector("text=SQLite ready", { timeout: 15000 });

  const detail = await page.locator("text=tables").textContent();
  expect(detail).toContain("tables");

  // The wasm compile failure used to throw here; assert it's gone.
  const fatalErrors = errors.filter(
    (e) =>
      e.includes("wasm") ||
      e.includes("magic number") ||
      e.includes("unsupported MIME") ||
      e.includes("Maximum update depth"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);

  // Sync panel renders and shows offline state by default.
  await expect(page.locator("text=Offline — no cloud backup.")).toBeVisible();
});