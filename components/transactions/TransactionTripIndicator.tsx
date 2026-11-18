"use client";

import { Plane } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Accordion from "@/components/ui/Accordion";

export default function TransactionTripIndicator({ name, compact = false }: { name?: string; compact?: boolean }) {
  const { locale } = useLanguage();
  return <Accordion className="inline-block min-w-0 max-w-full align-middle" label={locale === "th" ? "ดูชื่อทริป" : "Show trip name"}
      triggerClassName={`w-11! gap-0! rounded-lg text-emerald-700 dark:text-emerald-300 [&>.slide-accordion-chevron]:hidden ${compact ? "min-h-6! h-6" : "h-11"}`}
      title={<span className="flex justify-center">
      <Plane size={16} aria-hidden="true" />
    </span>}>
    <span className="break-all text-xs font-medium text-slate-600 dark:text-slate-300">
      {name ?? (locale === "th" ? "ไม่มีสิทธิ์ดูชื่อทริป" : "Trip name unavailable")}
    </span>
  </Accordion>;
}
