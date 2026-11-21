"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MobilePreferencesControls from "@/components/mobile/MobilePreferencesControls";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function RegisterPage() {
  const { locale } = useLanguage();
  const thai = locale === "th";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hasSupabaseConfig) {
      setError(thai ? "ยังไม่ได้ตั้งค่าระบบสมัครสมาชิก" : "Sign-up is not configured.");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      setSuccess(true);
    } catch {
      setError(thai ? "เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบการตั้งค่าและอินเทอร์เน็ต" : "Could not connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5"><MobilePreferencesControls /></div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          {thai ? "สร้างบัญชีของคุณ" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {thai ? "เริ่มบันทึกการเงินของคุณด้วย AI" : "Start tracking your finances with AI"}
        </p>

        {!hasSupabaseConfig && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ต้องตั้งค่า <code>NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ก่อนสมัครสมาชิก
          </div>
        )}

        {success ? (
          <div className="mt-6 rounded-xl bg-green-50 border border-green-200 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300">
            {thai ? "ตรวจสอบอีเมลเพื่อยืนยันบัญชี แล้วเข้าสู่ระบบ" : "Check your email to confirm your account, then log in."}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Input
              label={thai ? "อีเมล" : "Email"}
              type="email"
              autoComplete="email"
              className="min-h-12 text-base"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label={thai ? "รหัสผ่าน" : "Password"}
              type="password"
              autoComplete="new-password"
              className="min-h-12 text-base"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />

            {error && <p className="text-sm text-red-600">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (thai ? "กำลังสร้างบัญชี..." : "Creating account...") : (thai ? "สมัครสมาชิก" : "Sign Up")}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {thai ? "มีบัญชีแล้ว?" : "Already have an account?"}{" "}
          <Link href="/login" className="font-medium text-primary-600 dark:text-indigo-300">
            {thai ? "เข้าสู่ระบบ" : "Log in"}
          </Link>
        </p>
      </div>
    </main>
  );
}
