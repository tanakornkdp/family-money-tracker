"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function subscribe(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener("finance:review-updated", listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener("finance:review-updated", listener);
  };
}

export default function DuplicateReviewActions({ userId, groupKey, entries }: { userId: string; groupKey: string; entries: { id: string; label: string }[] }) {
  const { t } = useLanguage();
  const copy = t.mobile.reviewPage;
  const storageKey = "finance:duplicate:" + userId + ":" + groupKey;
  const saved = useSyncExternalStore(subscribe, () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  }, () => null);
  const done = saved !== null;
  const [draft, setSelected] = useState(() => entries.map(entry => entry.id));
  let selected = draft;
  if (saved) {
    try {
      const values: unknown = JSON.parse(saved);
      if (Array.isArray(values)) selected = entries.filter((entry, index) => values.includes(entry.id) || values.includes(index)).map(entry => entry.id);
    } catch { /* Older records may contain only a completion flag. */ }
  }
  const [error, setError] = useState("");
  const keepAll = selected.length === entries.length;
  return <details open className="mt-2">
    <summary className="cursor-pointer py-2 text-sm font-semibold text-emerald-700">{copy.compare}</summary>
    <fieldset disabled={done} className="space-y-2 text-sm">
      <legend className="mb-2">{copy.chooseToKeep}</legend>
      {entries.map(({ id, label }, index) => {
        const checked = selected.includes(id);
        return <div key={id} className={`rounded-xl border px-3 py-2 ${checked ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40" : "border-mobile-border"}`}>
          <label className="flex min-h-10 cursor-pointer items-start gap-3">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-emerald-700" checked={checked} onChange={event => setSelected(current => event.target.checked ? [...current, id] : current.filter(value => value !== id))} />
          <span className="min-w-0 break-words">
            <span className={`block text-xs font-semibold ${checked ? "text-emerald-800 dark:text-emerald-200" : "text-mobile-muted"}`}>{copy.item.replace("{index}", String(index + 1))} · {checked ? copy.keep : copy.notSelected}</span>
            <span className="mt-0.5 block">{label}</span>
          </span>
          </label>
          <Link href={`/mobile/transactions?focus=${encodeURIComponent(id)}`} className="inline-flex min-h-9 items-center text-xs font-semibold underline">{copy.openItem.replace("{index}", String(index + 1))}</Link>
        </div>;
      })}
    </fieldset>
    <p aria-live="polite" className="mt-3 text-sm font-semibold tabular-nums">{copy.selectedCount.replace("{selected}", String(selected.length)).replace("{total}", String(entries.length))}</p>
    <button type="button" disabled={done || selected.length === 0} onClick={() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(selected));
      } catch { setError(copy.saveError); return; }
      setError("");
      window.dispatchEvent(new Event("finance:review-updated"));
    }} className="mt-2 min-h-10 rounded-xl border border-mobile-border px-3 text-sm">
      {done ? copy.reviewSaved : keepAll ? copy.reviewedAll : copy.saveReview}
    </button>
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </details>;
}
