"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Home, List, Plus, Wallet, X } from "lucide-react";
import clsx from "clsx";
import { useState } from "react";
import ChatWindow from "@/components/assistant/ChatWindow";
import TransactionForm from "@/components/transactions/TransactionForm";

const navItems = [
  { href: "/dashboard", label: "หน้าหลัก", icon: Home },
  { href: "/budget", label: "กระเป๋า", icon: Wallet },
  { href: "/transactions", label: "รายการ", icon: List },
];

export default function MobileShell() {
  const pathname = usePathname();
  const [panel, setPanel] = useState<"assistant" | "transaction" | null>(null);

  return (
    <>
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pointer-events-none">
        <nav className="relative mx-auto flex max-w-md items-end justify-between rounded-[2rem] border border-slate-200/80 bg-white/95 px-3 pb-2 pt-3 shadow-[0_18px_50px_rgba(15,23,42,0.18)] backdrop-blur-xl pointer-events-auto dark:border-slate-800 dark:bg-slate-900/95">
          {navItems.slice(0, 2).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} className={clsx("flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition", active ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}

          <button type="button" aria-label="เพิ่มรายการ" onClick={() => setPanel("transaction")} className="-mt-12 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.42)] ring-8 ring-slate-50 transition active:scale-95 dark:ring-slate-950">
            <Plus size={32} strokeWidth={2.2} />
          </button>

          <button type="button" aria-label="ผู้ช่วย AI" onClick={() => setPanel("assistant")} className={clsx("flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition", panel === "assistant" ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>
            <Bot size={22} />
            <span>ผู้ช่วย AI</span>
          </button>

          <Link href="/transactions" className={clsx("flex w-20 flex-col items-center gap-1 rounded-2xl px-2 py-1.5 text-[11px] font-semibold transition", pathname.startsWith("/transactions") ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400")}>
            <List size={22} />
            <span>{navItems[2].label}</span>
          </Link>
        </nav>
      </div>

      {panel && (
        <div className="md:hidden fixed inset-0 z-50 flex items-end bg-slate-950/35 p-0 backdrop-blur-[2px]" role="dialog" aria-modal="true">
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-[2rem] border border-slate-200 bg-slate-50 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">{panel === "assistant" ? "ผู้ช่วย AI" : "รายการใหม่"}</h2>
              </div>
              <button type="button" aria-label="ปิด" onClick={() => setPanel(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800"><X size={20} /></button>
            </div>
            <div className="max-h-[calc(88vh-76px)] overflow-y-auto p-4">
              {panel === "assistant" ? <ChatWindow /> : <TransactionForm />}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
