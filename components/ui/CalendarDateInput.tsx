"use client";
import { forwardRef, useId, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useFieldPopover } from "./useFieldPopover";

const CalendarDateInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function CalendarDateInput({ className, value, defaultValue, onChange, ...props }, forwarded) {
  const { locale } = useLanguage();
  const [local, setLocal] = useState(String(defaultValue ?? ""));
  const date = String(value ?? local);
  const [month, setMonth] = useState(() => { const d = new Date((date || new Date().toISOString().slice(0, 10)) + "T12:00:00"); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const native = useRef<HTMLInputElement>(null);
  const { anchor, panel, open, close, toggle } = useFieldPopover(true);
  const id = useId();
  const language = locale === "th" ? "th-TH" : "en-US";
  const format = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const choose = (next: string) => {
    setLocal(next);
    const input = native.current;
    if (input) { input.value = next; onChange?.({ target: input, currentTarget: input, type: "change" } as ChangeEvent<HTMLInputElement>); }
    close();
  };
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return <span className="relative block min-w-0">
    <input {...props} id={undefined} type="date" className="sr-only" tabIndex={-1} aria-hidden="true" value={date} onChange={onChange} onInvalid={() => anchor.current?.focus()} ref={element => { native.current = element; if (typeof forwarded === "function") forwarded(element); else if (forwarded) forwarded.current = element; }} />
    <button type="button" id={props.id} ref={anchor} disabled={props.disabled} aria-label={props["aria-label"]} aria-labelledby={props["aria-labelledby"]} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}
      className={(className ?? "field-control") + " flex w-full min-w-0 items-center justify-between gap-2 text-left text-base"} onClick={() => { if (date) { const d = new Date(date + "T12:00:00"); setMonth(new Date(d.getFullYear(), d.getMonth(), 1)); } toggle(); }}>
      <span className={"min-w-0 truncate " + (!date ? "text-mobile-muted" : "")}>{date ? new Intl.DateTimeFormat(language, { day: "numeric", month: "short", year: "numeric" }).format(new Date(date + "T12:00:00")) : locale === "th" ? "เลือกวันที่" : "Select date"}</span><CalendarDays size={18} className="shrink-0 text-mobile-muted" />
    </button>
    {open && <div ref={panel} id={id} popover="manual" role="dialog" aria-label={locale === "th" ? "เลือกวันที่" : "Select date"} className="field-popover p-3">
      <div className="mb-2 flex items-center justify-between"><button type="button" aria-label={locale === "th" ? "เดือนก่อน" : "Previous month"} className="calendar-step" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><ChevronLeft size={18}/></button><span aria-live="polite" className="text-sm font-semibold">{new Intl.DateTimeFormat(language, { month: "long", year: "numeric" }).format(month)}</span><button type="button" aria-label={locale === "th" ? "เดือนถัดไป" : "Next month"} className="calendar-step" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><ChevronRight size={18}/></button></div>
      <div className="grid grid-cols-7 gap-1">{Array.from({ length: 7 }, (_, i) => <span key={i} className="py-1 text-center text-xs text-mobile-muted">{new Intl.DateTimeFormat(language, { weekday: "narrow" }).format(new Date(2026, 10, 1 + i))}</span>)}{Array.from({ length: month.getDay() }, (_, i) => <span key={`empty-${i}`}/>)}{Array.from({ length: days }, (_, i) => { const d = new Date(month.getFullYear(), month.getMonth(), i + 1); const v = format(d); return <button type="button" key={v} aria-label={new Intl.DateTimeFormat(language, { dateStyle: "full" }).format(d)} aria-pressed={date === v} disabled={Boolean((props.min && v < String(props.min)) || (props.max && v > String(props.max)))} onClick={() => choose(v)} className="min-h-9 rounded-lg text-sm hover:bg-mobile-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600 aria-pressed:bg-primary-600 aria-pressed:text-white disabled:opacity-30">{i + 1}</button>; })}</div>
      <div className="mt-2 flex justify-between border-t border-mobile-border pt-2"><button type="button" className="min-h-10 px-2 text-sm text-primary-600" onClick={() => choose("")}>{locale === "th" ? "ล้าง" : "Clear"}</button><button type="button" className="min-h-10 px-2 text-sm text-primary-600" disabled={Boolean((props.min && format(new Date()) < String(props.min)) || (props.max && format(new Date()) > String(props.max)))} onClick={() => choose(format(new Date()))}>{locale === "th" ? "วันนี้" : "Today"}</button></div>
    </div>}
  </span>;
});
export default CalendarDateInput;
