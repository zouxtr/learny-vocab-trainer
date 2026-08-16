import { test, expect } from "@playwright/test";

const WORDS = [
  { source: "casa", target: "house", grammar: "noun", example: "La casa es grande." },
  { source: "perro", target: "dog", grammar: "noun", example: "El perro corre." },
  { source: "gato", target: "cat", grammar: "noun", example: "El gato duerme." },
  { source: "pajaro", target: "bird", grammar: "noun", example: "El pajaro vuela." },
  { source: "pez", target: "fish", grammar: "noun", example: "El pez nada." },
];

test("generate words with AI, deselect one and import the rest", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  // Deterministic response instead of hitting the real serverless function.
  await page.route("**/api/generate-words", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ words: WORDS, remaining: 2, limit: 3 }),
    });
  });

  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  await page.locator("button", { hasText: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("AI list");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "AI list" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Import" }).click();
  await page.getByRole("button", { name: "Generate with AI" }).click();
  await page.getByLabel("What should the words be about?").fill("kitchen items");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(page.getByText("Review them below before importing.")).toBeVisible({ timeout: 15000 });

  // Deselect the first generated row, then import the remaining four.
  await page.getByRole("checkbox", { name: "Include row 1" }).uncheck();
  await page.getByRole("button", { name: /Import words \(4\)/ }).click();
  await expect(page.locator("text=Imported 4")).toBeVisible();

  await page.getByRole("button", { name: "Close" }).click();

  await expect(page.getByRole("cell", { name: "perro", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "pez", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "casa", exact: true })).toHaveCount(0);

  const fatalErrors = errors.filter(
    (e) => e.includes("wasm") || e.includes("magic number") || e.includes("unsupported MIME"),
  );
  expect(fatalErrors, `fatal errors: ${errors.join("; ")}`).toHaveLength(0);
});

test("shows a clear error when the daily usage cap is reached", async ({ page }) => {
  await page.route("**/api/generate-words", async (route) => {
    await route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({ error: "limit", message: "limit", remaining: 0, limit: 3 }),
    });
  });

  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  await page.locator("button", { hasText: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("AI cap");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "AI cap" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Import" }).click();
  await page.getByRole("button", { name: "Generate with AI" }).click();
  await page.getByLabel("What should the words be about?").fill("verbs");
  await page.getByRole("button", { name: "Generate", exact: true }).click();

  await expect(
    page.getByText("You've reached today's free generation limit. Try again tomorrow."),
  ).toBeVisible({ timeout: 15000 });
});