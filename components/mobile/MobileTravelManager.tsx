"use client";

import CalendarDateInput from "@/components/ui/CalendarDateInput";
import AnimatedSelect from "@/components/ui/AnimatedSelect";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarDays, ChevronRight, Clock3, MapPin, Plane, Plus, Radio, X } from "lucide-react";
import type { TravelTrip } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const destinations = [
  ["Japan", "JP", "JPY"], ["South Korea", "KR", "KRW"], ["Taiwan", "TW", "TWD"],
  ["Hong Kong", "HK", "HKD"], ["Singapore", "SG", "SGD"], ["Malaysia", "MY", "MYR"],
  ["Indonesia", "ID", "IDR"], ["Vietnam", "VN", "VND"], ["Thailand", "TH", "THB"],
  ["United States", "US", "USD"], ["United Kingdom", "GB", "GBP"], ["France", "FR", "EUR"],
  ["Germany", "DE", "EUR"], ["Italy", "IT", "EUR"], ["Spain", "ES", "EUR"],
  ["Australia", "AU", "AUD"], ["Canada", "CA", "CAD"], ["China", "CN", "CNY"],
] as const;
const currencies = ["THB", "JPY", "KRW", "TWD", "HKD", "SGD", "MYR", "IDR", "VND", "USD", "GBP", "EUR", "AUD", "CAD", "CNY"];

function todayValue() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function dateLabel(value: string, locale: "th" | "en") {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(new Date(`${value}T00:00:00+07:00`));
}

function isActive(trip: TravelTrip, today: string) {
  return trip.is_active && (trip.activation_mode === "manual" || (trip.start_date <= today && today <= trip.end_date));
}

