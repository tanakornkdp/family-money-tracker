"use client";
import { useState } from "react";
const options = [["categories", "หมวดหมู่ยอดนิยม"], ["bills", "บิลใกล้ครบกำหนด"], ["trips", "ทริปที่กำลังใช้งาน"]] as const;
function savePreferences(next: string[]) { document.cookie = `mobile_home_cards=${encodeURIComponent(next.join(","))};path=/;max-age=31536000;samesite=lax`; }
export default function MobileHomeCardPreferences() {
  const [visible, setVisible] = useState<string[]>(() => { const saved = document.cookie.match(/(?:^|; )mobile_home_cards=([^;]+)/)?.[1]; return saved ? decodeURIComponent(saved).split(",") : options.map(([id]) => id); });
  const toggle = (id: string) => { const next = visible.includes(id) ? visible.filter((item) => item !== id) : [...visible, id]; setVisible(next); savePreferences(next); };
  return <section className="rounded-3xl bg-mobile-surface p-4 shadow-sm"><h2 className="font-bold">การ์ดหน้าแรก</h2><p className="mt-1 text-sm text-mobile-muted">เลือกส่วนที่ต้องการให้แสดงบน Dashboard</p><div className="mt-3 space-y-2">{options.map(([id, label]) => <label key={id} className="flex min-h-12 items-center justify-between rounded-2xl bg-mobile-surface-muted px-3"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={visible.includes(id)} onChange={() => toggle(id)} className="h-5 w-5 accent-emerald-600" /></label>)}</div></section>;
}
