import Link from "next/link";
import type { Transaction, TravelTrip } from "@/types";
import type { RecurringBill } from "@/services/recurringBills";
import { getUpcomingOccurrences } from "@/services/recurringBills";
import { getCurrentlyActiveTrips } from "@/services/travelTrips";
import AnimatedCurrency from "@/components/ui/AnimatedCurrency";

function dateAfter(days: number) { const value = new Date(); value.setDate(value.getDate() + days); return value.toISOString().slice(0, 10); }

export default function MobileDashboardInsights({ transactions, recurringItems, trips, currency, locale, visible = ["categories", "bills", "trips"] }: { transactions: Transaction[]; recurringItems: RecurringBill[]; trips: TravelTrip[]; currency: string; locale: "th" | "en"; visible?: string[] }) {
  const th = locale === "th";
  const totals = new Map<string, number>();
  transactions.filter((item) => item.type === "expense").forEach((item) => totals.set(item.category, (totals.get(item.category) ?? 0) + Number(item.amount)));
  const categories = [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const start = new Date().toISOString().slice(0, 10); const end = dateAfter(31);
  const bills = getUpcomingOccurrences(recurringItems, start, end).filter(({ bill }) => bill.type === "expense").slice(0, 3);
  const activeTrips = getCurrentlyActiveTrips(trips);
  const shownTrips = activeTrips.length ? activeTrips : trips.slice(0, 3);
  return <>
    {visible.includes("categories") && <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-bold">{th ? "หมวดหมู่ยอดนิยม" : "Top categories"}</h2><Link href="/mobile/reports" className="text-sm font-semibold text-emerald-700">{th ? "ดูรายงาน" : "View reports"}</Link></div><div className="mt-3 grid grid-cols-2 gap-2">{categories.length ? categories.map(([category, amount]) => <div key={category} className="rounded-2xl bg-mobile-surface-muted p-3"><p className="truncate text-sm font-semibold">{category}</p><p className="mt-1 text-xs text-mobile-muted">{<AnimatedCurrency amount={amount} currency={currency} />}</p></div>) : <p className="col-span-2 py-3 text-sm text-mobile-muted">{th ? "เริ่มบันทึกรายการเพื่อดูหมวดหมู่" : "Add a transaction to see categories."}</p>}</div></section>}
    <section className="grid gap-3 sm:grid-cols-2">{visible.includes("bills") && bills.length > 0 && <Link href="/mobile/review" className="rounded-3xl bg-amber-50 p-4 text-amber-950 shadow-sm dark:bg-amber-950 dark:text-amber-100"><p className="text-sm font-bold">{th ? "บิลใกล้ครบกำหนด" : "Upcoming bills"}</p><p className="mt-1 text-xs">{bills.map(({ bill }) => bill.name).join(" · ")}</p></Link>}{visible.includes("trips") && shownTrips.length > 0 && <Link href="/mobile/travel" className="rounded-3xl bg-sky-50 p-4 text-sky-950 shadow-sm dark:bg-sky-950 dark:text-sky-100"><p className="text-sm font-bold">{activeTrips.length ? (th ? "ทริปที่กำลังใช้งาน" : "Active trips") : (th ? "ทริปล่าสุด" : "Recent trips")}</p><p className="mt-1 text-xs">{shownTrips.map((trip) => trip.name).join(" · ")}</p></Link>}</section>
  </>;
}
