"use client";

import { BarChart3, CalendarDays, Download, Users } from "lucide-react";
import type { ExpenseReportData } from "@/services/expenseReports";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import ExpenseReportFilters from "@/components/reports/ExpenseReportFilters";
import ExpenseReportCharts from "@/components/reports/ExpenseReportCharts";
import { filterSecondary, formatFilterDate } from "@/components/ui/FilterBar";

export default function ExpenseReports({ data }: { data: ExpenseReportData }) {
  const { t, locale } = useLanguage();
  const th = locale === "th";
  const totalLabel = data.transactionType === "expense" ? t.reports.totalSpent : data.transactionType === "income" ? (th ? "รายรับรวม" : "Total income") : (th ? "รายรับและรายจ่ายรวม" : "Total income and expenses");
  const scopeLabel = data.scope === "household"
    ? data.households.find((household) => household.id === data.householdId)?.name ?? t.reports.household
    : t.reports.personal;
  const memberLabel = data.memberId
    ? data.members.find((member) => member.userId === data.memberId)?.name
    : t.reports.allMembers;

  const dateRangeLabel = formatFilterDate(data.from, locale) + " – " + formatFilterDate(data.to, locale);
  const exportCsv = () => {
    const quote = (value: string | number) => {
      const text = String(value);
      const safe = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
      return '"' + safe.replaceAll('"', '""') + '"';
    };
    const lines: (string | number)[][] = [["Date", "Description", "Category", "Amount", "Scope"], ...data.exportRows.map((row) => [row.date, row.title, row.category, row.amount.toFixed(2), row.scope])];
    const blob = new Blob(["\uFEFF" + lines.map((line) => line.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = `family-money-report-${data.from}-${data.to}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  return (
    <main className="mobile-filter-page space-y-5 pb-2">
      <header className="space-y-1">
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{t.reports.title}</h1>
          <button type="button" onClick={exportCsv} className={filterSecondary}><Download size={16} aria-hidden="true" />CSV</button>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t.reports.subtitle}</p>
      </header>

      <ExpenseReportFilters key={JSON.stringify([data.query, data.from, data.to, data.account, data.selectedCategories, data.householdId, data.memberId, data.transactionType, data.granularity])} data={data} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5" aria-labelledby="expense-summary-title">
        <div className="flex items-center justify-between gap-3">
          <h2 id="expense-summary-title" className="text-sm font-semibold text-slate-600 dark:text-slate-300">{th ? "สรุปรายการ" : "Transaction summary"}</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200"><Users size={13} aria-hidden="true" />{scopeLabel}{data.scope === "household" && memberLabel ? " · " + memberLabel : ""}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 sm:grid-cols-3">
          <div className="pr-3 sm:pr-5">
            <p className="text-xs text-slate-500">{totalLabel}</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{formatCurrency(data.summary.total, data.currency)}</p>
          </div>
          <div className="pl-3 sm:px-5">
            <p className="text-xs text-slate-500">{th ? "จำนวนรายการ" : "Transactions"}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-slate-100">{new Intl.NumberFormat(data.locale === "th" ? "th-TH" : "en-US").format(data.summary.count)}</p>
          </div>
          <div className="col-span-2 mt-4 border-t border-slate-200 pt-3 dark:border-slate-700 sm:col-span-1 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
            <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13} aria-hidden="true" />{t.reports.dailyAverage}</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(data.summary.dailyAverage, data.currency)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">{dateRangeLabel}</p>
      </section>

      <ExpenseReportCharts
        trend={data.trend}
        categoryComparison={data.categoryComparison}
        currency={data.currency}
        locale={data.locale}
      />

      {data.summary.count === 0 && (
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <BarChart3 size={16} className="mr-2 inline-block" aria-hidden="true" />{t.reports.emptyHelp}
        </p>
      )}
    </main>
  );
}


