import { test, expect } from "@playwright/test";

test.describe("Studio Smoke", () => {
  test("generates image via local API and imports to poster", async ({ page }) => {
    await page.goto("/studio?test=1");
    const heading = page.getByRole("heading", { name: "AI Asset Generator" });
    await expect(heading).toBeVisible({ timeout: 20000 });

    const promptBox = page.locator('textarea[placeholder="Describe the image and post content you want to generate..."]');
    await expect(promptBox).toBeVisible({ timeout: 20000 });
    await promptBox.fill("futuristic city skyline at dusk, neon lights, high detail");

    await page.route("**/api/generate/image", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          imageUrl:
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAAAAABx5D8UAAAAFElEQVR4nGP4z8DwnwEGwAEMCwAAGXgA4p9gB2QAAAAASUVORK5CYII=",
        }),
      });
    });
    await page.route("**/api/content-factory", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          items: [{ text_content: "E2E: Generated post copy." }],
        }),
      });
    });
    await page.route("**/api/gallery", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, item: { id: "e2e_gallery_1" } }),
      });
    });

    const generateBtn = page.getByRole("button", { name: "Generate Asset & Content" });
    await generateBtn.click();

    const generatedImg = page.locator('img[src^="data:image"]');
    await expect(generatedImg.first()).toBeVisible({ timeout: 30000 });

    const sendBtn = page.getByRole("button", { name: "Send to Multi-Channel Poster" });
    await expect(sendBtn).toBeEnabled({ timeout: 30000 });
    await sendBtn.click();

    const postBox = page.getByPlaceholder("What's on your mind? #Web3");
    await expect(postBox).toHaveValue(/E2E: Generated post copy\./, { timeout: 30000 });
    await expect(page.getByRole("img", { name: "Attached preview" })).toBeVisible({ timeout: 30000 });
  });
});