export default function MobileTravelManager({ initialTrips, activeTripIds }: { initialTrips: TravelTrip[]; activeTripIds: string[] }) {
  const router = useRouter();
  const { locale, t } = useLanguage();
  const copy = t.mobile.travel;
  const [trips, setTrips] = useState(initialTrips);
  const [activeIds, setActiveIds] = useState(new Set(activeTripIds));
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [destination, setDestination] = useState("Japan");
  const [currency, setCurrency] = useState("JPY");
  const [startDate, setStartDate] = useState(todayValue);
  const [endDate, setEndDate] = useState(todayValue);
  const [mode, setMode] = useState<"manual" | "scheduled">("manual");
  const [rate, setRate] = useState("");
  const [rateDate, setRateDate] = useState("");
  const today = todayValue();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/travel/rate?currency=${currency}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as { rate: number; date: string };
      })
      .then((data) => {
        if (!cancelled) { setRate(String(data.rate)); setRateDate(data.date); }
      })
      .catch(() => {
        if (!cancelled) { setRate(currency === "THB" ? "1" : ""); setRateDate(""); }
      });
    return () => { cancelled = true; };
  }, [currency]);

  async function createTrip(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/travel/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, destination, currency, start_date: startDate, end_date: endDate, activation_mode: mode, exchange_rate_to_thb: Number(rate) }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || copy.createFailed);
      setTrips((current) => [data.trip as TravelTrip, ...current]);
      setCreating(false);
      setName("");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message || copy.createFailed);
    } finally {
      setSaving(false);
    }
  }

  async function toggleTrip(trip: TravelTrip) {
    setError("");
    try {
      const response = await fetch(`/api/travel/trips/${trip.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !trip.is_active }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || copy.toggleFailed);
      setTrips((current) => current.map((item) => item.id === trip.id ? data.trip as TravelTrip : item));
      setActiveIds((current) => {
        const next = new Set(current);
        if (isActive(data.trip, today)) next.add(trip.id); else next.delete(trip.id);
        return next;
      });
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message || copy.toggleFailed);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1>{copy.title}</h1>
          <p className="mt-1 text-sm text-mobile-muted">{copy.subtitle}</p>
        </div>
        <button onClick={() => { setCreating((value) => !value); setError(""); }} aria-label={creating ? copy.cancelCreate : copy.create} className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
          {creating ? <X size={18} /> : <Plus size={18} />}{creating ? copy.close : copy.create}
        </button>
      </header>

      {activeIds.size > 0 && (
        <section className="rounded-2xl bg-emerald-50 px-4 py-3 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
          <p className="flex items-center gap-2 text-sm font-semibold"><Radio size={16} className="text-emerald-600" />{copy.active}</p>
          <p className="mt-1 text-sm">{trips.filter((trip) => activeIds.has(trip.id)).map((trip) => trip.name).join(" · ")}</p>
        </section>
      )}

      {creating && (
        <form onSubmit={createTrip} className="space-y-4 border-y border-mobile-border py-5">
          <h2 className="text-lg font-semibold">{copy.setup}</h2>
          <label className="block space-y-1.5 text-sm font-medium">{copy.name}
            <input required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder={copy.namePlaceholder} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm font-medium">{copy.destination}
              <AnimatedSelect value={destination} onChange={(event) => { const choice = destinations.find((item) => item[0] === event.target.value); if (choice) { setDestination(choice[0]); setCurrency(choice[2]); } }} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal">
                {destinations.map(([label]) => <option key={label} value={label}>{label}</option>)}
              </AnimatedSelect>
            </label>
            <label className="block space-y-1.5 text-sm font-medium">{copy.currency}
              <AnimatedSelect value={currency} onChange={(event) => setCurrency(event.target.value)} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal">
                {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
              </AnimatedSelect>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1.5 text-sm font-medium">{copy.startDate}
              <CalendarDateInput required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal" />
            </label>
            <label className="block space-y-1.5 text-sm font-medium">{copy.endDate}
              <CalendarDateInput required type="date" min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal" />
            </label>
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{copy.activation}</legend>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setMode("manual")} aria-pressed={mode === "manual"} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${mode === "manual" ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-mobile-border bg-mobile-surface"}`}>{copy.manual}</button>
              <button type="button" onClick={() => setMode("scheduled")} aria-pressed={mode === "scheduled"} className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${mode === "scheduled" ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-mobile-border bg-mobile-surface"}`}>{copy.scheduled}</button>
            </div>
            <p className="text-xs text-mobile-muted">{copy.scheduledHelp}</p>
          </fieldset>
          <label className="block space-y-1.5 text-sm font-medium">{copy.exchangeRate.replace("{currency}", currency)}
            <input required type="number" min="0.000001" step="0.000001" inputMode="decimal" value={rate} onChange={(event) => setRate(event.target.value)} className="min-h-12 w-full rounded-xl border border-mobile-border bg-mobile-surface px-3 text-base font-normal" />
          </label>
          <p className="text-xs text-mobile-muted">{copy.rateSource}{rateDate ? ` · ${rateDate}` : ""}</p>
          {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
          <button disabled={saving || !rate} className="min-h-12 w-full rounded-xl bg-emerald-600 px-4 font-semibold text-white disabled:opacity-50">{saving ? copy.saving : copy.save}</button>
        </form>
      )}

      {error && !creating && <p role="alert" className="text-sm text-rose-600">{error}</p>}

      <section className="space-y-1">
        <h2 className="mb-2 text-base font-semibold">{copy.myTrips} <span className="font-normal text-mobile-muted">{trips.length}</span></h2>
        {trips.length === 0 ? (
          <div className="border-y border-mobile-border py-8 text-center">
            <Plane className="mx-auto mb-3 text-mobile-muted" size={26} />
            <p className="font-semibold">{copy.emptyTitle}</p>
            <p className="mt-1 text-sm text-mobile-muted">{copy.emptyHelp}</p>
          </div>
        ) : trips.map((trip) => {
          const active = activeIds.has(trip.id) || isActive(trip, today);
          const waitingForSchedule = trip.activation_mode === "scheduled" && trip.is_active && trip.start_date > today;
          const scheduleEnded = trip.activation_mode === "scheduled" && trip.end_date < today;
          return (
            <article key={trip.id} className="border-b border-mobile-border py-4 first:border-t">
              <div className="flex items-start justify-between gap-3">
                <Link href={`/mobile/travel/${trip.id}`} className="min-w-0 flex-1 rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600">
                  <p className="truncate font-semibold">{trip.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-mobile-muted"><MapPin size={14} />{trip.destination} · {trip.currency}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-mobile-muted"><CalendarDays size={13} />{dateLabel(trip.start_date, locale)} – {dateLabel(trip.end_date, locale)}</p>
                  {trip.activation_mode === "scheduled" && <p className="mt-1 flex items-center gap-1 text-xs text-mobile-muted"><Clock3 size={13} />{copy.scheduledStatus}</p>}
                </Link>
                <button onClick={() => toggleTrip(trip)} disabled={waitingForSchedule || scheduleEnded} aria-pressed={active} className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:opacity-60 ${active ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200" : "bg-mobile-surface-muted text-mobile-ink"}`}>
                  {active ? copy.closeTrip : waitingForSchedule ? copy.openScheduled : scheduleEnded ? copy.ended : trip.activation_mode === "scheduled" ? copy.openScheduled : copy.openTrip}
                </button>
              </div>
              <Link href={`/mobile/travel/${trip.id}`} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">{copy.viewSummary} <ChevronRight size={16} /></Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
