"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useDarkMode } from "@/lib/hooks/useDarkMode";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { uploadAvatar, upsertUserSettings } from "@/services/userSettings";
import { SUPPORTED_CURRENCIES } from "@/lib/utils/formatCurrency";
import { UserSettings, AppLanguage, AppTheme } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function SettingsForm({
  initialSettings,
  userEmail,
  userId,
}: {
  initialSettings: UserSettings | null;
  userEmail: string;
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { toggle: toggleDarkMode, isDark } = useDarkMode();
  const { locale, setLocale, t } = useLanguage();

  const [fullName, setFullName] = useState(initialSettings?.full_name ?? "");
  const [currency, setCurrency] = useState(initialSettings?.currency ?? "THB");
  const [theme, setLocalTheme] = useState<AppTheme>(initialSettings?.theme ?? "system");
  const [avatarUrl, setAvatarUrl] = useState(initialSettings?.avatar_url ?? null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      let finalAvatarUrl = avatarUrl;

      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar(supabase, userId, avatarFile);
      }

      await upsertUserSettings(supabase, userId, {
        full_name: fullName,
        currency,
        theme,
        language: locale,
        avatar_url: finalAvatarUrl,
      });

      if ((theme === "dark") !== isDark) {
        toggleDarkMode();
      }

      setLocale(locale as AppLanguage);
      setSaved(true);

      setTimeout(() => {
        window.location.reload();
      }, 300);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.settings.profile}
        </h2>

        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xl font-semibold">
                {userEmail.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <label className="cursor-pointer">
            <span className="text-sm font-medium text-primary-600 hover:text-primary-700">
              {t.settings.changeAvatar}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </label>
        </div>

        <div className="space-y-4">
          <Input label="Email" value={userEmail} disabled />
          <Input
            label={t.settings.fullName}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
      </Card>

      {/* Preferences */}
      <Card>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.settings.preferences}
        </h2>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.settings.language}
            </label>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as AppLanguage)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="th">ไทย (Thai)</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.settings.theme}
            </label>
            <select
              value={theme}
              onChange={(e) => setLocalTheme(e.target.value as AppTheme)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="light">{t.settings.light}</option>
              <option value="dark">{t.settings.dark}</option>
              <option value="system">{t.settings.system}</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.settings.currency}
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">{t.settings.saved}</p>}

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? t.settings.saving : t.settings.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}