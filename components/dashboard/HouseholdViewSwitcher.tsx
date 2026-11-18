"use client";
import { useRouter, usePathname } from "next/navigation";
import type { Household } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import AnimatedSelect from "@/components/ui/AnimatedSelect";
export default function HouseholdViewSwitcher({ households, selectedHouseholdId, personalLabel, label }: {
  households: Household[]; selectedHouseholdId: string; personalLabel?: string; label?: string;
}) {
  const router = useRouter(); const pathname = usePathname(); const { t } = useLanguage();
  if (!households.length) return null;
  return <div className="w-48 max-w-full"><AnimatedSelect value={selectedHouseholdId} aria-label={label ?? t.household.viewMode} onChange={event => {
    const value = event.target.value;
    router.push(value ? pathname + "?" + new URLSearchParams({ household: value }) : pathname);
  }} className="flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-mobile-border bg-mobile-surface px-3 py-2 text-sm text-mobile-ink focus-visible:outline-2 focus-visible:outline-primary-600">
    <option value="">{personalLabel ?? t.dashboard.viewAll}</option>
    {households.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
  </AnimatedSelect></div>;
}
