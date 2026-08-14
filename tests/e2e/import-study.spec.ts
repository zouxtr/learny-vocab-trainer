import { test, expect } from "@playwright/test";

test("bulk import a CSV then run a study session", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await page.waitForSelector("text=SQLite ready", { timeout: 15000 });

  // Create a dictionary (onboarding is shown on first run).
  await page.locator("button", { hasText: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("Spanish for travel");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "Spanish for travel" })).toBeVisible({ timeout: 15000 });

  // Import a CSV with headers Word/Translation/Group.
  await page.getByRole("button", { name: "Import" }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "travel.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Word,Translation,Group\ncasa,house,Home\nperro,dog,Animals\n"),
  });
  await page.getByRole("button", { name: "Import words" }).click({ timeout: 15000 });

  await expect(page.locator("text=Imported 2")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();
  await expect(page.locator("td", { hasText: "casa" })).toBeVisible();
  await expect(page.locator("td", { hasText: "perro" })).toBeVisible();

  // Open a study session on the freshly imported dictionary.
  await page.getByRole("link", { name: "Study" }).click();
  await page.getByRole("button", { name: /Spanish for travel/ }).click();
  await expect(page.getByRole("spinbutton")).toHaveValue("2");
  // Disable shuffling so the flashcard order is deterministic (casa → perro).
  await page.getByText("Randomize card order").click();
  await page.getByRole("button", { name: "Start studying" }).click();

  // Flashcard 1.
  await page.locator('[role="button"]', { hasText: "casa" }).click();
  await page.getByRole("button", { name: "Correct" }).click();
  // Flashcard 2.
  await page.locator('[role="button"]', { hasText: "perro" }).click();
  await page.getByRole("button", { name: "Correct" }).click();

  await expect(page.getByText("Session complete")).toBeVisible();
  await expect(page.getByText("2 words reviewed this session.")).toBeVisible();

  const fatalErrors = errors.filter(
    (e) => e.includes("wasm") || e.includes("magic number") || e.includes("unsupported MIME"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);
});