"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useDarkMode } from "@/lib/hooks/useDarkMode";
import { Sun, Moon, LogOut, Menu, Wallet } from "lucide-react";

export default function Topbar({
  userEmail,
  avatarUrl,
  fullName,
  onMenuToggle,
}: {
  userEmail?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
  onMenuToggle?: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();
  const { isDark, toggle } = useDarkMode();
  const { locale, setLocale } = useLanguage();

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
            onClick={onMenuToggle}
            className="p-2 -ml-2 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 md:hidden text-slate-600 dark:text-slate-400"
            title="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center gap-2 select-none">
          <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-xl items-center justify-center shadow-lg shadow-indigo-500/20 hidden md:flex">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
            Smart Finance AI
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
          {/* ปุ่มเปลี่ยนภาษา */}
          <button
            onClick={() => setLocale(locale === "th" ? "en" : "th")}
            className="px-3 py-2 rounded-xl border transition-all bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-600 dark:text-slate-400 text-xs font-bold"
            title="เปลี่ยนภาษา / Change Language"
          >
            {locale === "th" ? "EN" : "ไทย"}
          </button>

          {/* ปุ่มเปลี่ยนธีม */}
          <button
            onClick={toggle}
            className="p-2 rounded-xl border transition-all bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500/30 text-slate-600 dark:text-slate-400"
            title="เปลี่ยนธีม"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

        <div className="flex items-center gap-2.5 border-l pl-3 border-slate-200 dark:border-slate-800">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
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
    </header>
  );
}