import { test, expect } from "@playwright/test";

test.describe("Studio Smoke", () => {
  test("generates image via local API and imports to poster", async ({ page }) => {
    await page.goto("/studio?test=1");
    const heading = page.getByRole("heading", { name: "AI Asset Generator" });
    await expect(heading).toBeVisible({ timeout: 20000 });

    const promptBox = page.locator('textarea[placeholder="Describe the image you want to generate..."]');
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
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          url:
            "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAAQABADASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAwT/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwD3gAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAB//Z",
        }),
      });
    });
    await page.route("**/api/post", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      });
    });

    const generateBtn = page.getByRole("button", { name: /Generate Asset/i });
    await generateBtn.click();

    const generatedImg = page.locator('img[alt=""]');
    await expect(generatedImg).toBeVisible({ timeout: 30000 });

    const importBtn = page.getByRole("button", { name: "Import" });
    await expect(importBtn).toBeEnabled({ timeout: 30000 });
    await importBtn.click();

    const postBox = page.getByPlaceholder("What's on your mind? #Web3");
    await expect(postBox).toHaveValue(/\(Attached: Generated Image\): (http|data:image)/, { timeout: 30000 });
  });
});
