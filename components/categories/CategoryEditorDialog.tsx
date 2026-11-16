"use client";

import { useEffect, useId, useRef } from "react";
import { TITLE_ICONS } from "@/lib/constants/titleIcons";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function CategoryEditorDialog({ editing, name, icon, busy, error, onName, onIcon, onSave, onClose }: {
  editing?: boolean;
  name: string;
  icon: string;
  busy: boolean;
  error?: string | null;
  onName: (value: string) => void;
  onIcon: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const { t, locale } = useLanguage();
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    element.showModal();
    return () => element.close();
  }, []);

  return <dialog ref={dialog} aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-mobile-border bg-mobile-surface p-4 text-mobile-ink backdrop:bg-black/50">
    <h2 id={titleId} className="mb-4 text-lg font-semibold">{editing ? t.categories.edit : t.categories.createCategory}</h2>
    <div className="space-y-3">
      <Input autoFocus label={t.categories.categoryName} value={name} disabled={busy} onChange={event => onName(event.target.value)}
        onKeyDown={event => {
          if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
          event.preventDefault();
          if (!busy && name.trim()) onSave();
        }} />
      <fieldset disabled={busy}>
        <legend className="mb-1 text-sm">{locale === "th" ? "เลือกไอคอน" : "Choose icon"}</legend>
        <div className="grid max-h-[min(12rem,30dvh)] grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1 overflow-y-auto overscroll-contain p-1">
          {[...new Set(TITLE_ICONS)].map(choice => <button key={choice} type="button" aria-pressed={icon === choice} onClick={() => onIcon(choice)}
            className="min-h-11 rounded-lg border border-mobile-border bg-mobile-surface-muted text-lg focus-visible:outline-2 aria-pressed:border-emerald-600 aria-pressed:bg-emerald-100 dark:aria-pressed:bg-emerald-950">{choice}</button>)}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={busy || !name.trim()} onClick={onSave}>{editing ? t.categories.saveChanges : t.categories.create}</Button>
        <Button type="button" variant="secondary" disabled={busy} onClick={onClose}>{t.categories.cancel}</Button>
      </div>
    </div>
  </dialog>;
}
