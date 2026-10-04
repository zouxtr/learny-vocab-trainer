import { test, expect } from "@playwright/test";

const CSV = "Word,Translation,Grammar\nHaus,house,neuter / plural\nBaum,tree,masculine / plural\nKatze,cat,feminine\n";

async function createDictionaryWithGrammar(page: import("@playwright/test").Page) {
  await page.goto("/");
  await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

  await page.locator("button", { hasText: "Create your first dictionary" }).first().click();
  await page.getByLabel("Name").fill("German nouns");
  await page.getByRole("button", { name: "Create dictionary" }).click();
  await expect(page.locator("h2", { hasText: "German nouns" })).toBeVisible({ timeout: 15000 });

  await page.getByRole("button", { name: "Import" }).click();
  await page.setInputFiles('input[type="file"]', {
    name: "nouns.csv",
    mimeType: "text/csv",
    buffer: Buffer.from(CSV),
  });
  await page.getByRole("button", { name: "Import words" }).click({ timeout: 15000 });
  await expect(page.locator("text=Imported 3")).toBeVisible();
  await page.getByRole("button", { name: "Close" }).click();

  await page.getByRole("link", { name: "Study" }).click();
  await page.getByRole("button", { name: /German nouns/ }).click();
  await expect(page.getByRole("spinbutton")).toHaveValue("3");
}

async function chooseOption(page: import("@playwright/test").Page, currentLabel: string, optionLabel: string) {
  await page.getByRole("button", { name: new RegExp(currentLabel) }).first().click();
  await page.getByRole("option", { name: optionLabel }).click();
}

test("multiple choice can drill grammar options split on /", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await createDictionaryWithGrammar(page);

  // The direction selector names the languages instead of source/target.
  await expect(page.getByRole("button", { name: "English → German" })).toBeVisible();
  await chooseOption(page, "English → German", "German → English");
  await expect(page.getByRole("button", { name: "German → English" })).toBeVisible();
  await chooseOption(page, "German → English", "English → German");

  // Switch to multiple choice, then focus grammar instead of translations.
  await chooseOption(page, "^Flashcards$", "Multiple choice");
  await chooseOption(page, "^Translation$", "Grammar");
  await expect(page.getByText("Only 3 of 3 words have grammar")).toBeVisible();

  // Deterministic order: Haus → Baum → Katze.
  await page.getByText("Randomize card order").click();
  await page.getByRole("button", { name: "Start session" }).click();

  // The front shows the bare word (grammar is the answer, not a hint).
  await expect(page.locator("p", { hasText: /^Haus$/ })).toBeVisible();
  // Each "/" option is its own button; other words' options are distractors.
  await expect(page.getByRole("button", { name: "neuter" })).toBeVisible();
  await expect(page.getByRole("button", { name: "plural", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "neuter" }).click();
  await expect(page.getByText("Correct")).toBeVisible();

  expect(errors, `page errors: ${errors.join("; ")}`).toHaveLength(0);
});

test("grammar typing mode accepts any single / option", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(String(err)));

  await createDictionaryWithGrammar(page);

  await chooseOption(page, "^Flashcards$", "Grammar");
  await page.getByText("Randomize card order").click();
  await page.getByRole("button", { name: "Start session" }).click();

  // Typing one of the options (not the whole "neuter / plural" cell) passes.
  await page.getByPlaceholder("Type the grammar notes…").fill("plural");
  await page.getByRole("button", { name: "Check answer" }).click();
  await expect(page.getByText("Correct")).toBeVisible();

  expect(errors, `page errors: ${errors.join("; ")}`).toHaveLength(0);
});
