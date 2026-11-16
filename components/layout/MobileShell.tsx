"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, Receipt, Plus, Wallet, X, Tag, CreditCard, ScanLine, Users, Target, CalendarDays, Settings, ChevronRight, Menu, RefreshCw } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import ChatWindow from "@/components/assistant/ChatWindow";
import TransactionForm from "@/components/transactions/TransactionForm";

const extraItems = [{ href: "/mobile/transactions", label: "รายการ", icon: Receipt }, { href: "/mobile/categories", label: "หมวดหมู่", icon: Tag }, { href: "/mobile/recurring-bills", label: "บิลประจำ", icon: RefreshCw }, { href: "/mobile/receipts", label: "ใบเสร็จ", icon: ScanLine }, { href: "/mobile/household", label: "ครอบครัว", icon: Users }, { href: "/mobile/goals", label: "เป้าหมาย", icon: Target }, { href: "/mobile/settings", label: "ตั้งค่า", icon: Settings }];

export default function MobileShell() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"assistant" | "transaction" | "menu" | "wallet" | null>(null);
  return <>
    <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none"><nav className="relative mx-auto flex max-w-md items-end justify-between rounded-[2rem] border border-slate-200/80 bg-white/95 px-3 pb-2 pt-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl pointer-events-auto dark:border-slate-800 dark:bg-slate-900/95">
      <Link href="/mobile/dashboard" className={clsx("flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold", pathname === "/dashboard" ? "bg-emerald-50 text-emerald-700" : "text-slate-500")}><Home size={22}/><span>หน้าหลัก</span></Link>
      <button type="button" aria-label="กระเป๋า" onClick={() => setPanel("wallet")} className="flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500"><Wallet size={22}/><span>กระเป๋า</span></button>
      <button type="button" aria-label="เพิ่มรายการ" onClick={() => setPanel("transaction")} className="-mt-12 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.42)] ring-8 ring-slate-50"><Plus size={32}/></button>
      <button type="button" aria-label="ผู้ช่วย AI" onClick={() => setPanel("assistant")} className="flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500"><Bot size={22}/><span>ผู้ช่วย AI</span></button>
      <button type="button" aria-label="เมนู" onClick={() => setPanel("menu")} className="flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold text-slate-500"><Menu size={22}/><span>เมนู</span></button>
    </nav></div>
    {panel && <div className="md:hidden fixed inset-0 z-50 flex items-end bg-slate-950/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) setPanel(null); }}><div className={clsx("w-full overflow-hidden rounded-t-[2rem] border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950", panel === "assistant" ? "flex h-[88svh] flex-col" : "max-h-[88vh]")}><div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800"><div><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300"/><h2 className="text-lg font-bold text-slate-900 dark:text-white">{panel === "assistant" ? "ผู้ช่วย AI" : panel === "transaction" ? "รายการใหม่" : panel === "wallet" ? "กระเป๋า" : "เมนูทั้งหมด"}</h2></div><button type="button" aria-label="ปิด" onClick={() => setPanel(null)} className="rounded-full p-2 text-slate-500"><X size={20}/></button></div><div className={clsx("p-4", panel === "assistant" ? "min-h-0 flex-1 overflow-hidden" : "max-h-[calc(88vh-76px)] overflow-y-auto")}>{panel === "assistant" ? <ChatWindow/> : panel === "transaction" ? <TransactionForm onSaved={() => setPanel(null)}/> : panel === "wallet" ? <div className="space-y-3"><Link href="/mobile/budget" onClick={() => setPanel(null)} className="mobile-menu-link"><CalendarDays size={21}/><span>งบประมาณ</span><ChevronRight size={18} className="ml-auto"/></Link><Link href="/mobile/credit-cards" onClick={() => setPanel(null)} className="mobile-menu-link"><CreditCard size={21}/><span>บัตรเครดิต / บัตรเดบิต</span><ChevronRight size={18} className="ml-auto"/></Link></div> : <div className="space-y-3">{extraItems.map(({href,label,icon:Icon}) => <Link key={href} href={href} onClick={() => setPanel(null)} className="mobile-menu-link"><Icon size={21}/><span>{label}</span><ChevronRight size={18} className="ml-auto"/></Link>)}</div>}</div></div></div>}
  </>;
}
