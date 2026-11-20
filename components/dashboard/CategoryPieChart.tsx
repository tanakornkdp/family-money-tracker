"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type Content from "./CategoryPieChartContent";
import ChartSkeleton from "@/components/ui/ChartSkeleton";
const Chart = dynamic(() => import("./CategoryPieChartContent"), { ssr: false, loading: () => <ChartSkeleton height={280} /> });
export default function CategoryPieChart(props: ComponentProps<typeof Content>) {
  if (props.data.length === 0) return <p className="text-sm text-slate-500 dark:text-slate-400">{props.emptyLabel}</p>;
  return <Chart {...props} />;
}
