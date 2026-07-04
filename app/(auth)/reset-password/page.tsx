"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError(t.auth.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setError(t.auth.passwordMismatch);
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message || t.auth.updateError);
      return;
    }

    setSuccess(t.auth.updateSuccess);
    
    // Redirect to dashboard after a short delay so they can see success message
    setTimeout(() => {
      router.push("/dashboard");
      router.refresh();
    }, 2000);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold text-slate-900">{t.auth.updatePasswordTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {t.auth.updatePasswordDesc}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Input
            label={t.auth.newPasswordLabel}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading || !!success}
          />
          <Input
            label={t.auth.confirmPasswordLabel}
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading || !!success}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600 font-medium">{success}</p>}

          <Button type="submit" className="w-full" disabled={loading || !!success}>
            {loading ? t.auth.updating : t.auth.updatePasswordBtn}
          </Button>
        </form>
      </div>
    </main>
  );
}
