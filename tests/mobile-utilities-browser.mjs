// Manual browser regression against a local/staging app. No test users are created.
// E2E_BASE_URL=http://127.0.0.1:3025 E2E_STORAGE_STATE=/private/staging-state.json
import {chromium,webkit} from 'playwright';
import assert from 'node:assert/strict';
const base=process.env.E2E_BASE_URL, storageState=process.env.E2E_STORAGE_STATE;
if(!base||!storageState)throw Error('Set E2E_BASE_URL and E2E_STORAGE_STATE to an existing staging session.');
for(const [name,engine] of [['Chrome',chromium],['WebKit',webkit]]) {
 const browser=await engine.launch(name==='Chrome'?{channel:'chrome',headless:true}:{headless:true});
 try {
  const context=await browser.newContext({storageState,viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  await page.goto(new URL('/mobile/about',base).href);
  const profile=page.locator('.mobile-app-toolbar button[aria-haspopup="menu"]');
  const bell=page.locator('[data-notification-trigger]');
  const menu=page.locator('.mobile-app-toolbar [role="menu"]');
  const notification=page.getByRole('dialog');
  for(const delay of [500,90]) {
   await profile.click();await page.waitForTimeout(delay);await bell.click();
   if(delay===500)assert.equal(await menu.count(),1,'old profile remains mounted through collapse');
   await page.waitForTimeout(950);
   assert.equal(await menu.count(),0);assert.equal(await bell.getAttribute('aria-expanded'),'true');
   await profile.click();assert.equal(await notification.count(),1,'old notification remains mounted through collapse');
   await page.waitForTimeout(950);
   assert.equal(await profile.getAttribute('aria-expanded'),'true');assert.equal(await bell.getAttribute('aria-expanded'),'false');
   await page.keyboard.press('Escape');await page.waitForTimeout(500);assert.equal(await menu.count(),0);
  }
  await profile.click();await page.waitForTimeout(500);await bell.click();await page.keyboard.press('Escape');await page.waitForTimeout(950);
  assert.equal(await menu.count(),0);assert.equal(await bell.getAttribute('aria-expanded'),'false','Escape cancels a queued switch');
  await context.setOffline(true); // switching must not depend on notification fetch completing
  await page.emulateMedia({reducedMotion:'reduce'});
  await profile.click();await bell.click();await page.waitForTimeout(50);
  assert.equal(await menu.count(),0);assert.equal(await bell.getAttribute('aria-expanded'),'true');
  await profile.click();await page.waitForTimeout(50);assert.equal(await profile.getAttribute('aria-expanded'),'true');
  await page.keyboard.press('Escape');
  console.log(name+': both directions, rapid switch, Escape and reduced motion PASS');
 } finally {await browser.close();}
}
