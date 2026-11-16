"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Check, CircleAlert, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getRecurringBills, getUpcomingOccurrences, type RecurringBill } from "@/services/recurringBills";
import { getReachedBudgetAlertLevels } from "@/services/budgetPlans";
import { toDateInputValue } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type Notice = { id: string; kind: "budget" | "bill" | "duplicate" | "receipt" | "transfer" | "invite"; dedupe_key: string; title: string; detail: string; href: string; created_at: string; read_at: string | null };
const daysFromToday = (days: number) => { const date = new Date(); date.setDate(date.getDate() + days); return toDateInputValue(date); };

export default function NotificationCenter({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const { locale, t } = useLanguage();
  const copy = t.mobile.notifications;
  const [supabase] = useState(() => createClient());
  const pathname = usePathname();
  const mobile = pathname.startsWith("/mobile");
  const [items, setItems] = useState<Notice[]>([]);
  const [pending, setPending] = useState<Notice[]>([]);
  const [storedUnread, setStoredUnread] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState("");
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const unread = storedUnread + pending.length;
  const notices = [...pending, ...items.filter(item => !item.read_at)];
  const prefix = mobile ? "/mobile" : "";

  const refresh = useCallback(async () => {
    const now = toDateInputValue();
    const [stored, planResult, bills, receipts, transfers, auth, ownTransactions] = await Promise.all([
      supabase.from("user_notifications").select("*").eq("user_id", userId).neq("kind", "duplicate").order("created_at", { ascending: false }).limit(30),
      supabase.from("budget_plans").select("id,user_id,household_id,name,total_amount,start_date,end_date,category,travel_trip_id,alert_threshold,alert_thresholds"),
      getRecurringBills(supabase, userId).catch(() => [] as RecurringBill[]),
      supabase.from("receipts").select("id,parsed_merchant,created_at").eq("user_id", userId).is("transaction_id", null).in("status", ["pending", "processed"]),
      supabase.from("trip_transfers").select("id,trip_name,amount,created_at").eq("recipient", userId).is("confirmed_at", null),
      supabase.auth.getUser(),
      supabase.from("transactions").select("title,amount,date").eq("user_id", userId).order("date", { ascending: false }),
    ]);
    const email = auth.data.user?.email;
    const invites = email ? await supabase.from("household_invites").select("id,created_at").eq("email", email.toLowerCase()).eq("status", "pending") : null;
    const grouped = new Map<string, { title: string; date: string; amount: number; count: number }>();
    for (const row of ownTransactions.data ?? []) {
      const key = `${row.date}|${row.title.trim().toLowerCase()}|${Number(row.amount).toFixed(2)}`;
      const previous = grouped.get(key);
      grouped.set(key, { ...row, count: (previous?.count ?? 0) + 1 });
    }
    setPending([
      ...[...grouped].filter(([key, row]) => row.count > 1 && !localStorage.getItem("finance:duplicate:" + userId + ":" + key + "|" + row.count)).map(([key, row]) => ({ id: key, kind: "duplicate" as const, dedupe_key: "review:" + key, title: copy.possibleDuplicate, detail: copy.duplicateDetail.replace("{title}", row.title).replace("{count}", String(row.count)).replace("{date}", row.date), href: "/mobile/review#duplicates", created_at: row.date, read_at: null })),
      ...(receipts.data ?? []).map(row => ({ ...row, kind: "receipt" as const, dedupe_key: "receipt:" + row.id, title: copy.receiptPending, detail: row.parsed_merchant || copy.newReceipt, href: prefix + "/receipts#receipt-" + encodeURIComponent(row.id), read_at: null })),
      ...(transfers.data ?? []).map(row => ({ ...row, kind: "transfer" as const, dedupe_key: "transfer:" + row.id, title: copy.transferPending, detail: copy.amountBaht.replace("{name}", row.trip_name).replace("{amount}", Number(row.amount).toLocaleString(locale === "en" ? "en-US" : "th-TH")), href: "/mobile/travel", read_at: null })),
      ...(invites?.data ?? []).map(row => ({ ...row, kind: "invite" as const, dedupe_key: "invite:" + row.id, title: copy.groupInvite, detail: copy.groupInviteDetail, href: prefix + "/household", read_at: null })),
    ]);
    if (stored.error) { setAvailable(false); return; }
    setAvailable(true);
    const candidates: Omit<Notice, "id" | "created_at" | "read_at">[] = [];
    const firstPlanDate = (planResult.data ?? []).map((plan) => plan.start_date).sort()[0] ?? daysFromToday(-2);
    const { data: transactions } = await supabase.from("transactions").select("id,user_id,household_id,title,amount,type,category,date,travel_trip_id").gte("date", firstPlanDate < daysFromToday(-2) ? firstPlanDate : daysFromToday(-2)).lte("date", now).order("date", { ascending: false }).limit(5000);
    const visibleTransactions = transactions ?? [];
    for (const plan of planResult.data ?? []) {
      const spent = visibleTransactions.filter((tx) => tx.type === "expense" && tx.date >= plan.start_date && tx.date <= now && tx.date <= plan.end_date && (plan.household_id ? tx.household_id === plan.household_id : tx.user_id === userId && !tx.household_id) && (!plan.category || tx.category === plan.category) && (!plan.travel_trip_id || tx.travel_trip_id === plan.travel_trip_id)).reduce((sum, tx) => sum + Number(tx.amount), 0);
      const percent = Number(plan.total_amount) > 0 ? spent / Number(plan.total_amount) * 100 : 0;
      const configuredLevels = Array.isArray(plan.alert_thresholds) ? plan.alert_thresholds : [Number(plan.alert_threshold) || 80];
      for (const threshold of getReachedBudgetAlertLevels(percent, configuredLevels)) {
        candidates.push({ kind: "budget", dedupe_key: "budget:" + plan.id + ":threshold:" + threshold, title: copy.budgetThreshold.replace("{threshold}", String(threshold)).replace("{name}", plan.name), detail: copy.budgetSpent.replace("{percent}", percent.toFixed(0)), href: mobile ? "/mobile/budget" : "/budget" });
      }
      if (percent >= 100) candidates.push({ kind: "budget", dedupe_key: `budget:${plan.id}:over`, title: copy.overBudget.replace("{name}", plan.name), detail: copy.budgetSpent.replace("{percent}", percent.toFixed(0)), href: mobile ? "/mobile/budget" : "/budget" });
    }
    const upcoming = getUpcomingOccurrences(bills, now, daysFromToday(14)).filter(({ bill }) => bill.type === "expense");
    for (const occurrence of upcoming) candidates.push({ kind: "bill", dedupe_key: `bill:${occurrence.bill.id}:${occurrence.date}`, title: copy.billDue.replace("{name}", occurrence.bill.name), detail: copy.amountBaht.replace("{name}", occurrence.date).replace("{amount}", Number(occurrence.bill.amount).toLocaleString(locale === "en" ? "en-US" : "th-TH")), href: mobile ? "/mobile/recurring-bills" : "/recurring-bills" });
    const unseen = candidates.filter((item) => !stored.data?.some((old) => old.dedupe_key === item.dedupe_key));
    if (unseen.length) await supabase.from("user_notifications").upsert(unseen.map((item) => ({ ...item, user_id: userId })), { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    const [result, unreadResult] = await Promise.all([
      supabase.from("user_notifications").select("*").eq("user_id", userId).neq("kind", "duplicate").order("created_at", { ascending: false }).limit(30),
      supabase.from("user_notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).neq("kind", "duplicate").is("read_at", null),
    ]);
    if (!result.error) setItems((result.data ?? []) as Notice[]);
    if (!unreadResult.error) setStoredUnread(unreadResult.count ?? result.data?.filter(item => !item.read_at).length ?? 0);
  }, [copy, locale, mobile, prefix, supabase, userId]);

  useEffect(() => {
    const update = () => { void refresh(); };
    queueMicrotask(update);
    window.addEventListener("finance:review-updated", update);
    return () => window.removeEventListener("finance:review-updated", update);
  }, [refresh, pathname]);

  const markRead = async (item: Notice) => {
    const { data, error } = await supabase.from("user_notifications").update({ read_at: new Date().toISOString() }).eq("id", item.id).eq("user_id", userId).is("read_at", null).select("id");
    if (error || !data?.length) return;
    setStoredUnread(count => Math.max(0, count - 1));
    setItems((current) => current.map((notice) => notice.id === item.id ? { ...notice, read_at: new Date().toISOString() } : notice));
  };

  const confirmTransfer = async (item: Notice) => {
    setWorking(true);
    setActionError("");
    try {
      const { error } = await supabase.rpc("confirm_trip_transfer", { request_id: item.id });
      if (error) throw error;
      setPending(current => current.filter(notice => notice.dedupe_key !== item.dedupe_key));
      setSelected(null);
    } catch {
      setActionError(copy.confirmFailed);
    } finally { setWorking(false); }
  };

  const localizeStoredNotice = (item: Notice) => {
    if (locale !== "en") return { title: item.title, detail: item.detail };
    if (item.kind === "budget") {
      const name = item.title.replace(/^(?:งบถึง\s*\d+%|Budget reached\s*\d+%|เกินงบ|Over budget)\s*:\s*/i, "");
      const percent = item.detail.match(/\d+(?:\.\d+)?/)?.[0] ?? "0";
      const threshold = item.dedupe_key.match(/:threshold:(\d+)/)?.[1];
      return {
        title: threshold ? copy.budgetThreshold.replace("{threshold}", threshold).replace("{name}", name) : copy.overBudget.replace("{name}", name),
        detail: copy.budgetSpent.replace("{percent}", percent),
      };
    }
    if (item.kind === "bill") {
      const name = item.title.replace(/^(?:บิลใกล้ครบกำหนด|Bill due soon)\s*:\s*/i, "");
      return { title: copy.billDue.replace("{name}", name), detail: item.detail.replace(/\s*บาท\s*$/, " baht") };
    }
    return { title: item.title, detail: item.detail };
  };

  return <div className="relative">
    <button type="button" onClick={() => { if (!open) void refresh(); setOpen(!open); }} aria-label={`${copy.title}${unread ? ` ${copy.unreadLabel.replace("{count}", String(unread))}` : ""}`} aria-expanded={open} className={`${compact ? "h-10 w-10" : "h-9 w-9"} relative inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300`}>
      <Bell size={18} aria-hidden="true" />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
    </button>
    {open && <div role="dialog" aria-label={copy.title} className={`${mobile ? "fixed inset-x-3 top-[calc(env(safe-area-inset-top)_+_4.25rem)] max-h-[calc(100dvh_-_6rem_-_env(safe-area-inset-top))] overflow-y-auto overscroll-contain" : "absolute right-0 top-full mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden"} z-[70] rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900`}>
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800"><p className="font-semibold text-slate-900 dark:text-white">{copy.title} {unread > 0 && <span className="text-xs font-normal text-slate-500">· {copy.newCount.replace("{count}", String(unread))}</span>}</p><button onClick={() => setOpen(false)} aria-label={copy.close} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={16}/></button></div>
      {!available && <p role="status" className="px-4 py-2 text-xs text-slate-500">{copy.unavailable}</p>}
      {notices.length === 0 ? <p className="p-5 text-center text-sm text-slate-500">{copy.empty}</p> : (
        <ul className={`${mobile ? "" : "max-h-[min(65vh,28rem)]"} divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800`}>
          {notices.map(item => {
            const display = localizeStoredNotice(item);
            const storedNotice = item.kind === "budget" || item.kind === "bill";
            const planId = item.kind === "budget" ? /^budget:([^:]+):/.exec(item.dedupe_key)?.[1] : undefined;
            const href = item.kind === "budget" ? prefix + "/budget" + (planId ? "?plan=" + encodeURIComponent(planId) : "") :
              item.kind === "bill" ? prefix + "/recurring-bills" :
              item.href;
            return <li key={item.dedupe_key} className={!item.read_at ? "bg-indigo-50/70 dark:bg-indigo-950/20" : ""}>
              <div className="flex items-start gap-3 px-4 py-3">
                <CircleAlert size={17} aria-hidden="true" className="mt-0.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1 break-words">
                  {item.kind === "transfer" ? <button type="button" aria-expanded={selected === item.id} onClick={() => { setSelected(selected === item.id ? null : item.id); setActionError(""); }} className="block text-left text-sm font-semibold hover:underline">{display.title}</button> :
                    <Link href={href} onClick={() => { if (storedNotice && !item.read_at) void markRead(item); setOpen(false); }} className="block text-sm font-semibold hover:underline">{display.title}</Link>}
                  <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{display.detail}</p>
                  {item.kind === "transfer" && selected === item.id && <div className="mt-3 space-y-2">
                    <button type="button" disabled={working} onClick={() => void confirmTransfer(item)} className="min-h-10 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white disabled:opacity-50">{working ? copy.confirming : copy.received}</button>
                    <Link href={href} onClick={() => setOpen(false)} className="ml-3 text-xs underline">{copy.openTravel}</Link>
                    {actionError && <p role="alert" className="text-xs text-rose-700 dark:text-rose-300">{actionError}</p>}
                  </div>}
                </div>
                {storedNotice && !item.read_at && <button type="button" aria-label={copy.markRead} onClick={() => void markRead(item)} className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 hover:bg-white dark:hover:bg-slate-800"><Check size={15}/></button>}
              </div>
            </li>;
          })}
        </ul>
      )}
    </div>}
  </div>;
}
