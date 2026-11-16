"use client";

import { Plane } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function TransactionTripIndicator({ name, compact = false }: { name?: string; compact?: boolean }) {
  const { locale } = useLanguage();
  return <details className="inline-block min-w-0 max-w-full align-middle">
    <summary
      aria-label={locale === "th" ? "ดูชื่อทริป" : "Show trip name"}
      className={`flex w-11 cursor-pointer list-none items-center justify-center rounded-lg text-emerald-700 focus-visible:outline-2 dark:text-emerald-300 [&::-webkit-details-marker]:hidden ${compact ? "h-6" : "h-11"}`}>
      <Plane size={16} aria-hidden="true" />
    </summary>
    <span className="break-all text-xs font-medium text-slate-600 dark:text-slate-300">
      {name ?? (locale === "th" ? "ไม่มีสิทธิ์ดูชื่อทริป" : "Trip name unavailable")}
    </span>
  </details>;
}
