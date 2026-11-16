"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useDarkMode } from "@/lib/hooks/useDarkMode";
import { Sun, Moon, LogOut, Wallet, Menu } from "lucide-react";
import { upsertUserSettings } from "@/services/userSettings";
import { AppLanguage, AppTheme } from "@/types";
import { useState } from "react";
import NotificationCenter from "@/components/NotificationCenter";

export default function Topbar({
  userEmail,
  userId,
  avatarUrl,
  fullName,
  onMenuToggle,
}: {
  userEmail?: string;
  userId?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  onMenuToggle?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale, setLocale } = useLanguage();
  const { isDark, setTheme } = useDarkMode();
  const [preferenceError, setPreferenceError] = useState<string | null>(null);

  const changeLocale = async () => {
    const nextLocale: AppLanguage = locale === "th" ? "en" : "th";
    setPreferenceError(null);
    try {
      if (userId) await upsertUserSettings(supabase, userId, { language: nextLocale });
      setLocale(nextLocale);
    } catch {
      setLocale(nextLocale);
      setPreferenceError(locale === "th" ? "เปลี่ยนภาษาแล้ว แต่บันทึกลงบัญชีไม่สำเร็จ" : "Language changed, but could not sync it to your account.");
    }
  };

  const changeTheme = async (nextTheme: AppTheme) => {
    setPreferenceError(null);
    setTheme(nextTheme);
    try {
      if (userId) await upsertUserSettings(supabase, userId, { theme: nextTheme });
    } catch {
      setPreferenceError(locale === "th" ? "เปลี่ยนธีมแล้ว แต่บันทึกลงบัญชีไม่สำเร็จ" : "Theme changed, but could not sync it to your account.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const displayName = fullName?.trim() || userEmail?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 py-3.5 border-b backdrop-blur-md bg-white/85 dark:bg-slate-950/85 border-slate-200 dark:border-slate-900 transition-colors">
      <div className="flex items-center gap-2.5">
        {onMenuToggle && (
          <button
            type="button"
            onClick={onMenuToggle}
            aria-label="เปิดเมนูนำทาง"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:text-slate-300 dark:hover:bg-slate-900 md:hidden"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
        )}
        <div className="flex items-center gap-2 select-none">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/20 hidden md:flex">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Family Money
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
          {userId && <NotificationCenter userId={userId} />}
          {/* ปุ่มเปลี่ยนภาษา */}
          <button
            onClick={changeLocale}
            className="px-3 py-2 rounded-xl border transition-all bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-600 dark:text-slate-400 text-xs font-bold"
            title="เปลี่ยนภาษา / Change Language"
          >
            {locale === "th" ? "EN" : "ไทย"}
          </button>

          {/* ปุ่มเปลี่ยนธีม */}
          <button
            onClick={(event) => {
              const root = document.documentElement;
              const rect = event.currentTarget.getBoundingClientRect();
              root.style.setProperty("--theme-x", `${rect.left + rect.width / 2}px`);
              root.style.setProperty("--theme-y", `${rect.top + rect.height / 2}px`);
              const nextTheme: AppTheme = isDark ? "light" : "dark";
              if ("startViewTransition" in document && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                (document as Document & { startViewTransition?: (callback: () => void) => void }).startViewTransition?.(() => { void changeTheme(nextTheme); });
              } else void changeTheme(nextTheme);
            }}
            className="p-2 rounded-xl border transition-all bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-600 dark:text-slate-400"
            title="เปลี่ยนธีม"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

        <div className="flex items-center gap-2.5 border-l pl-3 border-slate-200 dark:border-slate-800">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              unoptimized
              className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
          )}
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold leading-tight text-slate-900 dark:text-slate-100">
              {displayName}
            </p>
            <span className="text-[10px] text-slate-400 font-mono">{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="p-1 rounded text-slate-400 hover:text-red-500 transition-colors"
            title={t.common.logout}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {preferenceError && <span role="status" aria-live="polite" className="absolute right-3 top-full z-40 mt-1 max-w-[min(22rem,90vw)] rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 shadow-md dark:bg-red-950 dark:text-red-200">{preferenceError}</span>}
    </header>
  );
}
