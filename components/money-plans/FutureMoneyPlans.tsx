"use client";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, CalendarClock, History, Link2, Plus, Unlink, Pencil, Archive, RotateCcw, Trash2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import { getFuturePlanData, type FuturePlanData } from "@/services/futureMoneyPlans";
import { futurePlanSchema, summarizeFuturePlan, type FuturePlan, type FuturePlanInput, type FutureAllocation } from "@/lib/validation/futureMoneyPlans";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Input from "@/components/ui/Input";
import AnimatedSelect from "@/components/ui/AnimatedSelect";
import Button from "@/components/ui/Button";
import Accordion from "@/components/ui/Accordion";
import PlanDialog, { useClosePlanDialog } from "./PlanDialog";

const field = "field-control";
const box = "rounded-2xl border border-mobile-border bg-mobile-surface p-4";
const cash = (amount: number) => formatCurrency(amount, "THB");
async function requestPlan(body: unknown) {
  const response = await fetch("/api/money-plans", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "save");
  return result;
}
function useCopy() {
  const { locale } = useLanguage();
  return (th: string, en: string) => locale === "th" ? th : en;
}
function errorCopy(code: string, t: ReturnType<typeof useCopy>) {
  if (code === "conflict") return t("มีผู้อื่นแก้แผนแล้ว กรุณาปิดหน้าต่างและโหลดข้อมูลใหม่ก่อนบันทึก", "This plan changed. Close the dialog and reload before saving.");
  if (code === "already_linked") return t("รายการนี้ผูกกับแผนแล้ว กรุณาโหลดข้อมูลใหม่", "This record is already linked. Please reload.");
  return t("บันทึกไม่สำเร็จ ตรวจสอบสิทธิ์ รายการที่เลือก และลองอีกครั้ง", "Could not save. Check your access and selected records, then retry.");
}

