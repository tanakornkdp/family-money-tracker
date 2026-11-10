import { expect, test } from "@playwright/test";

test.describe("PWA public shell", () => {
  test("renders the Thai mobile-first landing page without horizontal overflow", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Family Money Tracker/i);
    await expect(page.getByRole("heading", { name: /จัดการเงินครอบครัว/ })).toBeVisible();
    await expect(page.getByRole("link", { name: "เริ่มใช้งาน" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("exposes an installable manifest and service worker", async ({ page, request }) => {
    await page.goto("/");

    const manifest = await request.get("/manifest.webmanifest");
    expect(manifest.ok()).toBe(true);
    const manifestJson = await manifest.json();
    expect(manifestJson.display).toBe("standalone");
    expect(manifestJson.icons.length).toBeGreaterThanOrEqual(2);

    const serviceWorker = await request.get("/sw.js");
    expect(serviceWorker.ok()).toBe(true);
    expect(await serviceWorker.text()).toContain("family-money-shell-v1");
  });
});
