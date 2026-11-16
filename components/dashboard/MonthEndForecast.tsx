import type { MonthEndForecastResult } from "@/services/cashForecast";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function MonthEndForecast({ result, currency, locale }: { result: MonthEndForecastResult; currency: string; locale: "en" | "th" }) {
  const th = locale === "th";
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900" aria-labelledby="month-end-forecast-title">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 id="month-end-forecast-title" className="text-base font-semibold text-slate-900 dark:text-white">{th ? "คาดการณ์สิ้นเดือน" : "Month-end estimate"}</h2><p className="mt-1 text-xs text-slate-500">{th ? "ประมาณการจากข้อมูลที่บันทึกในแอปนี้" : "Estimated from records in this app"}</p></div><strong className="text-xl tabular-nums text-slate-900 dark:text-white">{formatCurrency(result.estimate, currency)}</strong></div>
    <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4"><Value label={th ? "ยอดเงินสดที่บันทึก" : "Recorded cash"} value={result.currentBalance} currency={currency}/><Value label={th ? "รายรับประจำที่เหลือ" : "Scheduled income"} value={result.scheduledIncome} currency={currency} positive/><Value label={th ? "รายจ่ายประจำที่เหลือ" : "Scheduled expenses"} value={result.scheduledExpense} currency={currency}/><Value label={th ? "กระแสเงินสดผันแปร" : "Variable estimate"} value={result.variableIncomeEstimate-result.variableExpenseEstimate} currency={currency}/></div>
    {!result.variableEstimateAvailable && <p className="mt-3 text-xs text-amber-700 dark:text-amber-300">{th ? "มีข้อมูลไม่พอสำหรับคาดการณ์รายรับรายจ่ายทั่วไป จึงแสดงเฉพาะรายการประจำที่ทราบ" : "More records are needed to estimate variable cash flow; only known recurring items are included."}</p>}
    <details className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800"><summary className="cursor-pointer font-medium text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:text-slate-200">{th ? "คำนวณอย่างไร" : "How this is estimated"}</summary><p className="mt-2">{th ? `ยอดเงินสดที่บันทึก + รายรับประจำที่ยังไม่จ่าย − รายจ่ายประจำที่ยังไม่จ่าย ${result.variableEstimateAvailable ? "+/− ค่าเฉลี่ยรายวันของรายการที่ไม่ประจำ × ${result.daysRemaining} วันที่เหลือ" : ""} ไม่รวมยอดธนาคาร/เงินสดที่ไม่เคยบันทึก หรือภาระที่ยังไม่ได้เพิ่ม` : `Recorded cash + unpaid recurring income − unpaid recurring expenses ${result.variableEstimateAvailable ? `+/− month-to-date daily average × ${result.daysRemaining} remaining days` : ""}. Excludes unrecorded cash, bank accounts, and obligations.`}</p></details>
  </section>;
}

function Value({ label, value, currency, positive = false }: { label: string; value: number; currency: string; positive?: boolean }) {
  return <div><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-medium tabular-nums ${positive ? "text-emerald-700 dark:text-emerald-300" : "text-slate-900 dark:text-slate-100"}`}>{formatCurrency(value, currency)}</p></div>;
}
