"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function DashboardHeader() {
  const { t } = useLanguage();
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        {t.dashboard.title}
      </h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">{t.dashboard.subtitle}</p>
    </div>
  );
}