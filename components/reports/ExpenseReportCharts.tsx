"use client";
import dynamic from "next/dynamic";
import { createContext, useContext, type ComponentProps } from "react";
import type Content from "./ExpenseReportChartsContent";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import ChartSkeleton from "@/components/ui/ChartSkeleton";
type Props = ComponentProps<typeof Content>;
function Skeleton({ trend, categoryComparison, currency, locale }: Props) {
  const { t } = useLanguage();
  const count = categoryComparison.length;
  const items = [
    { title: t.reports.trendTitle, detail: currency, height: trend.length ? 244 : 208 },
    { title: t.reports.categoryTitle, detail: count + " " + t.reports.categories.toLowerCase(), height: count ? Math.max(220, count * 38) : 208 },
    { title: locale === "th" ? "สัดส่วนตามหมวดหมู่" : "Share by category", detail: currency, height: count ? 224 : 208 },
  ];
  return <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.25fr_0.85fr]">{items.map((item, index) => <section key={item.title} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5"><div className="mb-3 flex items-baseline justify-between gap-3"><h2 className="text-base font-semibold">{item.title}</h2><span className="text-xs text-slate-500">{item.detail}</span></div>{index === 2 && count > 0 ? <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(120px,0.8fr)]"><ChartSkeleton height={224} /><ul aria-hidden="true" className="space-y-2">{categoryComparison.slice(0, 6).map(category => <li key={category.category} className="h-4 rounded bg-slate-100 dark:bg-slate-800" />)}</ul></div> : <ChartSkeleton height={item.height} />}</section>)}</div>;
}
const LoadingProps = createContext<Props | null>(null);
function LoadingCharts() {
  const props = useContext(LoadingProps);
  return props ? <Skeleton {...props} /> : null;
}
const Charts = dynamic(() => import("./ExpenseReportChartsContent"), { ssr: false, loading: LoadingCharts });
export default function ExpenseReportCharts(props: Props) {
  return <LoadingProps.Provider value={props}><Charts {...props} /></LoadingProps.Provider>;
}
