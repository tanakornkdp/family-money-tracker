"use client";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";

import {
  Bar,
  Cell,
  BarChart,
  Pie,
  PieChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ExpenseReportData } from "@/services/expenseReports";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const categoryColors = ["#0f766e", "#e56b4f", "#5869a7", "#ba8d1f", "#9a5b8a", "#347b9b", "#718b41", "#bb6c30"];

function compactNumber(value: number, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: readonly { value?: number | string; name?: string }[];
  label?: string;
  currency: string;
  locale: "th" | "en";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-lg dark:border-slate-700 dark:bg-slate-900">
      <p className="mb-1 font-medium text-slate-700 dark:text-slate-200">{label}</p>
      <p className="font-semibold tabular-nums text-slate-950 dark:text-white">{new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { style: "currency", currency }).format(Number(payload[0].value ?? 0))}</p>
    </div>
  );
}

export default function ExpenseReportCharts({
  trend,
  categoryComparison,
  currency,
  locale,
}: Pick<ExpenseReportData, "trend" | "categoryComparison" | "currency" | "locale">) {
  const reducedMotion = useReducedMotion();
  const { t } = useLanguage();
  const trendWidth = Math.max(360, trend.length * 48);
  const categoryWidth = Math.max(360, categoryComparison.length * 42);
  const categoryHeight = Math.max(220, categoryComparison.length * 38);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.85fr]">
      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{t.reports.trendTitle}</h2>
          <span className="text-xs text-slate-500">{currency}</span>
        </div>
        {trend.length === 0 ? (
          <p className="flex min-h-52 items-center justify-center text-sm text-slate-500">{locale === "th" ? "ไม่มีรายการในช่วงนี้" : "No transactions in this period."}</p>
        ) : (
          <div className="overflow-x-auto" role="region" aria-label={t.reports.trendTitle} tabIndex={0}>
            <div style={{ width: trendWidth, height: 244 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} minTickGap={16} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => compactNumber(Number(value), locale)} width={48} />
                  <Tooltip content={(props) => <ChartTooltip {...(props as object)} currency={currency} locale={locale} />} />
                  <Line isAnimationActive={!reducedMotion} animationDuration={180} type="monotone" dataKey="amount" name={locale === "th" ? "ยอดรวม" : "Total amount"} stroke="#0f766e" strokeWidth={2.5} dot={trend.length < 32 ? { r: 3, fill: "#0f766e", strokeWidth: 0 } : false} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">{t.reports.categoryTitle}</h2>
          <span className="text-xs text-slate-500">{categoryComparison.length} {t.reports.categories.toLowerCase()}</span>
        </div>
        {categoryComparison.length === 0 ? (
          <p className="flex min-h-52 items-center justify-center text-sm text-slate-500">{locale === "th" ? "ไม่มีรายการในช่วงนี้" : "No transactions in this period."}</p>
        ) : (
          <div className="overflow-x-auto" role="region" aria-label={t.reports.categoryTitle} tabIndex={0}>
            <div style={{ width: categoryWidth, height: categoryHeight }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparison} layout="vertical" margin={{ top: 2, right: 14, bottom: 0, left: 0 }}>
                  <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 4" />
                  <XAxis type="number" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(value) => compactNumber(Number(value), locale)} />
                  <YAxis type="category" dataKey="category" width={112} tickLine={false} axisLine={false} tick={{ fill: "#475569", fontSize: 11 }} />
                  <Tooltip content={(props) => <ChartTooltip {...(props as object)} currency={currency} locale={locale} />} />
                  <Bar isAnimationActive={!reducedMotion} animationDuration={180} dataKey="amount" name={locale === "th" ? "ยอดรวม" : "Total amount"} radius={[0, 5, 5, 0]} maxBarSize={22}>
                    {categoryComparison.map((item, index) => (
                      <Cell key={item.category} fill={categoryColors[index % categoryColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-base font-semibold">{locale === "th" ? "สัดส่วนตามหมวดหมู่" : "Share by category"}</h2><span className="text-xs text-slate-500">{currency}</span></div>
        {categoryComparison.length === 0 ? <p className="flex min-h-52 items-center justify-center text-sm text-slate-500">{locale === "th" ? "ไม่มีรายการในช่วงนี้" : "No transactions in this period."}</p> : <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.8fr)]"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie isAnimationActive={!reducedMotion} animationDuration={180} data={categoryComparison} dataKey="amount" nameKey="category" innerRadius="52%" outerRadius="78%" paddingAngle={2}>{categoryComparison.map((item, index) => <Cell key={`pie-${item.category}`} fill={categoryColors[index % categoryColors.length]} />)}</Pie><Tooltip content={(props) => <ChartTooltip {...(props as object)} currency={currency} locale={locale} />} /></PieChart></ResponsiveContainer></div><ul className="space-y-2 text-xs">{categoryComparison.slice(0, 6).map((item, index) => <li key={`legend-${item.category}`} className="flex items-center justify-between gap-2"><span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: categoryColors[index % categoryColors.length] }} /><span className="truncate">{item.category}</span></span><span className="tabular-nums text-slate-500">{formatCompact(item.amount, currency, locale)}</span></li>)}</ul></div>}
      </section>
    </div>
  );
}

function formatCompact(value: number, currency: string, locale: "th" | "en") { return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }).format(Number(value)); }
