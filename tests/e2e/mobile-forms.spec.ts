import { test, expect } from "@playwright/test";

const WIDTHS = [375, 390, 414];

for (const width of WIDTHS) {
  test(`mobile ${width}px: inputs stay ≥16px and dialogs fit the viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await page.waitForSelector("text=My dictionaries", { timeout: 15000 });

    // Form fields must be at least 16px so iOS Safari doesn't zoom on focus.
    await page.getByRole("button", { name: "Create your first dictionary" }).first().click();
    const nameInput = page.getByLabel("Name");
    await expect(nameInput).toBeVisible();
    const fontSize = await nameInput.evaluate((el) => getComputedStyle(el).fontSize);
    expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(16);

    // The dialog must fit inside the viewport with breathing room, not overflow.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width - 8);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y + box!.height).toBeLessThanOrEqual(844);

    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });
}