export default function FutureMoneyPlans({ initialData, userId, desktop = false }: { initialData: FuturePlanData; userId: string; desktop?: boolean }) {
  const t = useCopy();
  const [client] = useState(() => createClient());
  const [data, setData] = useState(initialData);
  const [scope, setScope] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [archived, setArchived] = useState(false);
  const [modal, setModal] = useState<{ type: "edit" | "link"; allocation?: string; anchor: HTMLElement } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plan = data.plans.find(item => item.id === selected);
  const links = data.links.filter(item => item.plan_id === selected);
  const summary = plan ? summarizeFuturePlan(plan, links, data.transactions, data.contributions) : null;
  const reload = async () => setData(await getFuturePlanData(client));
  const save = async (input: FuturePlanInput, original?: FuturePlan) => {
    const result = await requestPlan({ action: "save", id: original?.id, revision: original?.revision, plan: input });
    await reload();
    setScope(result.plan.household_id ?? "");
    setArchived(result.plan.archived);
    setSelected(result.plan.id);
  };
  const mutate = async (body: unknown) => {
    setBusy(true); setError("");
    try { await requestPlan(body); await reload(); } catch (e) { setError(errorCopy((e as Error).message, t)); } finally { setBusy(false); }
  };
  const getRecord = (id: string) => {
    const link = data.links.find(item => item.id === id)!;
    const tx = data.transactions.find(item => item.id === link.transaction_id);
    const contribution = data.contributions.find(item => item.id === link.contribution_id);
    return { title: tx?.title ?? contribution?.note ?? (contribution ? t("เงินออมเข้าเป้าหมาย", "Goal contribution") : t("รายการถูกลบหรือไม่มีสิทธิ์ดู กรุณาทบทวนการผูก", "Record unavailable. Please review this link.")), amount: Number(tx?.amount ?? contribution?.amount ?? 0), date: tx?.date ?? contribution?.created_at?.slice(0, 10) ?? "", missing: !tx && !contribution };
  };
  const day = (date: string) => date ? new Intl.DateTimeFormat(t("th-TH", "en-US"), { dateStyle: "medium" }).format(new Date(date.slice(0, 10) + "T12:00:00")) : "—";
  const status = (p: FuturePlan) => p.archived ? t("เก็บเข้าแฟ้มแล้ว", "Archived") : data.links.some(link => link.plan_id === p.id && !link.allocation_id) ? t("มีรายรับจริงแล้ว", "Income linked") : t("รอรับเงิน", "Expected");
  const targetName = (item: FutureAllocation) => {
    if (item.kind === "other") return t("กำหนดเอง", "Custom purpose");
    if (item.kind === "category") return item.target;
    return destinationOptions(item.kind, data, plan?.household_id ?? null, userId).find(option => option.id === item.target)?.name ?? t("ปลายทางถูกลบหรือไม่มีสิทธิ์ดู", "Destination unavailable");
  };
  return <main className={desktop ? "mx-auto max-w-5xl space-y-5" : "min-w-0 space-y-5"}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold">{t("แผนใช้เงินล่วงหน้า", "Future money plans")}</h1><p className="mt-1 max-w-xl text-sm text-mobile-muted">{t("วางแผนเงินที่จะได้รับ แล้วติดตามกับรายการที่เกิดขึ้นจริง", "Plan expected income and track what actually happens.")}</p></div>
      <Button className="inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap" onClick={event => { setSelected(null); setModal({ type: "edit", anchor: event.currentTarget }); }}><Plus size={18}/>{t("สร้างแผน", "New plan")}</Button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-red-300 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="w-56 max-w-full"><AnimatedSelect aria-label={t("มุมมองแผน", "Plan scope")} value={scope} onChange={event => { setScope(event.target.value); setSelected(null); }} className={field}><option value="">{t("ส่วนตัว", "Personal")}</option>{data.households.map(group => <option key={group.id} value={group.id}>{group.name}</option>)}</AnimatedSelect></div><button type="button" disabled={busy} onClick={() => { setError(""); void reload().catch(() => setError(t("โหลดข้อมูลไม่สำเร็จ", "Could not reload"))); }} className="flex min-h-11 items-center gap-2 text-sm text-primary-600"><RotateCcw size={16}/>{t("โหลดใหม่", "Reload")}</button></div>
    {!plan ? <>
      <label className="flex min-h-11 items-center gap-2 text-sm text-mobile-muted"><input type="checkbox" checked={archived} onChange={event => setArchived(event.target.checked)}/>{t("แสดงแผนที่เก็บเข้าแฟ้ม", "Show archived plans")}</label>
      <div className={desktop ? "grid gap-4 md:grid-cols-2" : "space-y-3"}>
        {data.plans.filter(p => (p.household_id ?? "") === scope && p.archived === archived).map(p => { const s = summarizeFuturePlan(p, data.links.filter(l => l.plan_id === p.id), data.transactions, data.contributions); return <button type="button" key={p.id} onClick={() => setSelected(p.id)} className={box + " w-full text-left focus-visible:outline-2 focus-visible:outline-primary-600"}>
          <div className="flex items-start justify-between gap-3"><span className="min-w-0 break-words font-bold">{p.name}</span><ArrowUpRight size={18} className="shrink-0 text-mobile-muted"/></div><p className="mt-1 text-xs text-mobile-muted">{day(p.expected_date)} · {status(p)}</p><p className="mt-4 text-2xl font-bold tabular-nums">{cash(p.expected_amount)}</p><div className="mt-3 flex flex-wrap justify-between gap-2 text-xs"><span className="text-mobile-muted">{t("แบ่งไว้", "Allocated")} {cash(s.allocated)}</span><span className={s.unallocated < 0 ? "text-orange-600" : "text-primary-600"}>{t("ยังไม่จัดสรร", "Unallocated")} {cash(s.unallocated)}</span></div>
        </button>; })}
      </div>
      {!data.plans.some(p => (p.household_id ?? "") === scope && p.archived === archived) && <div className="py-12 text-center"><CalendarClock size={32} className="mx-auto text-mobile-muted"/><h2 className="mt-4 font-semibold">{t("ยังไม่มีแผนในมุมมองนี้", "No plans in this scope")}</h2><p className="mt-2 text-sm text-mobile-muted">{t("เริ่มจากโบนัส เงินก้อน หรือรายรับที่คาดว่าจะได้รับ", "Start with a bonus, lump sum, or expected income.")}</p></div>}
    </> : summary && <>
      <div className="flex flex-wrap items-center justify-between gap-2"><button type="button" onClick={() => setSelected(null)} className="flex min-h-11 items-center gap-2 text-sm"><ArrowLeft size={18}/>{t("แผนทั้งหมด", "All plans")}</button><span className="rounded-full bg-mobile-surface-muted px-3 py-1 text-xs">{status(plan)}</span></div>
      <section className={box}><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="break-words text-xl font-bold">{plan.name}</h2><p className="mt-1 text-sm text-mobile-muted">{t("คาดว่าจะได้รับ", "Expected on")} {day(plan.expected_date)}</p></div>{!plan.archived && <button type="button" aria-label={t("แก้ไขแผน", "Edit plan")} onClick={event => setModal({ type: "edit", anchor: event.currentTarget })} className="grid size-11 shrink-0 place-items-center rounded-full border border-mobile-border"><Pencil size={18}/></button>}</div>
        {summary.invalidLinks.length > 0 && <p role="status" className="mt-3 rounded-xl border border-orange-300 p-3 text-sm text-orange-700 dark:text-orange-300">{t("มีรายการจริงถูกแก้ไข ย้ายกลุ่ม หรือไม่พร้อมใช้งาน จึงยังไม่นับยอด กรุณายกเลิกการผูกแล้วเลือกข้อมูลที่ถูกต้อง", "Some linked records changed or are unavailable and are excluded. Unlink them and select the correct records.")}</p>}
        <div className="mt-5 grid grid-cols-2 gap-4"><Metric title={t("ยอดที่คาดไว้", "Expected")} amount={plan.expected_amount}/><Metric title={t("ได้รับจริง", "Received")} amount={summary.received}/><Metric title={t("แบ่งไว้แล้ว", "Allocated")} amount={summary.allocated}/><Metric title={t("ยังไม่จัดสรร", "Unallocated")} amount={summary.unallocated}/></div>
        {summary.unallocated < 0 && <p className="mt-3 text-sm text-orange-600 dark:text-orange-400">{t("ยอดที่แบ่งไว้เกินเงินที่คาดว่าจะได้รับ", "Allocations exceed expected income.")}</p>}
        {summary.received > 0 && summary.allocated > summary.received && <p className="mt-3 text-sm text-orange-600 dark:text-orange-400">{t("ยอดที่แบ่งไว้สูงกว่าเงินรับจริง", "Allocations exceed actual income")} {cash(summary.allocated - summary.received)}</p>}
        {summary.received > 0 && <p className="mt-3 text-sm text-mobile-muted">{t("รายรับจริงเทียบกับแผน", "Actual income vs. expected")}: {cash(summary.received - plan.expected_amount)} · {t("รับจริงหักยอดที่ทำแล้ว", "Received less completed allocations")}: {cash(summary.received - summary.used)}</p>}
        <p className="mt-4 border-t border-mobile-border pt-3 text-xs text-mobile-muted">{t("แผนนี้ไม่เพิ่มยอดเงินจริง ไม่โอนเงิน และไม่สร้างรายการซ้ำ", "Planning does not change balances, move money, or create duplicate records.")}</p>
      </section>
      <section className="space-y-3"><div className="flex items-center justify-between"><h2 className="font-bold">{t("รายรับที่ได้รับจริง", "Actual income")}</h2>{!plan.archived && <button type="button" onClick={event => setModal({ type: "link", anchor: event.currentTarget })} className="flex min-h-11 items-center gap-2 text-sm text-primary-600"><Link2 size={16}/>{t("ผูกรายรับ", "Link income")}</button>}</div>{links.filter(l => !l.allocation_id).map(l => { const record = getRecord(l.id); return <RecordRow key={l.id} title={record.title} detail={day(record.date)} amount={record.amount} disabled={busy || plan.archived} onUnlink={() => { if (confirm(t("ยกเลิกการผูก? รายการเงินจริงจะยังอยู่", "Unlink? The actual record will remain."))) void mutate({ action: "unlink", id: l.id }); }} />; })}{!links.some(l => !l.allocation_id) && <p className="text-sm text-mobile-muted">{t("เมื่อเงินเข้า เลือกรายรับที่บันทึกไว้เพื่อเทียบกับแผน", "Once paid, link an existing income record to compare with your plan.")}</p>}</section>
      <section className="space-y-3"><h2 className="font-bold">{t("ตั้งใจใช้ทำอะไร", "How you plan to use it")}</h2>{plan.allocations.map(item => { const used = summary.actual[item.id] ?? 0; const remaining = Math.round((item.amount - used) * 100) / 100; return <article key={item.id} className={box}><h3 className="break-words font-semibold">{item.name}</h3><p className="mt-1 text-xs text-mobile-muted">{targetName(item)}</p><div className="mt-3 grid grid-cols-3 gap-2 text-xs"><Metric title={t("แผน", "Planned")} amount={item.amount} small/><Metric title={t("ทำจริง", "Actual")} amount={used} small/><Metric title={t("คงเหลือ", "Remaining")} amount={remaining} small/></div>{remaining < 0 && <p className="mt-2 text-sm text-orange-600 dark:text-orange-400">{t("ใช้จริงเกินแผนใหม่", "Actual usage exceeds this plan")} {cash(-remaining)}</p>}
        {!plan.archived && <button type="button" onClick={event => setModal({ type: "link", allocation: item.id, anchor: event.currentTarget })} className="mt-2 flex min-h-11 items-center gap-2 text-sm text-primary-600"><Link2 size={16}/>{t("ผูกรายการจริง", "Link an actual record")}</button>}
        {links.filter(l => l.allocation_id === item.id).map(l => { const record = getRecord(l.id); return <RecordRow key={l.id} title={record.title} detail={day(record.date)} amount={record.amount} disabled={busy || plan.archived} onUnlink={() => { if (confirm(t("ยกเลิกการผูก? รายการเงินจริงจะยังอยู่", "Unlink? The actual record will remain."))) void mutate({ action: "unlink", id: l.id }); }} />; })}
      </article>; })}</section>
      <Accordion title={<span className="flex items-center gap-2"><History size={18}/>{t("ประวัติการปรับแผน", "Plan history")}</span>} className={box}><ul className="space-y-4 pt-4">{data.events.filter(event => event.plan_id === plan.id).map(event => <li key={event.id} className="border-b border-mobile-border pb-3 text-sm"><p>{event.action.endsWith(":DELETE") ? t("ยกเลิกการผูกรายการ", "Record unlinked") : event.action.startsWith("future_money_plan_links") ? t("ผูกรายการจริง", "Record linked") : event.action.endsWith(":INSERT") ? t("สร้างแผน", "Plan created") : t("ปรับแผน", "Plan revised")}</p><p className="mt-1 text-xs text-mobile-muted">{new Intl.DateTimeFormat(t("th-TH", "en-US"), { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.created_at))} · {event.user_id === userId ? t("คุณ", "You") : t("สมาชิกกลุ่ม", "Group member")}</p>{typeof event.snapshot.expected_amount === "number" && <p className="mt-2">{String(event.snapshot.name)} · {cash(event.snapshot.expected_amount)}{Array.isArray(event.snapshot.allocations) && event.snapshot.allocations.map((a: FutureAllocation) => <span className="block text-xs text-mobile-muted" key={a.id}>{a.name}: {cash(a.amount)}</span>)}</p>}</li>)}</ul></Accordion>
      <Button variant="secondary" disabled={busy} onClick={() => { if (confirm(plan.archived ? t("นำแผนกลับมาใช้งาน?", "Restore this plan?") : t("เก็บแผนเข้าแฟ้ม? รายการจริงและประวัติจะยังอยู่", "Archive this plan? Actual records and history remain."))) void mutate({ action: "save", id: plan.id, revision: plan.revision, plan: { name: plan.name, expected_amount: Number(plan.expected_amount), expected_date: plan.expected_date, household_id: plan.household_id, allocations: plan.allocations, archived: !plan.archived } }); }}>{plan.archived ? <RotateCcw size={16}/> : <Archive size={16}/>}{plan.archived ? t("นำกลับมาใช้งาน", "Restore plan") : t("เก็บเข้าแฟ้ม", "Archive plan")}</Button>
    </>}
    {modal && <PlanDialog title={modal.type === "edit" ? plan ? t("แก้ไขแผน", "Edit plan") : t("สร้างแผนใช้เงินล่วงหน้า", "New money plan") : modal.allocation ? t("ผูกรายการจริง", "Link actual record") : t("ผูกรายรับจริง", "Link actual income")} anchor={modal.anchor} onClose={() => setModal(null)}>
      {modal.type === "edit" ? <PlanEditor original={plan} data={data} scope={scope} userId={userId} onSave={save}/> : plan && <RecordPicker data={data} plan={plan} allocation={plan.allocations.find(a => a.id === modal.allocation)} onSaved={reload}/>}
    </PlanDialog>}
  </main>;
}

