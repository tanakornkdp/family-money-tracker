"use client";

import { useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { upsertUserSettings } from "@/services/userSettings";
import type { AppLanguage, AppTheme } from "@/types";

export function useMobilePreferences(userId?: string) {
  const { locale, setLocale } = useLanguage();
  const { isDark, setTheme } = useTheme();
  const [saving, setSaving] = useState<"language" | "theme" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function changeLanguage() {
    const nextLocale: AppLanguage = locale === "th" ? "en" : "th";
    setError(null);
    setLocale(nextLocale);
    if (!userId) return;
    setSaving("language");
    try {
      await upsertUserSettings(createClient(), userId, { language: nextLocale });
    } catch {
      setError(locale === "th" ? "เปลี่ยนภาษาแล้ว แต่บันทึกไม่สำเร็จ" : "Language changed, but could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  async function changeTheme() {
    const nextTheme: AppTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
    setError(null);
    if (!userId) return;
    setSaving("theme");
    try {
      await upsertUserSettings(createClient(), userId, { theme: nextTheme });
    } catch {
      setError(locale === "th" ? "เปลี่ยนธีมแล้ว แต่บันทึกไม่สำเร็จ" : "Theme changed, but could not be saved.");
    } finally {
      setSaving(null);
    }
  }

  return { locale, isDark, saving, error, changeLanguage, changeTheme };
}

export default function MobilePreferencesControls({ userId }: { userId?: string }) {
  const { locale, isDark, saving, error, changeLanguage, changeTheme } = useMobilePreferences(userId);
  return (
    <div className="flex min-h-10 items-center justify-end gap-2" aria-label={locale === "th" ? "การแสดงผล" : "Appearance preferences"}>
      {error && <span className="sr-only" role="status" aria-live="polite">{error}</span>}
      <button type="button" onClick={changeLanguage} disabled={saving === "language"}
        aria-label={locale === "th" ? "Switch language to English" : "เปลี่ยนภาษาเป็นภาษาไทย"}
        title={locale === "th" ? "เปลี่ยนภาษาเป็น English" : "Switch language to Thai"}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-mobile-border bg-mobile-surface px-3 text-xs font-semibold text-mobile-ink shadow-sm transition-colors hover:bg-mobile-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60">
        <Languages size={16} className="text-mobile-muted" aria-hidden="true" /><span>{locale === "th" ? "ไทย" : "EN"}</span>
      </button>
      <button type="button" onClick={changeTheme} disabled={saving === "theme"}
        aria-label={isDark ? (locale === "th" ? "เปลี่ยนเป็นธีมสว่าง" : "Switch to light theme") : (locale === "th" ? "เปลี่ยนเป็นธีมมืด" : "Switch to dark theme")}
        title={isDark ? (locale === "th" ? "ธีมสว่าง" : "Light theme") : (locale === "th" ? "ธีมมืด" : "Dark theme")}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-mobile-border bg-mobile-surface text-mobile-ink shadow-sm transition-colors hover:bg-mobile-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60">
        {isDark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
      </button>
    </div>
  );
}


