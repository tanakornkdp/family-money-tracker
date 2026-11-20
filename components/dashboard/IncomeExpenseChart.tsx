"use client";
import dynamic from "next/dynamic";
import type { ComponentProps } from "react";
import type Content from "./IncomeExpenseChartContent";
import ChartSkeleton from "@/components/ui/ChartSkeleton";
const Chart = dynamic(() => import("./IncomeExpenseChartContent"), { ssr: false, loading: () => <ChartSkeleton height={300} /> });
export default function IncomeExpenseChart(props: ComponentProps<typeof Content>) {
  return <Chart {...props} />;
}
