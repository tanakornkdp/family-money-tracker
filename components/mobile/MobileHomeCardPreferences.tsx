"use client";
import { useSyncExternalStore } from "react";
import { parseHomeCardPreferences, serializeHomeCardPreferences } from "@/lib/utils/mobileHomeCards.mjs";
const options = [["categories", "หมวดหมู่ยอดนิยม"], ["bills", "บิลใกล้ครบกำหนด"], ["trips", "ทริปที่กำลังใช้งาน"]] as const;
const eventName = "mobile-home-cards-change";
const defaults = options.map(([id]) => id);
function readPreferences() { return JSON.stringify(parseHomeCardPreferences(document.cookie, defaults)); }
function subscribe(onChange: () => void) { window.addEventListener(eventName, onChange); return () => window.removeEventListener(eventName, onChange); }
function savePreferences(next: string[]) { document.cookie = serializeHomeCardPreferences(next); window.dispatchEvent(new Event(eventName)); }
export default function MobileHomeCardPreferences() {
  const snapshot = useSyncExternalStore(subscribe, readPreferences, () => JSON.stringify(defaults));
  const visible = JSON.parse(snapshot) as string[];
  const toggle = (id: string) => { const next = visible.includes(id) ? visible.filter((item) => item !== id) : [...visible, id]; savePreferences(next); };
  return <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm"><h2 className="font-bold">การ์ดหน้าแรก</h2><p className="mt-1 text-sm text-mobile-muted">เลือกส่วนที่ต้องการให้แสดงบน Dashboard</p><div className="mt-3 space-y-2">{options.map(([id, label]) => <label key={id} className="flex min-h-12 items-center justify-between rounded-2xl bg-mobile-surface-muted px-3"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={visible.includes(id)} onChange={() => toggle(id)} className="h-5 w-5 accent-emerald-600" /></label>)}</div></section>;
}
