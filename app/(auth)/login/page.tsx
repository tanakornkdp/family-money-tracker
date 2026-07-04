"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t.auth.welcomeBack}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.auth.loginSubtitle}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={t.auth.emailLabel}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                {t.auth.passwordLabel}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary-600 hover:underline font-medium"
              >
                {t.auth.forgotPasswordLink}
              </Link>
            </div>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? t.auth.signingIn : t.auth.signIn}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t.auth.noAccount}{" "}
          <Link href="/register" className="text-primary-600 font-medium hover:underline">
            {t.auth.signUp}
          </Link>
        </p>
      </div>
    </main>
  );
}