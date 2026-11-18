"use client";
import AnimatedSelect from "@/components/ui/AnimatedSelect";
import Accordion from "@/components/ui/Accordion";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { settleTrip, type TripSettlement } from "@/services/tripSettlement";
import type { TravelTrip } from "@/types";

const field = "min-h-11 w-full min-w-0 rounded-xl border border-mobile-border bg-mobile-surface px-3";
type Payment = { id: string; sender: string; recipient: string; amount: number; confirmed_at: string | null };

export default function TripSettlementPanel({ trip, accounts, expenses }: {
  trip: TravelTrip;
  accounts: { id: string; name: string; group: string }[];
  expenses: { id: string; title: string; cents: number }[];
}) {
  const { locale } = useLanguage();
  const th = locale === "th";
  const [data, setData] = useState<TripSettlement>(trip.settlement ?? { people: [], splits: {} });
  const [guest, setGuest] = useState("");
  const [account, setAccount] = useState("");
  const [linkPerson, setLinkPerson] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [transferReady, setTransferReady] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    let active = true;
    void createClient().from("trip_transfers").select("id,sender,recipient,amount,confirmed_at")
      .eq("trip_id", trip.id).then(({ data }) => {
        if (active && data) { setPayments(data); setTransferReady(true); }
      });
    return () => { active = false; };
  }, [trip.id]);
  const { people, splits } = data;
  const candidates = [{ id: trip.user_id, name: th ? "ฉัน" : "Me", group: "" }, ...accounts.filter(item => item.id !== trip.user_id)]
    .filter(item => !people.some(person => person.accountId === item.id));
  const { pending, transfers } = settleTrip(people, expenses, splits, payments.filter(row => row.confirmed_at).flatMap(row => {
    const from = people.find(person => person.accountId === row.sender);
    const to = people.find(person => person.accountId === row.recipient);
    return from && to ? [{ from: from.id, to: to.id, cents: Math.round(row.amount * 100) }] : [];
  }));
  const money = new Intl.NumberFormat(locale, { style: "currency", currency: "THB" });
  const name = (id: string) => people.find(person => person.id === id)?.name;
  const requestKey = (from: string, to: string) => `${from}:${to}`;
  const [requestIds, setRequestIds] = useState<Record<string, string>>({});

  async function report(receiver: string, amount: number) {
    const key = requestKey(trip.user_id, receiver);
    const id = requestIds[key] ?? crypto.randomUUID();
    setRequestIds(current => ({ ...current, [key]: id }));
    setBusy(true);
    try {
      const { error } = await createClient().rpc("report_trip_transfer", {
        request_id: id, trip: trip.id, receiver, total: amount,
      });
      if (error) throw error;
      setPayments(current => [...current, { id, sender: trip.user_id, recipient: receiver, amount, confirmed_at: null }]);
      setRequestIds(current => Object.fromEntries(Object.entries(current).filter(([entry]) => entry !== key)));
      setStatus(th ? "รอผู้รับยืนยัน" : "Awaiting recipient confirmation");
    } catch {
      setStatus(th ? "แจ้งโอนไม่สำเร็จ กรุณาลองใหม่" : "Could not report transfer. Try again.");
    } finally { setBusy(false); }
  }

  async function save() {
    setBusy(true);
    setStatus("");
    try {
      const { data: saved, error } = await createClient().from("travel_trips")
        .update({ settlement: data }).eq("id", trip.id).select("id").single();
      if (error || !saved) throw error;
      setDirty(false);
      setStatus(th ? "บันทึกแล้ว" : "Saved");
    } catch {
      setStatus(th ? "บันทึกไม่ได้ กรุณาลองใหม่" : "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function edit(next: TripSettlement) {
    setData(next);
    setDirty(true);
    setStatus(th ? "มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก" : "Unsaved changes");
  }

  return <section className="space-y-4 rounded-2xl border border-mobile-border bg-mobile-surface p-4">
    <h2 className="font-semibold">{th ? "หารค่าใช้จ่ายทริป" : "Split trip expenses"}</h2>
    {trip.settlement === undefined ? <p className="text-sm text-mobile-muted">{th ? "ต้องอัปเดตฐานข้อมูลก่อนใช้การหารค่าใช้จ่าย" : "Update the database to enable expense splitting."}</p> : <fieldset disabled={busy} className="min-w-0 space-y-4">
      <div className="flex flex-wrap gap-2">
        {people.map(person => <span key={person.id} className="break-all rounded-full bg-mobile-surface-muted px-3 py-1 text-sm">{person.name} · {person.accountId ? (th ? "บัญชี" : "Account") : (th ? "ผู้ร่วมทริป" : "Guest")}</span>)}
      </div>
      <form className="flex gap-2" onSubmit={event => {
        event.preventDefault();
        if (!guest.trim() || people.length >= 50) return;
        edit({ ...data, people: [...people, { id: crypto.randomUUID(), name: guest.trim() }] });
        setGuest("");
      }}>
        <input className={field} aria-label={th ? "ชื่อผู้ร่วมทริป" : "Guest name"} placeholder={th ? "ชื่อจริงหรือชื่อเล่น" : "Name or nickname"} value={guest} maxLength={80} onChange={event => setGuest(event.target.value)} />
        <button className="shrink-0 rounded-xl border border-mobile-border px-3" disabled={!guest.trim() || people.length >= 50}>{th ? "เพิ่มชื่อ" : "Add guest"}</button>
      </form>
      <label className="block space-y-1 text-sm">
        <span>{th ? "เลือกบัญชีจากกลุ่ม" : "Choose an account from your groups"}</span>
        <AnimatedSelect className={field} value={account} onChange={event => setAccount(event.target.value)}>
          <option value="">{th ? "เลือกบัญชี" : "Choose account"}</option>
          {candidates.map(item => <option key={item.id} value={item.id}>{item.name}{item.group && ` · ${item.group}`}</option>)}
        </AnimatedSelect>
      </label>
      {people.some(person => !person.accountId) && <label className="block space-y-1 text-sm">
        <span>{th ? "เชื่อมกับชื่อที่เพิ่มไว้" : "Link an existing guest"}</span>
        <AnimatedSelect className={field} value={linkPerson} onChange={event => setLinkPerson(event.target.value)}>
          <option value="">{th ? "เพิ่มเป็นคนใหม่" : "Add as a new participant"}</option>
          {people.filter(person => !person.accountId).map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
        </AnimatedSelect>
      </label>}
      <button type="button" className="min-h-11 rounded-xl border border-mobile-border px-3 disabled:opacity-50" disabled={!account || (!linkPerson && people.length >= 50)} onClick={() => {
        const selected = candidates.find(item => item.id === account);
        if (!selected) return;
        edit({ ...data, people: linkPerson
          ? people.map(person => person.id === linkPerson ? { ...person, accountId: selected.id } : person)
          : [...people, { id: crypto.randomUUID(), name: selected.name, accountId: selected.id }] });
        setAccount("");
        setLinkPerson("");
      }}>{linkPerson ? (th ? "เชื่อมบัญชี" : "Link account") : (th ? "เพิ่มบัญชีในทริป" : "Add account to trip")}</button>
      {expenses.map(expense => {
        const split = splits[expense.id] ?? { payer: "", shares: [] };
        const change = (next: typeof split) => edit({ ...data, splits: { ...splits, [expense.id]: next } });
        return <Accordion key={expense.id} className="border-t border-mobile-border py-2" triggerClassName="cursor-pointer break-words py-2" title={<>{expense.title} · {money.format(expense.cents / 100)}</>}>
          <label className="block space-y-1 text-sm"><span>{th ? "ผู้จ่าย" : "Paid by"}</span>
            <AnimatedSelect className={field} value={split.payer} onChange={event => change({ ...split, payer: event.target.value, shares: split.shares.length ? split.shares : people.map(person => person.id) })}>
              <option value="">{th ? "เลือกผู้จ่าย" : "Choose payer"}</option>
              {people.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}
            </AnimatedSelect>
          </label>
          <fieldset className="mt-2"><legend className="text-sm">{th ? "หารเท่ากันระหว่าง" : "Split equally between"}</legend>
            {people.map(person => <label key={person.id} className="flex min-h-10 items-center gap-2 break-all text-sm">
              <input type="checkbox" checked={split.shares.includes(person.id)} onChange={event => change({ ...split, shares: event.target.checked ? [...split.shares, person.id] : split.shares.filter(id => id !== person.id) })} />{person.name}
            </label>)}
          </fieldset>
        </Accordion>;
      })}
      <div className="space-y-2 border-t border-mobile-border pt-3">
        <h3 className="font-semibold">{th ? "ยอดโอนสุทธิ (บาท)" : "Net transfers (THB)"}</h3>
        {pending > 0 && <p className="text-sm text-mobile-muted">{th ? `ยังตั้งค่าการหารไม่ครบ ${pending} รายการ` : `${pending} expenses still need split details.`}</p>}
        {transfers.length ? <ul className="space-y-2">{transfers.map(item => <li key={`${item.from}:${item.to}`} className="flex flex-wrap justify-between gap-2 text-sm"><span className="min-w-0 break-all">{name(item.from)} → {name(item.to)}</span><strong className="tabular-nums">{money.format(item.cents / 100)}</strong></li>)}</ul>
          : <p className="text-sm text-mobile-muted">{th ? "ยังไม่มียอดโอนจากรายการที่ตั้งค่าแล้ว" : "No transfers from configured expenses."}</p>}
      </div>
      <button type="button" onClick={() => void save()} className="min-h-11 w-full rounded-xl bg-emerald-700 px-3 font-semibold text-white disabled:opacity-50">{busy ? (th ? "กำลังบันทึก" : "Saving") : (th ? "บันทึกการหาร" : "Save splits")}</button>
      {transferReady && !dirty && transfers.map(item => {
        const sender = people.find(person => person.id === item.from)?.accountId;
        const receiver = people.find(person => person.id === item.to)?.accountId;
        if (sender !== trip.user_id || !receiver) return null;
        const waiting = payments.find(row => row.recipient === receiver && !row.confirmed_at);
        return <form key={item.to} className="space-y-2 border-t border-mobile-border pt-3" onSubmit={event => {
          event.preventDefault();
          const amount = Number(new FormData(event.currentTarget).get("amount"));
          if (amount > 0 && Math.round(amount * 100) <= item.cents) void report(receiver, amount);
        }}>
          <label className="block space-y-1 text-sm">
            <span>{th ? "ยอดที่โอนให้" : "Amount sent to"} {name(item.to)}</span>
            <input className={field} name="amount" type="number" min="0.01" max={item.cents / 100} step="0.01" defaultValue={item.cents / 100} required disabled={Boolean(waiting)} />
          </label>
          <button disabled={Boolean(waiting)} className="min-h-11 rounded-xl border border-mobile-border px-3 disabled:opacity-60">{waiting ? (th ? "รอผู้รับยืนยัน" : "Awaiting confirmation") : (th ? "แจ้งว่าโอนแล้ว" : "Report transfer")}</button>
        </form>;
      })}
      <p role="status" className="text-sm text-mobile-muted">{status}</p>
    </fieldset>}
  </section>;
}
