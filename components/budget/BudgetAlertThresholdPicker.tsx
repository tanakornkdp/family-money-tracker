"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

const PRESETS = [10, 25, 50, 75, 90];

export default function BudgetAlertThresholdPicker({
  value,
  onChange,
  label = "เตือนเมื่อใช้งบถึงระดับ",
  idPrefix = "budget-alert",
}: {
  value: number[];
  onChange: (next: number[]) => void;
  label?: string;
  idPrefix?: string;
}) {
  const [custom, setCustom] = useState("");
  const levels = [...new Set([...PRESETS, ...value.filter((item) => !PRESETS.includes(item))])].sort((a, b) => a - b);
  const inputId = idPrefix + "-custom-alert";
  const toggle = (level: number) => onChange(value.includes(level) ? value.filter((item) => item !== level) : [...value, level].sort((a, b) => a - b));
  const addCustom = () => {
    const parsed = Number(custom);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99 || value.includes(parsed) || value.length >= 10) return;
    onChange([...value, parsed].sort((a, b) => a - b));
    setCustom("");
  };

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {levels.map((level) => {
          const selected = value.includes(level);
          return (
            <button key={level} type="button" aria-label={"แจ้งเตือนที่ " + level + "%"} aria-pressed={selected} onClick={() => toggle(level)} className={"min-h-10 rounded-full border px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 " + (selected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200")}>
              {level}%
            </button>
          );
        })}
      </div>
      <div className="flex max-w-xs gap-2">
        <label className="sr-only" htmlFor={inputId}>เปอร์เซ็นต์แจ้งเตือนแบบกำหนดเอง</label>
        <input id={inputId} inputMode="numeric" type="number" min="1" max="99" step="1" value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="กำหนดเอง 1–99%" className="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <button type="button" aria-label="เพิ่มระดับแจ้งเตือน" onClick={addCustom} disabled={!custom || value.length >= 10} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-slate-300 px-3 text-sm font-medium disabled:opacity-45 dark:border-slate-700"><Plus size={15}/>เพิ่ม</button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">เตือนครั้งเดียวต่อระดับ และเมื่อเกิน 100%</p>
    </fieldset>
  );
}
