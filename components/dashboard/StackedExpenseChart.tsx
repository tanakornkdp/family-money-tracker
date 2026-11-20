"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type Content from "./StackedExpenseChartContent";
import ChartSkeleton from "@/components/ui/ChartSkeleton";
const Chart = dynamic(() => import("./StackedExpenseChartContent"), { ssr: false, loading: () => <ChartSkeleton height={380} /> });
export default function StackedExpenseChart(props: ComponentProps<typeof Content>) {
  if (props.data.length === 0 || props.categories.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">{props.emptyLabel}</p>;
  return <Chart {...props} />;
}
