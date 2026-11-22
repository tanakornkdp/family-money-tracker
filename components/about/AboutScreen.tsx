"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { APP_VERSION } from "@/lib/appVersion";

export default function AboutScreen() {
  const { t } = useLanguage();
  return (
    <section aria-labelledby="about-title" className="w-full min-w-0 max-w-xl space-y-5">
      <h1 id="about-title" className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.nav.about}</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">Family Money Tracker</p>
        <dl className="mt-5 flex items-center justify-between gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <dt className="text-sm text-slate-500 dark:text-slate-400">{t.about.version}</dt>
          <dd className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">{APP_VERSION}</dd>
        </dl>
      </div>
    </section>
  );
}
