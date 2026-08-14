import { test, expect } from "@playwright/test";

test("import from a generic TSV link, refresh it, and export as CSV", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  // Create a dictionary (onboarding is shown on first run).
  await page.locator("button", { hasText: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("TSV source");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "TSV source" })).toBeVisible({ timeout: 15000 });

  // Import via the TSV link tab.
  await page.getByRole("button", { name: "Import" }).click();
  await page.getByRole("button", { name: "TSV link" }).click();
  await page.getByLabel("Public TSV file link").fill("http://localhost:1420/fixtures/words.tsv");
  await page.getByRole("button", { name: "Fetch" }).click();
  await expect(page.getByText("2 data rows fetched.")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "Import words" }).click({ timeout: 15000 });
  await expect(page.locator("text=Imported 2")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("cell", { name: "casa", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "perro", exact: true })).toBeVisible();

  // The stored TSV source makes a Refresh button appear; re-fetching is a no-op content-wise.
  await page.getByRole("button", { name: "Refresh" }).click();
  await expect(page.locator("text=Sheet synced:")).toBeVisible({ timeout: 15000 });

  // Export as CSV triggers a download.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByRole("button", { name: "CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("tsv-source-words.csv");

  const fatalErrors = errors.filter(
    (e) => e.includes("wasm") || e.includes("magic number") || e.includes("unsupported MIME"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);
});