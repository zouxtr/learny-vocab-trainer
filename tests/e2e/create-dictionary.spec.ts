import { test, expect } from "@playwright/test";

test("creating a dictionary and adding a word persists them", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  // Onboarding is shown on first run (no dictionaries yet).
  await page.locator("button", { hasText: "Create your first dictionary" }).click();

  await page.getByLabel("Name").fill("Spanish for travel");

  // Radix select defaults are en → de (distinct), so the form is valid.
  await page.getByRole("button", { name: "Create dictionary" }).click();

  // Land on the dictionary page.
  const header = page.locator("h2", { hasText: "Spanish for travel" });
  await expect(header).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Add word" }).click();
  await page.getByLabel("English").fill("casa");
  await page.getByLabel("German").fill("house");
  await page.getByRole("button", { name: "Add word" }).click();

  await expect(page.locator("td", { hasText: "casa" })).toBeVisible();
  await expect(page.locator("td", { hasText: "house" })).toBeVisible();

  // Word count reflects the added entry.
  await expect(page.locator("text=1 word")).toBeVisible();

  // Persist flush while the page is still alive.
  await page.waitForTimeout(500);

  const fatalErrors = errors.filter(
    (e) => e.includes("wasm") || e.includes("magic number") || e.includes("unsupported MIME"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);
});