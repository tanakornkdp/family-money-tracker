// Manual browser regression against an isolated local/staging session.
// E2E_BASE_URL=http://127.0.0.1:3000 E2E_EMAIL=... E2E_PASSWORD=... node tests/avatar-crop-browser.mjs
import assert from "node:assert/strict";
import { chromium, webkit } from "playwright";
import { readFile } from "node:fs/promises";

const base = process.env.E2E_BASE_URL;
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;
const storageState = process.env.E2E_STORAGE_STATE;
if (!base || ((!email || !password) && !storageState)) throw new Error("Set E2E_BASE_URL plus either E2E_STORAGE_STATE or isolated E2E_EMAIL/E2E_PASSWORD credentials.");

for (const [name, engine] of [["Chrome", chromium], ["WebKit", webkit]]) {
  const browser = await engine.launch({ headless: true });
  try {
    const stored = storageState ? JSON.parse(await readFile(storageState, "utf8")) : null;
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, deviceScaleFactor: 2,
      storageState: stored && !Array.isArray(stored) ? stored : undefined,
    });
    if (Array.isArray(stored)) await context.addCookies(stored.map(cookie => ({ name: cookie.name, value: cookie.value, url: base, httpOnly: cookie.httpOnly, secure: false, sameSite: cookie.sameSite })));
    const page = await context.newPage();
    if (!storageState) {
      await page.goto(new URL("/login", base).href);
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(url => !url.pathname.includes("login"));
    }
    await page.goto(new URL("/mobile/settings?section=profile", base).href);
    const input = page.locator('input[type="file"][accept="image/*"]');
    await input.setInputFiles("public/icon-512.png");
    const dialog = page.getByRole("dialog", { name: /จัดตำแหน่งรูปโปรไฟล์|Adjust profile photo/ });
    await assert.doesNotReject(() => dialog.waitFor({ state: "visible" }));
    const crop = dialog.getByRole("application");
    const box = await crop.boundingBox();
    assert(box && box.width <= 280 && box.width === box.height, `${name}: crop is responsive and square`);
    const zoom = dialog.locator('input[type="range"]');
    await zoom.fill("1.8");
    assert.equal(await zoom.inputValue(), "1.8");
    await page.mouse.move(box.x + 140, box.y + 140);
    await page.mouse.down();
    await page.mouse.move(box.x + 175, box.y + 115, { steps: 4 });
    await page.mouse.up();
    await dialog.getByRole("button", { name: /ยกเลิก|Cancel/ }).click();
    await assert.doesNotReject(() => dialog.waitFor({ state: "hidden" }));

    await input.setInputFiles("public/icon-512.png");
    await dialog.waitFor({ state: "visible" });
    await dialog.locator('input[type="range"]').fill("1.35");
    await dialog.getByRole("button", { name: /ใช้รูปนี้|Use photo/ }).click();
    await dialog.waitFor({ state: "hidden", timeout: 15_000 });
    const avatar = page.locator('img[alt="Avatar"]');
    assert.match(await avatar.getAttribute("src"), /\/storage\/v1\/object\/public\/avatars\//);
    assert.equal((await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), true, `${name}: no horizontal overflow`);
    console.log(`${name}: crop, zoom, drag, cancel, upload, and 390px layout PASS`);
  } finally {
    await browser.close();
  }
}
