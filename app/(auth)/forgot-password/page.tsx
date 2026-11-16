"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

function ResetLinkNotice() {
  const searchParams = useSearchParams();
  const { locale } = useLanguage();
  if (searchParams.get("error") !== "reset_link_invalid") return null;
  return (
    <p role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      {locale === "th"
        ? "ลิงก์นี้ใช้ไม่ได้หรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่และเปิดอีเมลฉบับล่าสุดในเบราว์เซอร์ที่ใช้ขอลิงก์"
        : "This link is invalid or expired. Request a new one and open the latest email in the browser you used to request it."}
    </p>
  );
}

export default function ForgotPasswordPage() {
  const supabase = createClient();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const redirectTo = `${window.location.origin}/callback?next=/reset-password`;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message || t.auth.resetError);
      return;
    }

    setSuccess(t.auth.resetSuccess);
    setEmail("");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t.auth.forgotPasswordTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.auth.forgotPasswordDesc}
        </p>
        <Suspense fallback={null}>
          <ResetLinkNotice />
        </Suspense>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={t.auth.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading || !!success}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}

          <Button type="submit" className="w-full" disabled={loading || !!success}>
            {loading ? t.auth.sending : t.auth.sendResetLink}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-sm text-primary-600 font-medium hover:underline">
            {t.auth.backToLogin}
          </Link>
        </div>
      </div>
    </main>
  );
}
