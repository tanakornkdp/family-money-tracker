import assert from "node:assert/strict";
import { chromium, webkit } from "@playwright/test";
const origin = "http://localhost:3000";
const fixture = "http://localhost:3211/rest/v1/";
const userId = "10000000-0000-4000-8000-000000000001";
const group = "10000000-0000-4000-8000-000000000003";
const seed = async (title, type, amount, household_id = null) => {
  const result = await fetch(fixture + "transactions", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/vnd.pgrst.object+json" }, body: JSON.stringify({ title, type, amount, household_id, user_id: userId, category: "อื่น ๆ", date: "2026-12-25", payment_method: "cash" }) });
  assert(result.ok);
  return result.json();
};
const loginBrowser = await chromium.launch();
const lc = await loginBrowser.newContext(); const login = await lc.newPage();
await login.goto(origin + "/login"); await login.locator('input[type="email"]').fill("report@example.test"); await login.locator('input[type="password"]').fill("mock-password"); await login.locator('button[type="submit"]').click(); await login.waitForURL(url => !url.pathname.includes("login"));
const storageState = await lc.storageState(); await loginBrowser.close();
for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch(); const context = await browser.newContext({ storageState, viewport: { width: 390, height: 844 } }); const page = await context.newPage();
  const errors = []; page.on("pageerror", error => errors.push(error.message)); page.on("dialog", dialog => dialog.accept());
  const suffix = engineName + "-" + Date.now();
  const income = await seed("Bonus " + suffix, "income", 100000);
  const expense = await seed("Hotel " + suffix, "expense", 8000);
  await page.goto(origin + "/mobile/money-plans");
  await page.getByRole("button", { name: "สร้างแผน", exact: true }).click(); await page.waitForTimeout(520);
  const dialog = page.locator("dialog");
  await dialog.getByLabel("ชื่อแผน", { exact: true }).fill("โบนัส " + suffix);
  await dialog.getByLabel("คาดว่าจะได้รับ (บาท)", { exact: true }).fill("100000");
  await dialog.getByRole("button", { name: "วันที่คาดว่าจะได้รับ", exact: true }).click(); await page.waitForTimeout(520);
  await page.locator('[popover][role="dialog"] button[aria-pressed]').nth(24).click(); await page.waitForTimeout(520);
  await dialog.getByRole("button", { name: "เพิ่มส่วน", exact: true }).click();
  await dialog.getByLabel("ชื่อส่วนนี้", { exact: true }).fill("เที่ยวพักผ่อน"); await dialog.getByLabel("จำนวนเงิน (บาท)", { exact: true }).fill("20000");
  await dialog.getByRole("button", { name: "บันทึกแผน", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  const linkRecord = async (buttonName, title) => {
    await page.getByRole("button", { name: buttonName, exact: true }).click(); await page.waitForTimeout(520);
    await dialog.getByLabel("ค้นหารายการ / วันที่ / จำนวนเงิน").fill(title); await dialog.getByRole("radio").first().check(); await dialog.getByRole("button", { name: "ยืนยันการผูก", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  };
  await linkRecord("ผูกรายรับ", income.title); await linkRecord("ผูกรายการจริง", expense.title);
  await page.getByRole("button", { name: "แก้ไขแผน", exact: true }).click(); await page.waitForTimeout(520);
  await dialog.getByLabel("จำนวนเงิน (บาท)", { exact: true }).fill("5000"); await dialog.getByRole("button", { name: "บันทึกแผน", exact: true }).click(); await dialog.waitFor({ state: "detached" });
  assert(await page.getByText(/ใช้จริงเกินแผนใหม่/).isVisible());
  await page.reload(); await page.getByRole("button", { name: new RegExp("โบนัส " + suffix) }).click();
  assert(await page.getByText(/ใช้จริงเกินแผนใหม่/).isVisible());
  await page.getByRole("button", { name: "ยกเลิกการผูก " + expense.title, exact: true }).click(); await page.getByText(/ใช้จริงเกินแผนใหม่/).waitFor({ state: "detached" });
  const actuals = await (await fetch(fixture + "transactions")).json(); assert.equal(actuals.find(t => t.id === expense.id).amount, 8000);
  await page.getByRole("button", { name: "เก็บเข้าแฟ้ม", exact: true }).click(); await page.getByRole("button", { name: "นำกลับมาใช้งาน", exact: true }).waitFor();
  await page.getByRole("button", { name: "นำกลับมาใช้งาน", exact: true }).click(); await page.getByRole("button", { name: "เก็บเข้าแฟ้ม", exact: true }).waitFor();
  await page.getByRole("button", { name: "ประวัติการปรับแผน", exact: true }).click(); await page.waitForTimeout(650); assert(await page.getByText("ยกเลิกการผูกรายการ", { exact: true }).isVisible());
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  // A stale save must fail without overwriting the current revision.
  const plans = await (await fetch(fixture + "future_money_plans")).json(); const plan = plans.find(p => p.name === "โบนัส " + suffix);
  const stale = await page.request.post(origin + "/api/money-plans", { data: { action: "save", id: plan.id, revision: 1, plan } }); assert.equal(stale.status(), 409);
  // Shared plan filter and shared-only records.
  await page.getByRole("button", { name: "มุมมองแผน", exact: true }).click(); await page.waitForTimeout(300); await page.getByRole("option", { name: "ครอบครัวเดโม", exact: true }).click(); await page.waitForTimeout(220);
  const shared = await page.request.post(origin + "/api/money-plans", { data: { action: "save", plan: { name: "Shared " + suffix, expected_amount: 20000, expected_date: "2026-12-25", household_id: group, allocations: [], archived: false } } }); assert(shared.ok());
  await page.getByRole("button", { name: "โหลดใหม่", exact: true }).click(); await page.getByRole("button", { name: new RegExp("Shared " + suffix) }).waitFor();
  assert.deepEqual(errors, []);
  console.log(engineName, "create, actual links, revise, reload, unlink, archive/restore, history, conflict and group scope passed");
  await browser.close();
}
