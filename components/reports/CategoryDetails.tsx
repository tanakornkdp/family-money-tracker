"use client";

import Accordion from "@/components/ui/Accordion";
import { formatFilterDate } from "@/components/ui/FilterBar";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { groupCategoryDetails } from "@/lib/utils/categoryDetails.mjs";
import type { ExpenseReportData } from "@/services/expenseReports";

export default function CategoryDetails({ rows, currency, locale }: {
  rows: ExpenseReportData["exportRows"];
  currency: string;
  locale: "th" | "en";
}) {
  const groups = groupCategoryDetails(rows);
  const th = locale === "th";
  if (!groups.length) return null;
  return <section aria-labelledby="category-details-title" className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
    <h2 id="category-details-title" className="font-semibold">{th ? "รายละเอียดตามหมวดหมู่" : "Category details"}</h2>
    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{th ? "แตะหมวดหมู่เพื่อดูรายการตามช่วงวันที่และตัวกรองที่เลือก" : "Select a category to see transactions matching your dates and filters."}</p>
    <div className="mt-3 divide-y divide-slate-200 dark:divide-slate-700">
      {groups.map(group => <Accordion key={group.category} triggerClassName="min-h-14 py-3" title={<span className="flex min-w-0 items-center justify-between gap-3">
        <span className="min-w-0 break-words"><span className="block text-sm font-medium">{group.category}</span><span className="block text-xs text-slate-500 dark:text-slate-400">{group.rows.length} {th ? "รายการ" : "transactions"}</span></span>
        <span className="shrink-0 text-sm font-semibold tabular-nums">{formatCurrency(group.amount, currency)}</span>
      </span>}>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto overscroll-contain pb-2 dark:divide-slate-800" aria-label={group.category}>
          {group.rows.map(row => <li key={row.id} className="flex min-w-0 items-start justify-between gap-3 py-3">
            <div className="min-w-0"><p className="break-words text-sm">{row.title}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{formatFilterDate(row.date, locale)}</p></div>
            <span className={"shrink-0 text-sm font-medium tabular-nums " + (row.type === "income" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400")}>{row.type === "income" ? "+" : "−"}{formatCurrency(row.amount, currency)}</span>
          </li>)}
        </ul>
      </Accordion>)}
    </div>
  </section>;
}
