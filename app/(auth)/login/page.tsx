"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import MobilePreferencesControls from "@/components/mobile/MobilePreferencesControls";
import { isStandaloneApp } from "@/lib/utils/standalone";

export default function LoginPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const thai = locale === "th";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!hasSupabaseConfig) {
      setError(thai ? "ยังไม่ได้ตั้งค่าระบบเข้าสู่ระบบ" : "Sign-in is not configured.");
      return;
    }
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      await fetch("/api/security/sign-in-activity", { method: "POST", cache: "no-store" }).catch(() => undefined);

      const requestedNext = new URLSearchParams(window.location.search).get("next");
      const standalone = isStandaloneApp();
      let destination = standalone ? "/mobile/dashboard" : "/dashboard";
      if (requestedNext) {
        try {
          const nextUrl = new URL(requestedNext, window.location.origin);
          if (nextUrl.origin === window.location.origin &&
              !(standalone && ["/", "/dashboard", "/desktop"].includes(nextUrl.pathname))) {
            destination = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
          }
        } catch {
          // Ignore malformed redirect targets and use the safe dashboard default.
        }
      }

      router.push(destination);
      router.refresh();
    } catch {
      setError(thai ? "เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง" : "Could not connect. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6 py-6 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-5"><MobilePreferencesControls /></div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{thai ? "ยินดีต้อนรับกลับ" : "Welcome back"}</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {thai ? "เข้าสู่ระบบบัญชี Smart Finance AI" : "Log in to your Smart Finance AI account"}
        </p>

        {!hasSupabaseConfig && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            ต้องตั้งค่า <code>NEXT_PUBLIC_SUPABASE_URL</code> และ{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> ก่อนเข้าสู่ระบบ
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div className="text-right">
            <Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-primary-600 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-indigo-300">
              {t.auth.forgotPasswordTitle}
            </Link>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          {thai ? "ยังไม่มีบัญชี?" : "Don't have an account?"}{" "}
          <Link href="/register" className="font-medium text-primary-600 dark:text-indigo-300">
            {thai ? "สมัครสมาชิก" : "Sign up"}
          </Link>
        </p>
      </div>
    </main>
  );
}
