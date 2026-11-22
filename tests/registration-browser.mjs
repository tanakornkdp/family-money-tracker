import { chromium, expect } from '@playwright/test';

// Explicitly intercepted Auth responses: no account, email, or real OTP is created.
const base = process.env.REGISTRATION_TEST_URL;
if (!base || !['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Set REGISTRATION_TEST_URL to an isolated localhost app using dummy Supabase settings.');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const user = { id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', aud:'authenticated', role:'authenticated', email:'otp-browser@example.invalid', email_confirmed_at:'2026-11-22T00:00:00Z', app_metadata:{provider:'email'}, user_metadata:{}, identities:[], created_at:'2026-11-22T00:00:00Z' };
const session = { access_token: ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify({sub:user.id,exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'), 'test-signature'].join('.'), refresh_token:'local-intercepted-test-only', token_type:'bearer', expires_in:3600, user };
try {
  for (const engine of ['webkit', 'chromium']) {
    // WebKit uses the installed Playwright runtime; Chromium uses Chrome above.
    let engineBrowser = browser;
    if (engine === 'webkit') {
      const { webkit } = await import('@playwright/test');
      engineBrowser = await webkit.launch({headless:true});
    }
    try {
      for (const locale of ['th','en']) {
        const context = await engineBrowser.newContext({ viewport:{width:390,height:844}, colorScheme:'light', serviceWorkers:'block' });
        await context.addCookies([{name:'app_locale',value:locale,url:base}]);
        // Block the app service worker so Auth requests cannot bypass Playwright interception.
        const page = await context.newPage();
        const errors=[]; page.on('pageerror',e=>errors.push(e.message));
        const calls = {signup:0,verify:0,resend:0}; let denySignup=false; let duplicateKind=null; let signupInFlight=false;
        await page.route('**/auth/v1/**',async route=>{
          if(route.request().method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-methods':'GET,POST,PUT,DELETE,OPTIONS','access-control-allow-headers':'authorization,apikey,x-client-info,content-type,x-supabase-api-version'}});return;}
          const path = new URL(route.request().url()).pathname;
          const body = route.request().postDataJSON();
          if (path.endsWith('/signup')) {
            calls.signup++;
            expect(body.email).toBe(user.email); expect(body.password).toBe('Local-test-password-1!');
            signupInFlight=true;
            await new Promise(resolve=>setTimeout(resolve,150));
            signupInFlight=false;
            const response = denySignup ? {code:'email_address_not_authorized',error_code:'email_address_not_authorized',msg:'Private provider failure'}
              : duplicateKind==='explicit' ? {code:'user_already_exists',error_code:'user_already_exists',msg:'User already registered'}
              : duplicateKind==='obfuscated' ? {...user,role:'',identities:[],email_confirmed_at:null}
              : {...user,identities:[{id:'fixture-email-identity',provider:'email'}],email_confirmed_at:null};
            await route.fulfill({status:denySignup?400:duplicateKind==='explicit'?422:200,contentType:'application/json',headers:{'x-supabase-api-version':'2024-01-01','access-control-allow-origin':'*','access-control-expose-headers':'x-supabase-api-version'},body:JSON.stringify(response)});
          } else if (path.endsWith('/verify')) {
            calls.verify++; expect(body.email).toBe(user.email); expect(body.type).toBe('email');
            await route.fulfill({status:body.token==='012345'?200:403,contentType:'application/json',headers:{'x-supabase-api-version':'2024-01-01'},body:JSON.stringify(body.token==='012345'?session:{code:'otp_expired',error_code:'otp_expired',msg:'Token has expired'})});
          } else if (path.endsWith('/resend')) {
            calls.resend++; expect(body.email).toBe(user.email);expect(body.type).toBe('signup');
            await route.fulfill({status:200,contentType:'application/json',headers:{'x-supabase-api-version':'2024-01-01'},body:'{}'});
          } else if (path.endsWith('/user')) await route.fulfill({status:200,contentType:'application/json',headers:{'x-supabase-api-version':'2024-01-01'},body:JSON.stringify(user)});
          else if (path.endsWith('/logout')) await route.fulfill({status:204});
          else throw new Error('Unexpected intercepted auth endpoint: '+path);
        });
        const th=locale==='th';
        const names={email:th?'อีเมล':'Email',password:th?'รหัสผ่าน':'Password',confirm:th?'ยืนยันรหัสผ่าน':'Confirm password',submit:th?'สมัครสมาชิกและรับ OTP':'Sign up and get OTP',otp:th?'รหัส OTP':'OTP code',verify:th?'ยืนยัน OTP':'Verify OTP',edit:th?'เปลี่ยนอีเมล':'Change email'};
        await page.goto(base+'/register');
        // Prove hydration before typing: WebKit can finish navigation before React attaches input handlers.
        await page.getByRole('button',{name:th?'เปลี่ยนเป็นธีมมืด':'Switch to dark theme',exact:true}).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        await page.getByRole('button',{name:th?'เปลี่ยนเป็นธีมสว่าง':'Switch to light theme',exact:true}).click();
        await expect(page.locator('html')).not.toHaveClass(/dark/);
        await page.getByLabel(names.email,{exact:true}).fill(user.email);
        await page.getByLabel(names.password,{exact:true}).fill('Local-test-password-1!');
        await page.getByLabel(names.confirm,{exact:true}).fill('Does-not-match');
        await page.getByRole('button',{name:th?'แสดงรหัสผ่าน':'Show password',exact:true}).click();
        await expect(page.getByLabel(names.password,{exact:true})).toHaveAttribute('type','text');
        await expect(page.getByLabel(names.confirm,{exact:true})).toHaveAttribute('type','password');
        await page.getByRole('button',{name:th?'แสดงรหัสผ่านยืนยัน':'Show confirmation password',exact:true}).click();
        await expect(page.getByLabel(names.confirm,{exact:true})).toHaveAttribute('type','text');
        await page.getByRole('button',{name:names.submit,exact:true}).click();
        await expect(page.locator('main').getByRole('alert')).toHaveText(th?'รหัสผ่านทั้งสองช่องไม่ตรงกัน':'The passwords do not match.');
        expect(calls.signup).toBe(0);
        await page.getByLabel(names.confirm,{exact:true}).fill('Local-test-password-1!');
        for (const kind of ['obfuscated','explicit']) {
          duplicateKind=kind;
          await page.getByRole('button',{name:names.submit,exact:true}).click();
          const heading=page.getByRole('heading',{name:th?'อีเมลนี้มีบัญชีแล้ว':'This email already has an account',exact:true});
          await expect(heading).toBeVisible(); await expect(heading).toBeFocused();
          for(const width of [320,390,844]){
            await page.setViewportSize({width,height:width===844?390:844});
            expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
          }
          await page.setViewportSize({width:390,height:844});
          await expect(page.getByLabel(names.otp,{exact:true})).toHaveCount(0);
          await expect(page.getByRole('link',{name:th?'ลืมรหัสผ่าน / ตั้งรหัสใหม่':'Forgot password / Reset password',exact:true})).toHaveAttribute('href','/forgot-password');
          await expect(page.getByRole('link',{name:th?'เข้าสู่ระบบ':'Log in',exact:true})).toHaveAttribute('href','/login');
          expect(calls.verify).toBe(0);expect(calls.resend).toBe(0);
          await page.getByRole('button',{name:th?'สมัครด้วยอีเมลอื่น':'Use another email',exact:true}).click();
          await expect(page.getByLabel(names.email,{exact:true})).toBeFocused();
          await expect(page.getByLabel(names.password,{exact:true})).toHaveValue('');
          await expect(page.getByLabel(names.confirm,{exact:true})).toHaveValue('');
          await page.getByLabel(names.password,{exact:true}).fill('Local-test-password-1!');
          await page.getByLabel(names.confirm,{exact:true}).fill('Local-test-password-1!');
        }
        duplicateKind=null;
        denySignup=true;
        await page.getByRole('button',{name:names.submit,exact:true}).click();
        await expect(page.locator('main').getByRole('alert')).toContainText(th?'ระบบยังส่งอีเมล':'Email delivery');
        await expect(page.getByRole('heading',{name:th?'สร้างบัญชีของคุณ':'Create your account'})).toBeVisible();
        denySignup=false;
        await page.getByRole('button',{name:names.submit,exact:true}).click();
        await expect(page.getByLabel(names.otp,{exact:true})).toBeVisible();
        await expect(page.getByLabel(names.otp,{exact:true})).toBeFocused();
        expect(signupInFlight).toBe(false); expect(calls.signup).toBe(4);
        await expect(page.getByRole('button',{name:th?/ส่งรหัสใหม่ได้ใน/:/Resend in/})).toBeDisabled();
        await page.getByLabel(names.otp,{exact:true}).fill('111111');
        await page.getByRole('button',{name:names.verify,exact:true}).click();
        await expect(page.locator('main').getByRole('alert')).toContainText(th?'รหัสไม่ถูกต้อง':'code is invalid');
        await expect(page.getByLabel(names.otp,{exact:true})).toBeVisible();
        // Advance only browser time; keep host/build/Supabase clocks untouched.
        await page.clock.install(); await page.clock.fastForward(61_000);
        await page.getByRole('button',{name:th?'ส่งรหัสใหม่':'Resend code',exact:true}).click();
        await expect(page.getByRole('status')).toContainText(th?'ขอส่งรหัสใหม่แล้ว':'A new code was requested');expect(calls.resend).toBe(1);
        await page.getByRole('button',{name:names.edit,exact:true}).click();
        await expect(page.getByLabel(names.email,{exact:true})).toBeFocused();
        await expect(page.getByLabel(names.password,{exact:true})).toHaveValue('');
        await expect(page.getByLabel(names.confirm,{exact:true})).toHaveValue('');
        await page.getByLabel(names.password,{exact:true}).fill('Local-test-password-1!');
        await page.getByLabel(names.confirm,{exact:true}).fill('Local-test-password-1!');
        await page.getByRole('button',{name:names.submit,exact:true}).click();
        await expect(page.getByLabel(names.otp,{exact:true})).toBeVisible();
        await page.clock.resume();
        await page.getByRole('button',{name:th?'เปลี่ยนเป็นธีมมืด':'Switch to dark theme',exact:true}).click();
        await expect(page.locator('html')).toHaveClass(/dark/);
        if(process.env.REGISTRATION_SCREENSHOT_DIR && engine==='chromium' && locale==='th'){
          await page.screenshot({path:process.env.REGISTRATION_SCREENSHOT_DIR+'/registration-otp-dark.png',fullPage:true});
        }
        for(const width of [320,390,844]){
          await page.setViewportSize({width,height:width===844?390:844});
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
        }
        await page.getByLabel(names.otp,{exact:true}).fill('01 23-45');
        await expect(page.getByLabel(names.otp,{exact:true})).toHaveValue('012345');
        await page.getByRole('button',{name:names.verify,exact:true}).click();
        await expect(page.getByRole('heading',{name:th?'ยืนยันอีเมลสำเร็จ':'Email verified',exact:true})).toBeVisible();
        await expect(page.getByRole('heading',{name:th?'ยืนยันอีเมลสำเร็จ':'Email verified',exact:true})).toBeFocused();
        expect(calls.verify).toBe(2);expect(errors).toEqual([]);
        console.log(`PASS ${engine} ${locale}: existing-account recovery (obfuscated/explicit), independent eyes, mismatch, delivery error, signup, invalid OTP, cooldown/resend, edit email, leading zero, verified session, dark theme, 320/390/844px; Auth intercepted.`);
        await context.close();
      }
    } finally {if(engineBrowser!==browser)await engineBrowser.close();}
  }
} finally {await browser.close();}
