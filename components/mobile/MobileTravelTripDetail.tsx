"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, CalendarDays, Check, Clock3, RefreshCw } from "lucide-react";
import type { Transaction, TravelTrip } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import TripSettlementPanel from "./TripSettlementPanel";

function money(value: number, currency: string, locale: "th" | "en") {
  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { style: "currency", currency }).format(value);
}

function dateLabel(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`));
}

function bangkokToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default function MobileTravelTripDetail({ trip: initialTrip, transactions: initialTransactions, availableTransactions, accountCurrency, accounts }: {
  trip: TravelTrip;
  transactions: Transaction[];
  availableTransactions: Transaction[];
  accountCurrency: string;
  accounts: { id: string; name: string; group: string }[];
}) {
  const { locale, t } = useLanguage();
  const copy = t.mobile.travel;
  const [trip, setTrip] = useState(initialTrip);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [selected, setSelected] = useState(new Set<string>());
  const [viewCurrency, setViewCurrency] = useState<"trip" | "THB">("trip");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const totalThb = transactions.reduce((sum, item) => sum + Number(item.travel_amount_thb ?? item.amount), 0);
  const totalLocal = transactions.reduce((sum, item) => sum + Number(item.travel_original_amount ?? Number(item.amount) / Number(item.travel_exchange_rate_to_thb || trip.exchange_rate_to_thb)), 0);
  const categories = new Map<string, number>();
  for (const item of transactions) {
    const value = viewCurrency === "THB"
      ? Number(item.travel_amount_thb ?? item.amount)
      : Number(item.travel_original_amount ?? Number(item.amount) / Number(item.travel_exchange_rate_to_thb || trip.exchange_rate_to_thb));
    categories.set(item.category, (categories.get(item.category) ?? 0) + value);
  }

  async function toggleTrip() {
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/travel/trips/${trip.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !trip.is_active }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || copy.toggleFailed);
      setTrip(data.trip as TravelTrip);
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  async function attachSelected() {
    const ids = [...selected];
    if (!ids.length) return;
    setBusy(true); setError(""); setNotice("");
    try {
      const response = await fetch(`/api/travel/trips/${trip.id}/transactions`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transaction_ids: ids }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || copy.linkFailed);
      const conversionById = new Map<string, { travel_amount_thb: number; travel_original_amount: number; travel_original_currency: string; travel_exchange_rate_to_thb: number; travel_exchange_rate_date: string }>(
        (data.transactions ?? []).map((item: { id: string; travel_amount_thb: number; travel_original_amount: number; travel_original_currency: string; travel_exchange_rate_to_thb: number; travel_exchange_rate_date: string }) => [item.id, item]),
      );
      const linked = availableTransactions.filter((item) => selected.has(item.id)).map((item) => ({ ...item, travel_trip_id: trip.id, ...conversionById.get(item.id) }));
      setTransactions((current) => [...linked, ...current]);
      setSelected(new Set());
      setNotice(copy.added.replace("{count}", String(data.linked)));
    } catch (caught) { setError((caught as Error).message); }
    finally { setBusy(false); }
  }

  const scheduledWaiting = trip.activation_mode === "scheduled" && trip.is_active && trip.start_date > bangkokToday();
  const scheduleEnded = trip.activation_mode === "scheduled" && trip.end_date < bangkokToday();
  return (
    <main className="space-y-6">
      <header className="space-y-4">
        <Link href="/mobile/travel" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-mobile-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600"><ArrowLeft size={17} />{copy.allTrips}</Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="break-words">{trip.name}</h1>
            <p className="mt-1 text-sm text-mobile-muted">{trip.destination} · {trip.currency}</p>
          </div>
          <button onClick={toggleTrip} disabled={busy || scheduledWaiting || scheduleEnded} className="min-h-10 shrink-0 rounded-full bg-mobile-surface-muted px-3 text-xs font-semibold disabled:opacity-50">
            {trip.is_active && !scheduledWaiting ? copy.closeTrip : scheduledWaiting ? copy.openScheduled : scheduleEnded ? copy.ended : trip.activation_mode === "scheduled" ? copy.openScheduled : copy.openTrip}
          </button>
        </div>
        <p className="flex items-center gap-2 text-sm text-mobile-muted"><CalendarDays size={16} />{dateLabel(trip.start_date, locale)} – {dateLabel(trip.end_date, locale)} {trip.activation_mode === "scheduled" && <><Clock3 size={15} />{copy.automatic}</>}</p>
      </header>

      <section className="border-y border-mobile-border py-4" aria-label={copy.summary}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">{copy.totalSpending}</h2>
          <div className="flex rounded-full bg-mobile-surface-muted p-1" aria-label={copy.chooseCurrency}>
            <button onClick={() => setViewCurrency("trip")} aria-pressed={viewCurrency === "trip"} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewCurrency === "trip" ? "bg-mobile-surface text-mobile-ink shadow-sm" : "text-mobile-muted"}`}>{trip.currency}</button>
            <button onClick={() => setViewCurrency("THB")} aria-pressed={viewCurrency === "THB"} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${viewCurrency === "THB" ? "bg-mobile-surface text-mobile-ink shadow-sm" : "text-mobile-muted"}`}>THB</button>
          </div>
        </div>
        <p className="text-2xl font-bold tabular-nums">{money(viewCurrency === "THB" ? totalThb : totalLocal, viewCurrency === "THB" ? "THB" : trip.currency, locale)}</p>
        <p className="mt-1 text-xs text-mobile-muted">{copy.exchangeHistory.replace("{count}", String(transactions.length))}</p>
        <div className="mt-4 divide-y divide-mobile-border">
          {[...categories.entries()].sort((a, b) => b[1] - a[1]).map(([category, amount]) => <div key={category} className="flex justify-between gap-3 py-2.5 text-sm"><span>{category}</span><span className="font-medium tabular-nums">{money(amount, viewCurrency === "THB" ? "THB" : trip.currency, locale)}</span></div>)}
          {categories.size === 0 && <p className="py-3 text-sm text-mobile-muted">{copy.noSpending}</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">{copy.transactions} <span className="font-normal text-mobile-muted">{transactions.length}</span></h2>
        <div className="divide-y divide-mobile-border border-y border-mobile-border">
          {transactions.map((item) => <article key={item.id} className="flex justify-between gap-3 py-3">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-xs text-mobile-muted">{item.category} · {dateLabel(item.date, locale)}</p></div>
            <div className="shrink-0 text-right"><p className="text-sm font-semibold tabular-nums">{money(Number(item.travel_original_amount ?? item.amount), item.travel_original_currency ?? accountCurrency, locale)}</p><p className="mt-1 text-xs text-mobile-muted">{money(Number(item.travel_amount_thb ?? item.amount), "THB", locale)}</p></div>
          </article>)}
          {transactions.length === 0 && <p className="py-4 text-sm text-mobile-muted">{copy.newTransactionsHelp}</p>}
        </div>
      </section>

      <TripSettlementPanel trip={trip} accounts={accounts} expenses={transactions.filter(item => item.type === "expense" && (item.travel_amount_thb != null || accountCurrency === "THB")).map(item => ({
        id: item.id, title: item.title, cents: Math.round(Number(item.travel_amount_thb ?? item.amount) * 100),
      }))} />

      <section className="space-y-3">
        <div><h2 className="font-semibold">{copy.linkPast}</h2><p className="mt-1 text-sm text-mobile-muted">{copy.linkPastHelp}</p></div>
        {availableTransactions.length === 0 ? <p className="border-y border-mobile-border py-4 text-sm text-mobile-muted">{copy.noUnlinked}</p> : <>
          <div className="divide-y divide-mobile-border border-y border-mobile-border">
            {availableTransactions.map((item) => <label key={item.id} className="flex min-h-14 items-center gap-3 py-3">
              <input type="checkbox" checked={selected.has(item.id)} onChange={(event) => setSelected((current) => { const next = new Set(current); if (event.target.checked) next.add(item.id); else next.delete(item.id); return next; })} className="h-5 w-5 shrink-0 accent-emerald-600" />
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-1 block text-xs text-mobile-muted">{item.category} · {dateLabel(item.date, locale)}</span></span>
              <span className="shrink-0 text-sm font-medium tabular-nums">{money(Number(item.amount), accountCurrency, locale)}</span>
            </label>)}
          </div>
          <button onClick={attachSelected} disabled={busy || selected.size === 0} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50"><Check size={18} />{busy ? copy.adding : copy.addSelected.replace("{count}", String(selected.size))}</button>
        </>}
      </section>
      {notice && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><RefreshCw size={15} />{notice}</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </main>
  );
}