function Metric({ title, amount, small = false }: { title: string; amount: number; small?: boolean }) {
  return <div className="min-w-0"><p className="text-xs text-mobile-muted">{title}</p><p className={(small ? "text-sm" : "text-lg") + " mt-1 break-words font-semibold tabular-nums " + (amount < 0 ? "text-orange-600 dark:text-orange-400" : "")}>{cash(amount)}</p></div>;
}
function RecordRow({ title, detail, amount, disabled, onUnlink }: { title: string; detail: string; amount: number; disabled: boolean; onUnlink: () => void }) {
  const t = useCopy();
  return <div className="mt-2 flex items-center gap-2 rounded-xl border border-mobile-border p-3"><div className="min-w-0 flex-1"><p className="break-words text-sm">{title}</p><p className="text-xs text-mobile-muted">{detail} · {cash(amount)}</p></div><button type="button" aria-label={t("ยกเลิกการผูก ", "Unlink ") + title} disabled={disabled} onClick={onUnlink} className="grid size-11 shrink-0 place-items-center rounded-full text-mobile-muted disabled:opacity-40"><Unlink size={17}/></button></div>;
}
function destinationOptions(kind: FutureAllocation["kind"], data: FuturePlanData, household: string | null, userId: string) {
  if (kind === "category") return [...new Set(data.categories.map(c => c.name))].map(name => ({ id: name, name }));
  if (kind === "card") return data.cards.map(c => ({ id: c.id, name: c.name }));
  if (kind === "goal") return data.goals.filter(g => g.household_id === household && (household || g.user_id === userId)).map(g => ({ id: g.id, name: g.name }));
  if (kind === "trip") return data.trips.map(g => ({ id: g.id, name: g.name }));
  return [];
}

