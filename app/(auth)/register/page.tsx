"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import PasswordInput from "@/components/ui/PasswordInput";
import MobilePreferencesControls from "@/components/mobile/MobilePreferencesControls";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { isStandaloneApp } from "@/lib/utils/standalone";
import { isValidOtp, normalizeOtp, registrationErrorMessage, validateRegistration } from "@/lib/auth/registration";

export default function RegisterPage() {
  const { locale } = useLanguage();
  const thai = locale === "th";
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [token, setToken] = useState("");
  const [step, setStep] = useState<"register" | "verify" | "complete">("register");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [resendSeconds, setResendSeconds] = useState(0);
  const busy = useRef(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const otpInput = useRef<HTMLInputElement>(null);
  const stepHeading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const hasSupabaseConfig = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  useEffect(() => {
    if (!resendAt) return;
    const update = () => setResendSeconds(Math.max(0, Math.ceil((resendAt - Date.now()) / 1000)));
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [resendAt]);

  useEffect(() => {
    if (step === "verify") otpInput.current?.focus();
    else if (step === "complete") stepHeading.current?.focus();
    else if (previousStep.current === "verify") emailInput.current?.focus();
    previousStep.current = step;
  }, [step]);

  function beginCooldown() {
    setResendSeconds(60);
    setResendAt(Date.now() + 60_000);
  }

  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    setNotice(null);
    try { await action(); }
    catch (failure) { setError(registrationErrorMessage(failure, locale)); }
    finally { busy.current = false; setLoading(false); }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const invalid = validateRegistration(email, password, confirmation);
    if (invalid) {
      setError(invalid === "password_mismatch"
        ? (thai ? "รหัสผ่านทั้งสองช่องไม่ตรงกัน" : "The passwords do not match.")
        : invalid === "short_password"
          ? (thai ? "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" : "Use at least 6 characters for your password.")
          : (thai ? "กรุณากรอกอีเมลให้ถูกต้อง" : "Enter a valid email address."));
      return;
    }
    if (!hasSupabaseConfig) {
      setError(thai ? "ระบบสมัครสมาชิกยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแล" : "Sign-up is not configured. Please contact the administrator.");
      return;
    }
    await run(async () => {
      const client = createClient();
      const destination = email.trim();
      // Keep password-based signup. The confirmation email template contains .Token, not a link.
      const { data, error: signUpError } = await client.auth.signUp({ email: destination, password });
      if (signUpError) throw signUpError;
      if (data.session) {
        // OTP verification requires Confirm email enabled; never silently bypass that step.
        await client.auth.signOut({ scope: "local" });
        setError(thai ? "ระบบยืนยันอีเมลยังตั้งค่าไม่ครบ กรุณาติดต่อผู้ดูแล" : "Email verification is not configured. Please contact the administrator.");
        return;
      }
      setPendingEmail(destination);
      setPassword("");
      setConfirmation("");
      setToken("");
      setStep("verify");
      beginCooldown();
    });
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (!isValidOtp(token)) {
      setError(thai ? "กรุณากรอกรหัส OTP ให้ครบตามที่ได้รับในอีเมล" : "Enter the complete OTP from your email.");
      return;
    }
    await run(async () => {
      const { data, error: verifyError } = await createClient().auth.verifyOtp({ email: pendingEmail, token, type: "email" });
      if (verifyError) throw verifyError;
      if (!data.session || !data.user?.email_confirmed_at) throw new Error("Verification did not return a confirmed session");
      setToken("");
      setStep("complete");
    });
  }

  async function resend() {
    if (Date.now() < resendAt) return;
    await run(async () => {
      const { error: resendError } = await createClient().auth.resend({ type: "signup", email: pendingEmail });
      if (resendError) { beginCooldown(); throw resendError; }
      beginCooldown();
      setNotice(thai ? "ขอส่งรหัสใหม่แล้ว กรุณาตรวจสอบอีเมลและโฟลเดอร์สแปม" : "A new code was requested. Check your inbox and spam folder.");
    });
  }

  function openDashboard() {
    const mobile = isStandaloneApp() || window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    router.push(mobile ? "/mobile/dashboard" : "/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 py-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5"><MobilePreferencesControls /></div>
        <h1 ref={stepHeading} tabIndex={-1} className="text-2xl font-semibold text-slate-900 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-slate-100">
          {step === "register" ? (thai ? "สร้างบัญชีของคุณ" : "Create your account") : step === "verify" ? (thai ? "ยืนยันอีเมลด้วย OTP" : "Verify your email with OTP") : (thai ? "ยืนยันอีเมลสำเร็จ" : "Email verified")}
        </h1>
        <p className="mt-2 break-words text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {step === "register" ? (thai ? "เริ่มบันทึกการเงินของคุณด้วย AI" : "Start tracking your finances with AI") : step === "verify" ? (thai ? "นำรหัสที่ได้รับทางอีเมลมากรอกด้านล่าง" : "Enter the code from your email below.") : (thai ? "บัญชีของคุณพร้อมใช้งานแล้ว" : "Your account is ready to use.")}
        </p>
        {step === "verify" && <p className="mt-2 break-all text-sm font-medium text-slate-900 dark:text-slate-100">{pendingEmail}</p>}

        {step === "register" && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" aria-busy={loading}>
            <Input ref={emailInput} label={thai ? "อีเมล" : "Email"} type="email" autoComplete="email" className="min-h-12 text-base"
              value={email} onChange={event => setEmail(event.target.value)} required disabled={loading} />
            <PasswordInput label={thai ? "รหัสผ่าน" : "Password"} autoComplete="new-password"
              showLabel={thai ? "แสดงรหัสผ่าน" : "Show password"} hideLabel={thai ? "ซ่อนรหัสผ่าน" : "Hide password"}
              value={password} onChange={event => setPassword(event.target.value)} required minLength={6} disabled={loading} />
            <PasswordInput label={thai ? "ยืนยันรหัสผ่าน" : "Confirm password"} autoComplete="new-password"
              showLabel={thai ? "แสดงรหัสผ่านยืนยัน" : "Show confirmation password"} hideLabel={thai ? "ซ่อนรหัสผ่านยืนยัน" : "Hide confirmation password"}
              value={confirmation} onChange={event => setConfirmation(event.target.value)} required minLength={6} disabled={loading} />
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{thai ? "อย่างน้อย 6 ตัวอักษร และต้องตรงกันทั้งสองช่อง" : "At least 6 characters. Both passwords must match."}</p>
            <Button type="submit" className="min-h-12 w-full" disabled={loading}>
              {loading ? (thai ? "กำลังขอรหัส..." : "Requesting code...") : (thai ? "สมัครสมาชิกและรับ OTP" : "Sign up and get OTP")}
            </Button>
          </form>
        )}

        {step === "verify" && (
          <form onSubmit={handleVerify} className="mt-6 space-y-4" aria-busy={loading}>
            <Input ref={otpInput} label={thai ? "รหัส OTP" : "OTP code"} type="text" inputMode="numeric" autoComplete="one-time-code"
              className="min-h-12 text-base tabular-nums" value={token} onChange={event => setToken(normalizeOtp(event.target.value))}
              required pattern="[0-9]{6,10}" minLength={6} maxLength={10} disabled={loading} aria-describedby="otp-help" />
            <p id="otp-help" className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {thai ? "ใช้รหัสล่าสุด หากยังไม่พบอีเมล ให้ตรวจสอบสแปม หรือกดส่งรหัสใหม่" : "Use the latest code. Check spam or request a new code if the email has not arrived."}
            </p>
            <Button type="submit" className="min-h-12 w-full" disabled={loading}>{loading ? (thai ? "กำลังดำเนินการ..." : "Please wait...") : (thai ? "ยืนยัน OTP" : "Verify OTP")}</Button>
            <Button type="button" variant="secondary" className="min-h-12 w-full" disabled={loading || resendSeconds > 0} onClick={resend}>
              {resendSeconds > 0 ? (thai ? `ส่งรหัสใหม่ได้ใน ${resendSeconds} วินาที` : `Resend in ${resendSeconds}s`) : (thai ? "ส่งรหัสใหม่" : "Resend code")}
            </Button>
            <button type="button" disabled={loading} onClick={() => { setStep("register"); setToken(""); setError(null); setNotice(null); }}
              className="min-h-11 w-full rounded-xl text-sm text-primary-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-indigo-300">
              {thai ? "เปลี่ยนอีเมล" : "Change email"}
            </button>
          </form>
        )}

        {error && <p role="alert" className="mt-4 text-sm leading-relaxed text-red-600 dark:text-red-400">{error}</p>}
        {notice && <p role="status" className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{notice}</p>}
        {step === "complete" && <Button type="button" onClick={openDashboard} className="mt-6 min-h-12 w-full">{thai ? "เริ่มใช้งาน" : "Open dashboard"}</Button>}
        {step !== "complete" && <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {thai ? "มีบัญชีแล้ว?" : "Already have an account?"}{" "}
          <Link href="/login" className="font-medium text-primary-600 dark:text-indigo-300">{thai ? "เข้าสู่ระบบ" : "Log in"}</Link>
        </p>}
      </div>
    </main>
  );
}
