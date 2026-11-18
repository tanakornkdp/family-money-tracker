"use client";

import Accordion from "@/components/ui/Accordion";
import { UserRound } from "lucide-react";
import SettingsForm from "@/components/settings/SettingsForm";
import type { UserSettings } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function MobileSettingsSections({ settings, userEmail, userId, initialProfileOpen = false }: {
  settings: UserSettings | null;
  userEmail: string;
  userId: string;
  initialProfileOpen?: boolean;
}) {
  const { t } = useLanguage();

  return (
    <Accordion defaultOpen={initialProfileOpen} className="overflow-hidden rounded-3xl bg-mobile-surface shadow-sm" triggerClassName="px-4 py-4" title={<span className="flex items-center gap-3">
        <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><UserRound size={20} aria-hidden="true" /></span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold">{t.settings.mobileAccount}</span>
          <span className="mt-1 block text-xs text-slate-500">{t.settings.mobileAccountDescription}</span>
        </span>
      </span>}>
      <div className="p-3">
        <SettingsForm initialSettings={settings} userEmail={userEmail} userId={userId} />
      </div>
    </Accordion>
  );
}
