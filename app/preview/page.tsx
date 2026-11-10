"use client";

import { useState } from "react";
import { Bot, Camera, Image as ImageIcon, List, Mic, Plus, QrCode, Wallet, X } from "lucide-react";

const mockTransactions = [
  { title: "กาแฟเช้า", category: "อาหาร", amount: "฿65.00", tone: "text-rose-500" },
  { title: "เงินเดือน", category: "รายรับ", amount: "+฿32,000.00", tone: "text-emerald-600" },
  { title: "ค่าเดินทาง", category: "เดินทาง", amount: "฿840.00", tone: "text-rose-500" },
];

export default function PreviewPage() {
  const [panel, setPanel] = useState<"add" | "ai" | null>(null);
  const [tab, setTab] = useState("home");
  const [entryType, setEntryType] = useState("รายจ่าย");
  const [amount, setAmount] = useState("0");

  const appendDigit = (digit: string) => setAmount((current) => current === "0" ? digit : `${current}${digit}`);
  const clearAmount = () => setAmount("0");

  return (
    <main className="min-h-screen bg-[#f5f4f8] pb-28 text-slate-900">
      <header className="flex items-center justify-between px-5 pb-4 pt-10">
        <div className="flex items-center gap-2"><span className="text-2xl">👛</span><span className="text-xl font-bold">฿0.00</span><span className="rounded-full bg-slate-200 px-2 py-1 text-xs text-slate-500">ของฉัน</span></div>
        <button type="button" className="rounded-full p-2 text-slate-500" aria-label="เมนู">☰</button>
      </header>

      <section className="mx-4 rounded-[2rem] bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between"><h1 className="text-lg font-bold">พฤศจิกายน 2569</h1><button className="text-sm text-slate-400">ดูสรุป</button></div>
        <div className="mt-5 grid grid-cols-2 divide-x divide-slate-100"><div><p className="text-sm text-slate-400">วันนี้</p><p className="mt-1 text-2xl font-bold">฿0.00 🌱</p></div><div className="pl-5"><p className="text-sm text-slate-400">เดือนนี้</p><p className="mt-1 text-2xl font-bold">฿0.00</p></div></div>
      </section>

      {tab === "home" && <>
        <section className="px-5 pt-10 text-center"><div className="text-4xl">✦</div><h2 className="mt-3 text-xl font-bold">ให้แอปจดให้ ไม่ต้องพิมพ์เอง</h2><p className="mt-2 text-sm text-slate-400">เลือกวิธีบันทึกที่สะดวกที่สุด</p><div className="mt-6 grid grid-cols-4 gap-3">{[{label:"ถ่ายสลิป",icon:Camera},{label:"คลังภาพ",icon:ImageIcon},{label:"พูด",icon:Mic},{label:"สแกน QR",icon:QrCode}].map(({label,icon:Icon})=><button key={label} onClick={()=>setPanel(label === "พูด" ? "ai" : "add")} className="flex flex-col items-center gap-2 rounded-2xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700"><Icon size={24}/><span>{label}</span></button>)}</div></section>
        <section className="mx-5 mt-7 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm text-emerald-800"><p className="font-semibold">หรือกรอกเอง</p><p className="mt-1 text-emerald-700/70">กดปุ่ม + เพื่อเพิ่มรายการด้วยตัวเอง</p></section>
      </>}

      {tab === "list" && <section className="mx-4 mt-6 space-y-3"><h2 className="px-1 text-xl font-bold">รายการล่าสุด</h2>{mockTransactions.map((tx)=><div key={tx.title} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm"><div><p className="font-semibold">{tx.title}</p><p className="mt-1 text-xs text-slate-400">{tx.category} · วันนี้</p></div><p className={`font-bold ${tx.tone}`}>{tx.amount}</p></div>)}</section>}

      <nav className="fixed inset-x-4 bottom-4 z-30 mx-auto flex max-w-md items-end justify-between rounded-[2rem] bg-white/95 px-3 pb-2 pt-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl"><button onClick={()=>setTab("home")} className={`flex w-20 flex-col items-center gap-1 text-xs font-semibold ${tab === "home" ? "text-emerald-600" : "text-slate-400"}`}><span className="text-xl">⌂</span><span>หน้าหลัก</span></button><button className="flex w-20 flex-col items-center gap-1 text-xs font-semibold text-slate-400"><Wallet size={22}/><span>กระเป๋า</span></button><button onClick={()=>setPanel("add")} aria-label="เพิ่มรายการ" className="-mt-12 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-8 ring-[#f5f4f8]"><Plus size={32}/></button><button onClick={()=>setPanel("ai")} className="flex w-20 flex-col items-center gap-1 text-xs font-semibold text-slate-400"><Bot size={22}/><span>ผู้ช่วย AI</span></button><button onClick={()=>setTab("list")} className={`flex w-20 flex-col items-center gap-1 text-xs font-semibold ${tab === "list" ? "text-emerald-600" : "text-slate-400"}`}><List size={22}/><span>รายการ</span></button></nav>

      {panel && <div className="fixed inset-0 z-40 flex items-end bg-slate-950/30"><section className="w-full rounded-t-[2rem] bg-white p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-bold">{panel === "ai" ? "ผู้ช่วย AI" : "รายการใหม่"}</h2><button onClick={()=>setPanel(null)} aria-label="ปิด" className="rounded-full bg-slate-100 p-2"><X size={18}/></button></div>{panel === "ai" ? <div className="mt-6 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">สวัสดีครับ ผมช่วยสรุปและวิเคราะห์การเงินของคุณได้ ลองถามว่า “เดือนนี้ใช้เงินกับอะไรเยอะที่สุด”</div> : <><div className="mt-5 flex rounded-full bg-slate-100 p-1 text-sm font-semibold">{["รายจ่าย","รายรับ","โอน"].map((type)=><button key={type} onClick={()=>setEntryType(type)} className={`flex-1 rounded-full py-2 ${entryType === type ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>{type}</button>)}</div><div className="mt-4 rounded-2xl bg-slate-50 p-4 text-right"><p className="text-4xl font-bold tabular-nums">฿{Number(amount).toLocaleString()}</p></div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><button className="rounded-xl border border-slate-200 p-3 text-left">▣ บัญชี <span className="float-right text-slate-400">เงินสด ›</span></button><button className="rounded-xl border border-slate-200 p-3 text-left">◇ หมวดหมู่ <span className="float-right text-slate-400">อาหาร ›</span></button><button className="rounded-xl border border-slate-200 p-3 text-left">▤ ร้านค้า <span className="float-right text-slate-400">ไม่ระบุ ›</span></button><button className="rounded-xl border border-slate-200 p-3 text-left">▦ วันที่ <span className="float-right text-slate-400">วันนี้ ›</span></button></div><div className="mt-4 grid grid-cols-4 gap-2 text-2xl font-semibold"><button onClick={()=>appendDigit("7")} className="rounded-xl bg-slate-50 py-3">7</button><button onClick={()=>appendDigit("8")} className="rounded-xl bg-slate-50 py-3">8</button><button onClick={()=>appendDigit("9")} className="rounded-xl bg-slate-50 py-3">9</button><button onClick={clearAmount} className="rounded-xl bg-slate-200 py-3 text-slate-500">⌫</button><button onClick={()=>appendDigit("4")} className="rounded-xl bg-slate-50 py-3">4</button><button onClick={()=>appendDigit("5")} className="rounded-xl bg-slate-50 py-3">5</button><button onClick={()=>appendDigit("6")} className="rounded-xl bg-slate-50 py-3">6</button><button className="rounded-xl bg-emerald-50 py-3 text-emerald-600">−</button><button onClick={()=>appendDigit("1")} className="rounded-xl bg-slate-50 py-3">1</button><button onClick={()=>appendDigit("2")} className="rounded-xl bg-slate-50 py-3">2</button><button onClick={()=>appendDigit("3")} className="rounded-xl bg-slate-50 py-3">3</button><button className="rounded-xl bg-emerald-50 py-3 text-emerald-600">+</button><button onClick={()=>appendDigit(".")} className="rounded-xl bg-slate-50 py-3">.</button><button onClick={()=>appendDigit("0")} className="rounded-xl bg-slate-50 py-3">0</button><button className="rounded-xl bg-slate-200 py-3 text-sm">คัดลอก</button><button onClick={()=>setPanel(null)} className="rounded-xl bg-emerald-500 py-3 text-sm text-white">บันทึก</button></div></>}</section></div>}
    </main>
  );
}
