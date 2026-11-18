"use client";
import Accordion from "@/components/ui/Accordion";
import { useState, type FormEventHandler, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { CalendarDays, ChevronDown, Search } from "lucide-react";

type Locale = "th" | "en";
export const filterLabel = "flex min-w-0 flex-col gap-1.5 text-[13px] font-medium text-mobile-muted";
export const filterSecondary = "inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border border-mobile-border bg-mobile-surface px-4 text-sm font-medium text-mobile-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600";
export const filterChevron = "pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-mobile-muted";
export const filterGrid = "filter-grid grid grid-cols-2 gap-x-3 gap-y-4 max-[340px]:grid-cols-1";

export function formatFilterDate(value: string, locale: Locale) {
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(date);
}

export function FilterSearch({ locale, ...props }: InputHTMLAttributes<HTMLInputElement> & { locale: Locale }) {
  const label = locale === "th" ? "ค้นหาร้านค้าหรือรายละเอียด" : "Search merchant or description";
  return <div className="relative min-w-0">
    <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-mobile-muted" />
    <input {...props} type="search" aria-label={label} placeholder={label} className="field-control field-search" />
  </div>;
}

export function FilterDate({ label, locale, defaultValue, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string; locale: Locale }) {
  const [date, setDate] = useState(String(defaultValue ?? ""));
  return <label className={filterLabel}>
    {label}
    <span className="relative block min-w-0">
      <input {...props} type="date" value={date} onChange={(event) => {
        setDate(event.currentTarget.value);
        props.onChange?.(event);
      }} className="field-control field-date" />
      <span aria-hidden="true" className={"field-date-caption " + (date ? "text-mobile-ink" : "text-mobile-muted")}>
        {date ? formatFilterDate(date, locale) : locale === "th" ? "เลือกวันที่" : "Select date"}
      </span>
      <CalendarDays size={18} aria-hidden="true" className={filterChevron} />
    </span>
  </label>;
}

export function FilterSelect({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return <label className={filterLabel}>
    {label}
    <span className="relative block min-w-0">
      <select {...props} className="field-control field-select">{children}</select>
      <ChevronDown size={18} aria-hidden="true" className={filterChevron} />
    </span>
  </label>;
}

export default function FilterBar({ locale, search, fields, advanced, count, total, onClear, footer, onSubmit }: {
  locale: Locale;
  search: ReactNode;
  fields: ReactNode;
  advanced?: ReactNode;
  count: number;
  total: number;
  onClear?: () => void;
  footer?: ReactNode;
  onSubmit?: FormEventHandler<HTMLFormElement>;
}) {
  const th = locale === "th";
  const numbers = new Intl.NumberFormat(th ? "th-TH" : "en-US");
  return <form method="get" onSubmit={onSubmit} aria-label={th ? "ตัวกรองรายการ" : "Transaction filters"} className="min-w-0 space-y-4 rounded-2xl border border-mobile-border bg-mobile-surface-muted p-4">
    {search}
    <div className={filterGrid}>{fields}</div>
    {advanced && <Accordion className="group border-t border-mobile-border pt-2" triggerClassName="filter-summary relative flex min-h-11 cursor-pointer items-center pr-12 text-sm font-medium" title={<>
        {th ? "ตัวกรองเพิ่มเติม" : "More filters"}
      </>}>
      <div className={filterGrid + " pt-2"}>{advanced}</div>
    </Accordion>}
    <button type="submit" className="min-h-12 w-full rounded-[14px] bg-primary-700 px-4 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">{th ? "ใช้ตัวกรอง" : "Apply filters"}</button>
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-mobile-border pt-2">
      <p role="status" className="text-sm text-mobile-muted">{th ? `แสดง ${numbers.format(count)} จาก ${numbers.format(total)} รายการ` : `Showing ${numbers.format(count)} of ${numbers.format(total)} transactions`}</p>
      {onClear && <button type="button" onClick={onClear} className="ml-auto min-h-11 text-sm font-semibold text-primary-700 dark:text-primary-500">{th ? "ล้างตัวกรอง" : "Clear filters"}</button>}
      {footer}
    </div>
  </form>;
}
