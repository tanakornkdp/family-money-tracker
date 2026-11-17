import type { MonthEndForecastResult } from "@/services/cashForecast";
import MonthEndForecast from "@/components/dashboard/MonthEndForecast";

export default function MobileMonthEndForecast(props: { result: MonthEndForecastResult; currency: string; locale: "en" | "th" }) {
  return <MonthEndForecast {...props} animated />;
}
