"use client";

import { useState } from "react";
import { History } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getDisplayNamesByUserIds } from "@/services/userSettings";

type Activity = { id: string; actor_id: string | null; action: "created" | "updated" | "deleted"; before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null; created_at: string };
const money = (value: unknown) => Number.isFinite(Number(value)) ? `${Number(value).toLocaleString()} ฿` : "";

export default function HouseholdActivityHistory({ householdId, locale }: { householdId: string; locale: "th" | "en" }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<Activity[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const supabase = createClient();
  const load = async () => {
    if (rows) return;
    setLoading(true); setError("");
    try {
      const { data, error: queryError } = await supabase.from("transaction_audit_logs").select("id,actor_id,action,before_data,after_data,created_at")
        .eq("household_id", householdId).order("created_at", { ascending: false }).limit(30);
      if (queryError) throw queryError;
      const activities = (data ?? []) as unknown as Activity[];
      setRows(activities);
      setNames(await getDisplayNamesByUserIds(supabase, activities.map((activity) => activity.actor_id).filter((id): id is string => !!id)));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load activity history"); }
    finally { setLoading(false); }
  };
  const toggle = () => {
    const next = !open; setOpen(next); if (next) void load();
  };
  const label = (action: Activity["action"]) => locale === "en" ? ({ created: "Added", updated: "Edited", deleted: "Deleted" }[action]) : ({ created: "เพิ่มรายการ", updated: "แก้ไขรายการ", deleted: "ลบรายการ" }[action]);
  return <section className="mt-4 border-t border-slate-200 pt-3 dark:border-slate-800">
    <button type="button" onClick={toggle} aria-expanded={open} className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-slate-600 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:text-slate-300">
      <History size={16}/>{locale === "en" ? "Transaction history" : "ประวัติรายการในกลุ่ม"}<span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="mt-3 space-y-2">
      {loading && <p className="text-sm text-slate-500">{locale === "en" ? "Loading…" : "กำลังโหลด…"}</p>}
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {rows?.length === 0 && <p className="text-sm text-slate-500">{locale === "en" ? "No activity yet." : "ยังไม่มีประวัติรายการ"}</p>}
      {rows?.map((row) => {
        const details = row.after_data ?? row.before_data;
        return <article key={row.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
          <div><p className="font-medium text-slate-800 dark:text-slate-100">{label(row.action)} · {typeof details?.title === "string" ? details.title : (locale === "en" ? "transaction" : "รายการ")}</p><p className="mt-0.5 text-xs text-slate-500">{row.actor_id ? names[row.actor_id] || row.actor_id.slice(0, 8) : (locale === "en" ? "Former member" : "สมาชิกเดิม")} · {new Date(row.created_at).toLocaleString(locale === "en" ? "en-GB" : "th-TH")}</p></div>
          <span className="font-semibold tabular-nums">{money(details?.amount)}</span>
        </article>;
      })}
    </div>}
  </section>;
}