function PlanEditor({ original, data, scope, userId, onSave }: { original?: FuturePlan; data: FuturePlanData; scope: string; userId: string; onSave: (input: FuturePlanInput, original?: FuturePlan) => Promise<void> }) {
  const t = useCopy(); const close = useClosePlanDialog();
  const [name, setName] = useState(original?.name ?? "");
  const [amount, setAmount] = useState(String(original?.expected_amount ?? ""));
  const [date, setDate] = useState(original?.expected_date ?? "");
  const [household, setHousehold] = useState(original?.household_id ?? scope);
  const [items, setItems] = useState<FutureAllocation[]>(original?.allocations ?? []);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const change = (id: string, patch: Partial<FutureAllocation>) => setItems(current => current.map(item => item.id === id ? { ...item, ...patch } : item));
  const submit = async () => {
    const parsed = futurePlanSchema.safeParse({ name, expected_amount: Number(amount), expected_date: date, household_id: household || null, allocations: items, archived: original?.archived ?? false });
    if (!parsed.success || !amount) { setError(t("กรอกชื่อ ยอดเงิน วันที่ และปลายทางให้ครบ (จำนวนเงินไม่เกิน 2 ทศนิยม)", "Complete the name, amount, date and destinations (up to 2 decimal places).")); return; }
    setBusy(true); setError("");
    try { await onSave(parsed.data, original); close(); } catch (e) { setError(errorCopy((e as Error).message, t)); } finally { setBusy(false); }
  };
  return <div className="space-y-4">
    <Input label={t("ชื่อแผน", "Plan name")} value={name} maxLength={100} onChange={e => setName(e.target.value)}/>
    <Input label={t("คาดว่าจะได้รับ (บาท)", "Expected income (THB)")} type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)}/>
    <Input label={t("วันที่คาดว่าจะได้รับ", "Expected date")} type="date" value={date} onChange={e => setDate(e.target.value)}/>
    <label className="block text-sm">{t("แผนสำหรับ", "Plan for")}<AnimatedSelect className={field + " mt-1.5"} value={household} disabled={Boolean(original)} onChange={e => { setHousehold(e.target.value); setItems(current => current.map(a => a.kind === "goal" ? { ...a, target: "" } : a)); }}><option value="">{t("ส่วนตัว", "Personal")}</option>{data.households.map(group => <option value={group.id} key={group.id}>{group.name}</option>)}</AnimatedSelect></label>
    <div className="flex items-center justify-between"><h3 className="font-semibold">{t("แบ่งเงินไว้ทำอะไร", "Allocate the money")}</h3><button type="button" disabled={items.length >= 50} className="flex min-h-11 items-center gap-1 text-sm text-primary-600" onClick={() => setItems(current => [...current, { id: crypto.randomUUID(), name: "", amount: 0, kind: "other", target: "" }])}><Plus size={16}/>{t("เพิ่มส่วน", "Add purpose")}</button></div>
    {items.map((item, index) => { const linked = data.links.some(l => l.plan_id === original?.id && l.allocation_id === item.id); const choices = destinationOptions(item.kind, data, household || null, userId); return <fieldset key={item.id} className="min-w-0 space-y-3 rounded-2xl border border-mobile-border p-3"><legend className="px-1 text-xs text-mobile-muted">{t("ส่วนที่ ", "Purpose ")}{index + 1}</legend><Input label={t("ชื่อส่วนนี้", "Purpose name")} value={item.name} maxLength={100} onChange={e => change(item.id, { name: e.target.value })}/><Input label={t("จำนวนเงิน (บาท)", "Amount (THB)")} type="number" inputMode="decimal" min="0" step="0.01" value={item.amount} onChange={e => change(item.id, { amount: Number(e.target.value) })}/>
      <label className="block text-sm">{t("เชื่อมกับ", "Reference")}<AnimatedSelect className={field + " mt-1.5"} disabled={linked} value={item.kind} onChange={e => change(item.id, { kind: e.target.value as FutureAllocation["kind"], target: "" })}><option value="other">{t("กำหนดเอง", "Custom purpose")}</option><option value="category">{t("หมวดหมู่", "Category")}</option><option value="card">{t("บัตร", "Card")}</option><option value="goal">{t("เป้าหมายออมเงิน", "Savings goal")}</option><option value="trip">{t("ทริป", "Trip")}</option></AnimatedSelect></label>
      {item.kind !== "other" && <label className="block text-sm">{t("เลือกปลายทาง", "Destination")}<AnimatedSelect className={field + " mt-1.5"} disabled={linked} value={item.target} onChange={e => change(item.id, { target: e.target.value, name: item.name || choices.find(c => c.id === e.target.value)?.name || "" })}><option value="">{t("เลือก…", "Select…")}</option>{item.target && !choices.some(c => c.id === item.target) && <option value={item.target}>{t("ปลายทางเดิม (ไม่พร้อมใช้งาน)", "Previous destination (unavailable)")}</option>}{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.name}</option>)}</AnimatedSelect></label>}
      {linked ? <p className="text-xs text-mobile-muted">{t("มีรายการจริงผูกอยู่ เปลี่ยนยอดได้ หากจะลบหรือเปลี่ยนปลายทางต้องยกเลิกการผูกก่อน", "Actual records are linked. You may revise the amount; unlink before removing or changing the destination.")}</p> : <button type="button" onClick={() => setItems(current => current.filter(a => a.id !== item.id))} className="flex min-h-11 items-center gap-2 text-sm text-red-600"><Trash2 size={16}/>{t("ลบส่วนนี้", "Remove purpose")}</button>}
    </fieldset>; })}
    <p className="text-sm text-mobile-muted">{t("ยังไม่จัดสรร", "Unallocated")}: {cash((Number(amount) || 0) - items.reduce((sum, item) => sum + item.amount, 0))}</p>
    <p className="text-xs text-mobile-muted">{t("การแก้แผนไม่แก้รายการเงินจริง และไม่มีการโอนหรือชำระเงินอัตโนมัติ", "Plan changes never edit actual records or automatically move money.")}</p>
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <Button className="w-full" disabled={busy} onClick={() => void submit()}>{busy ? t("กำลังบันทึก…", "Saving…") : t("บันทึกแผน", "Save plan")}</Button>
  </div>;
}

