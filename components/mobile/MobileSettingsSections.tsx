"use client";

import { useState } from "react";
import { ChevronDown, UserRound } from "lucide-react";
import SettingsForm from "@/components/settings/SettingsForm";
import type { UserSettings } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function MobileSettingsSections({ settings, userEmail, userId, initialProfileOpen = false }: {
  settings: UserSettings | null;
  userEmail: string;
  userId: string;
  initialProfileOpen?: boolean;
}) {
  const [open, setOpen] = useState(initialProfileOpen);
  const { t } = useLanguage();

  return (
    <section className="overflow-hidden rounded-3xl bg-mobile-surface shadow-sm">
      <button type="button" aria-expanded={open} onClick={() => setOpen(value => !value)} className="flex min-h-[76px] w-full items-center gap-3 px-4 py-4 text-left">
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound size={20} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t.settings.mobileAccount}</span>
          <span className="mt-1 block text-xs text-slate-500">{t.settings.mobileAccountDescription}</span>
        </span>
        <ChevronDown size={19} aria-hidden="true" className={`text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-slate-100 p-3 dark:border-slate-800">
        <SettingsForm initialSettings={settings} userEmail={userEmail} userId={userId} />
      </div>}
    </section>
  );
}
