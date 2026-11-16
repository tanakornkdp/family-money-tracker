"use client";

import { useEffect, type ReactNode } from "react";
import { formatFilterDate } from "@/components/ui/FilterBar";
import type { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import TransactionFilterPanel from "./TransactionFilterPanel";
import TransactionTripIndicator from "./TransactionTripIndicator";

export default function MobileTransactionsList({
  transactions, displayNames, cardNames, currency, locale, tripNames, focusId, filterFooter,
}: {
  transactions: Transaction[];
  displayNames: Record<string, string>;
  cardNames: Record<string, string>;
  currency: string;
  locale: "th" | "en";
  tripNames: Record<string, string>;
  focusId?: string;
  filterFooter?: ReactNode;
}) {
  useEffect(() => {
    if (!focusId) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("transaction-" + focusId)?.scrollIntoView({ block: "start" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusId]);

  return <TransactionFilterPanel transactions={transactions} displayNames={displayNames} cardNames={cardNames} locale={locale} footer={filterFooter}>
    {(filtered) => filtered.length ? <div className="space-y-2">
      {filtered.map((tx) => <article key={tx.id} id={`transaction-${tx.id}`} data-highlighted={focusId === tx.id || undefined} className="flex scroll-mt-20 items-center justify-between gap-3 rounded-2xl bg-mobile-surface p-4 shadow-sm data-[highlighted=true]:ring-2 data-[highlighted=true]:ring-emerald-600">
        <div className="min-w-0">
          <div className="flex items-start">
            <p className="min-w-0 truncate font-semibold leading-6">{tx.title}</p>
            {tx.travel_trip_id && <TransactionTripIndicator compact name={tripNames[tx.travel_trip_id]} />}
          </div>
          <p className="mt-1 truncate text-xs text-slate-500">{tx.category} · {formatFilterDate(tx.date, locale)}{tx.card_id ? ` · ${cardNames[tx.card_id] ?? (locale === "en" ? "Card" : "บัตร")}` : ""}</p>
          {displayNames[tx.user_id] && <p className="mt-1 text-[11px] text-slate-400">{displayNames[tx.user_id]}</p>}
        </div>
        <strong className={`shrink-0 ${tx.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{tx.type === "income" ? "+" : "−"}{formatCurrency(Number(tx.amount), currency)}</strong>
      </article>)}
    </div> : <p className="py-8 text-center text-sm text-slate-500">{locale === "en" ? "No transactions match these filters." : "ไม่พบรายการตามเงื่อนไขที่เลือก"}</p>}
  </TransactionFilterPanel>;
}