function RecordPicker({ data, plan, allocation, onSaved }: { data: FuturePlanData; plan: FuturePlan; allocation?: FutureAllocation; onSaved: () => Promise<void> }) {
  const t = useCopy(); const close = useClosePlanDialog();
  const [search, setSearch] = useState(""); const [selected, setSelected] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const contribution = allocation?.kind === "goal";
  const options = contribution ? data.contributions.filter(c => c.goal_id === allocation.target && !data.links.some(l => l.contribution_id === c.id)).map(c => ({ id: c.id, title: c.note || t("เงินออมเข้าเป้าหมาย", "Goal contribution"), date: c.created_at.slice(0, 10), amount: c.amount })) : data.transactions.filter(tx => tx.type === (allocation ? "expense" : "income") && tx.household_id === plan.household_id && (plan.household_id || tx.user_id === plan.user_id) && !data.links.some(l => l.transaction_id === tx.id) && (allocation?.kind !== "category" || tx.category === allocation.target) && (allocation?.kind !== "trip" || tx.travel_trip_id === allocation.target)).map(tx => ({ id: tx.id, title: tx.title, date: tx.date, amount: tx.amount }));
  const filtered = options.filter(option => `${option.title} ${option.date} ${option.amount}`.toLowerCase().includes(search.toLowerCase()));
  const save = async () => {
    if (!selected) return;
    setBusy(true); setError("");
    try { await requestPlan({ action: "link", link: { plan_id: plan.id, allocation_id: allocation?.id ?? null, transaction_id: contribution ? null : selected, contribution_id: contribution ? selected : null } }); await onSaved(); close(); } catch (e) { setError(errorCopy((e as Error).message, t)); } finally { setBusy(false); }
  };
  return <div className="space-y-4"><p className="text-sm text-mobile-muted">{t("เลือกจากรายการจริงในมุมมองเดียวกับแผน ระบบจะไม่นับรายการซ้ำ", "Choose an actual record in the same scope. Records are never counted twice.")}</p>{allocation?.kind === "card" && <p className="text-xs text-mobile-muted">{t("เลือกหลักฐานการชำระบัตรที่ถูกต้องด้วยตัวเอง ไม่ใช่ยอดซื้อด้วยบัตร", "Select the actual repayment record, rather than a card purchase.")}</p>}<Input label={t("ค้นหารายการ / วันที่ / จำนวนเงิน", "Search records, date or amount")} value={search} onChange={e => setSearch(e.target.value)}/>
    <div role="radiogroup" aria-label={t("รายการจริง", "Actual records")} className="max-h-64 space-y-2 overflow-y-auto">{filtered.map(option => <label key={option.id} className={"flex min-h-14 cursor-pointer items-start gap-3 rounded-xl border p-3 " + (selected === option.id ? "border-primary-600 bg-mobile-surface-muted" : "border-mobile-border")}><input type="radio" name="actual-record" className="mt-1 shrink-0 accent-emerald-600" checked={selected === option.id} onChange={() => setSelected(option.id)}/><span className="min-w-0 flex-1"><span className="block break-words text-sm font-medium">{option.title}</span><span className="mt-1 block text-xs text-mobile-muted">{option.date} · {cash(option.amount)}</span></span></label>)}</div>
    {!filtered.length && <p className="py-4 text-center text-sm text-mobile-muted">{t("ยังไม่มีรายการที่ผูกได้ บันทึกรายการจริงก่อน หรือรายการนั้นอาจผูกไว้แล้ว", "No eligible records. Record the actual income, expense or contribution first; it may also be linked already.")}</p>}
    {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
    <Button className="w-full" disabled={!selected || busy} onClick={() => void save()}>{busy ? t("กำลังบันทึก…", "Saving…") : t("ยืนยันการผูก", "Confirm link")}</Button>
  </div>;
}
