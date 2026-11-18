"use client";

import AnimatedSelect from "@/components/ui/AnimatedSelect";
import { useEffect, useState } from "react";
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
import type { SecurityActivity } from "@/services/securityActivity";

export default function SettingsForm({
  initialSettings,
  userEmail,
  userId,
}: {
  initialSettings: UserSettings | null;
  userEmail: string;
  userId: string;
}) {
  const supabase = createClient();
  const router = useRouter();
  const { setTheme: applyTheme, theme: activeTheme } = useDarkMode();
  const { locale, setLocale, t } = useLanguage();

  const [fullName, setFullName] = useState(initialSettings?.full_name ?? "");
  const [currency, setCurrency] = useState(initialSettings?.currency ?? "THB");
  const [avatarUrl, setAvatarUrl] = useState(initialSettings?.avatar_url ?? null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockTimeoutMinutes, setLockTimeoutMinutes] = useState(initialSettings?.lock_timeout_minutes ?? 5);
  const [activity, setActivity] = useState<SecurityActivity[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    fetch("/api/security/sign-in-activity", { cache: "no-store" })
      .then(async (response) => response.ok ? (await response.json()).activity as SecurityActivity[] : [])
      .then(setActivity)
      .catch(() => setActivity([]))
      .finally(() => setActivityLoading(false));
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || avatarSaving) return;
    setAvatarError(null);
    if (!file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) {
      setAvatarError(locale === "th" ? "เลือกรูปภาพขนาดไม่เกิน 10 MB" : "Choose an image up to 10 MB.");
      return;
    }
    setAvatarSaving(true);
    const previousUrl = avatarUrl;
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);
    try {
      const url = await uploadAvatar(supabase, userId, file);
      await upsertUserSettings(supabase, userId, { avatar_url: url });
      setAvatarUrl(url);
      router.refresh();
    } catch (err) {
      setAvatarUrl(previousUrl);
      setAvatarError(err instanceof Error ? err.message : (locale === "th" ? "บันทึกรูปไม่สำเร็จ กรุณาลองใหม่" : "Could not save photo. Please retry."));
    } finally {
      URL.revokeObjectURL(preview);
      setAvatarSaving(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const finalAvatarUrl = avatarUrl;

      await upsertUserSettings(supabase, userId, {
        full_name: fullName,
        currency,
        theme: activeTheme,
        language: locale,
        avatar_url: finalAvatarUrl,
        lock_timeout_minutes: lockTimeoutMinutes,
      });

      applyTheme(activeTheme);
      setLocale(locale as AppLanguage);
      setSaved(true);
      router.refresh();
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
              {avatarSaving ? (locale === "th" ? "กำลังบันทึกรูป…" : "Saving photo…") : t.settings.changeAvatar}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={avatarSaving || saving}
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <p role="status" className="mb-4 text-sm text-slate-500 dark:text-slate-400">{avatarError ? <span className="text-red-500">{avatarError}</span> : locale === "th" ? "เลือกรูปแล้วบันทึกอัตโนมัติ • ไม่เกิน 10 MB" : "Photos save automatically • Up to 10 MB"}</p>

        <div className="space-y-4">
          <Input label="Email" value={userEmail} disabled />
          <Input
            label={t.settings.fullName}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{locale === "th" ? "ความปลอดภัยของบัญชี" : "Account security"}</h2>
        <div className="mt-4 max-w-lg">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{locale === "th" ? "ล็อกเมื่อไม่มีการใช้งาน" : "Lock after inactivity"}
            <AnimatedSelect value={lockTimeoutMinutes} onChange={(event) => setLockTimeoutMinutes(Number(event.target.value))} className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value={0}>{locale === "th" ? "ปิด" : "Disabled"}</option><option value={1}>{locale === "th" ? "1 นาที" : "1 minute"}</option><option value={5}>{locale === "th" ? "5 นาที (ค่าเริ่มต้น)" : "5 minutes (default)"}</option><option value={10}>{locale === "th" ? "10 นาที" : "10 minutes"}</option><option value={15}>{locale === "th" ? "15 นาที" : "15 minutes"}</option><option value={30}>{locale === "th" ? "30 นาที" : "30 minutes"}</option>
            </AnimatedSelect>
          </label>
          <p className="mt-2 text-xs text-slate-500">{locale === "th" ? "ปลดล็อกด้วยรหัสผ่านบัญชีเดิม ประวัตินี้แสดงหลังเข้าสู่ระบบและเก็บเฉพาะเวลาและชนิดอุปกรณ์คร่าว ๆ" : "Unlock with your account password. This history stores only the time and a coarse device label."}</p>
        </div>
        <div className="mt-5 border-t border-slate-100 pt-4 dark:border-slate-800">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">{locale === "th" ? "การเข้าสู่ระบบล่าสุด" : "Recent sign-ins"}</h3>
          {activityLoading ? <p className="mt-2 text-sm text-slate-500">{locale === "th" ? "กำลังโหลด…" : "Loading…"}</p> : activity.length ? <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">{activity.map((event) => <li key={event.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span className="text-slate-700 dark:text-slate-300">{event.device_label}</span><time className="text-xs text-slate-500" dateTime={event.created_at}>{new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))}</time></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">{locale === "th" ? "ยังไม่มีประวัติการเข้าสู่ระบบในแอป" : "No sign-in activity recorded yet."}</p>}
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
            <AnimatedSelect
              value={locale}
              onChange={(e) => setLocale(e.target.value as AppLanguage)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="th">ไทย (Thai)</option>
              <option value="en">English</option>
            </AnimatedSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.settings.theme}
            </label>
            <AnimatedSelect
              value={activeTheme}
              onChange={(e) => {
                const nextTheme = e.target.value as AppTheme;
                applyTheme(nextTheme);
              }}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="light">{t.settings.light}</option>
              <option value="dark">{t.settings.dark}</option>
              <option value="system">{t.settings.system}</option>
            </AnimatedSelect>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.settings.currency}
            </label>
            <AnimatedSelect
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </AnimatedSelect>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-green-600">{t.settings.saved}</p>}

          <Button onClick={handleSave} disabled={saving || avatarSaving} className="w-full">
            {saving ? t.settings.saving : t.settings.save}
          </Button>
        </div>
      </Card>
    </div>
  );
}
