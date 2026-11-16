"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { cardColors, cardColorToken, type CardColor } from "@/lib/utils/cardColors";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { CreditCard } from "@/types";
import Input from "@/components/ui/Input";
import { saveCard } from "./saveCard";

export default function CardEditorSheet({ card, onClose, onSaved }: {
  card?: CreditCard;
  onClose: () => void;
  onSaved: (card: CreditCard) => void;
}) {
  const { t, locale } = useLanguage();
  const th = locale === "th";
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [form, setForm] = useState(() => ({
    name: card?.name ?? "", type: card?.card_type ?? "credit",
    limit: card?.credit_limit.toString() ?? "",
    billingDay: card?.billing_date?.toString() ?? "", dueDay: card?.due_date?.toString() ?? "",
    color: card ? cardColorToken(card.color) ?? "indigo" : "indigo",
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { node?.close(); document.body.style.overflow = previous; };
  }, []);
  const field = "h-12 min-w-0 text-base!";
  return <dialog ref={dialog} aria-labelledby={title} onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90vh] w-full max-w-none overflow-auto overscroll-contain rounded-t-3xl border border-mobile-border bg-mobile-surface text-mobile-ink backdrop:bg-black/60 backdrop:backdrop-blur-sm supports-[height:100dvh]:max-h-[90dvh] sm:inset-0 sm:m-auto sm:max-w-md sm:rounded-2xl">
    <form onSubmit={async event => {
      event.preventDefault();
      if (busy) return;
      setBusy(true);
      setError(undefined);
      try {
        const base = { name: form.name, color: form.color };
        const result = await saveCard(form.type === "debit" ? { ...base, card_type: "debit" } : {
          ...base, card_type: "credit", credit_limit: Number(form.limit),
          billing_date: form.billingDay ? Number(form.billingDay) : undefined,
          due_date: form.dueDay ? Number(form.dueDay) : undefined,
        }, card?.id);
        if (result.card) { onSaved(result.card); return; }
        if (result.error === "invalid") {
          setError(th ? "ตรวจชื่อบัตร วงเงิน และวันรอบบิลอีกครั้ง" : "Check the card name, credit limit and billing days.");
        } else {
          setError(th ? "บันทึกบัตรไม่ได้ กรุณาลองอีกครั้ง" : "Could not save the card. Please try again.");
        }
      } catch {
        setError(th ? "บันทึกบัตรไม่ได้ กรุณาลองอีกครั้ง" : "Could not save the card. Please try again.");
      } finally {
        setBusy(false);
      }
    }}>
      <div className="space-y-4 p-5">
        <header className="flex items-center justify-between">
          <h2 id={title} className="text-lg font-semibold">{card ? (th ? "แก้ไขบัตร" : "Edit Card") : t.creditCards.addCard}</h2>
          <button type="button" disabled={busy} onClick={onClose} aria-label={t.mobile.close} className="grid size-11 place-items-center rounded-xl"><X size={20} /></button>
        </header>
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="sr-only">{t.creditCards.cardType}</legend>
          <div className="grid grid-cols-2 gap-2">{(["credit", "debit"] as const).map(type => (
            <button key={type} type="button" aria-pressed={form.type === type} onClick={() => setForm(f => ({ ...f, type }))}
              className="min-h-12 rounded-xl border border-mobile-border px-2 text-sm font-semibold aria-pressed:bg-primary-700 aria-pressed:text-white">
              {type === "credit" ? t.creditCards.credit : t.creditCards.debit}
            </button>
          ))}</div>
          <Input label={t.creditCards.cardName} value={form.name} maxLength={50} required className={field}
            onChange={event => setForm(f => ({ ...f, name: event.target.value }))} />
          {form.type === "credit" && <>
            <Input label={t.creditCards.creditLimit} type="number" inputMode="decimal" min="0.01" step="0.01" required value={form.limit} className={field}
              onChange={event => setForm(f => ({ ...f, limit: event.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label={t.creditCards.billingDate} type="number" inputMode="numeric" min="1" max="31" value={form.billingDay} className={field}
                onChange={event => setForm(f => ({ ...f, billingDay: event.target.value }))} />
              <Input label={t.creditCards.dueDate} type="number" inputMode="numeric" min="1" max="31" value={form.dueDay} className={field}
                onChange={event => setForm(f => ({ ...f, dueDay: event.target.value }))} />
            </div>
          </>}
          <div>
            <p className="mb-2 text-sm font-medium">{t.creditCards.cardColor}</p>
            <div className="flex flex-wrap gap-2">{(Object.keys(cardColors) as CardColor[]).map(color => (
              <button key={color} type="button" aria-label={t.creditCards.cardColor + " " + color} aria-pressed={form.color === color}
                onClick={() => setForm(f => ({ ...f, color }))}
                className="grid size-10 place-items-center rounded-full text-white aria-pressed:ring-2 aria-pressed:ring-white aria-pressed:ring-offset-2 aria-pressed:ring-offset-slate-500"
                style={{ backgroundColor: cardColors[color] }}>
                {form.color === color && <Check size={18} aria-hidden="true" />}
              </button>
            ))}</div>
            <div aria-hidden="true" className="mt-4 h-3 rounded-full" style={{ backgroundColor: cardColors[form.color] }} />
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      </div>
      <footer className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-mobile-border bg-mobile-surface px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button type="button" onClick={onClose} disabled={busy} className="h-12 rounded-xl border border-mobile-border text-sm font-semibold">{t.creditCards.cancel}</button>
        <button type="submit" disabled={busy} className="h-12 rounded-xl bg-primary-700 text-sm font-semibold text-white disabled:opacity-60">
          {busy ? (th ? "กำลังบันทึก…" : "Saving…") : (th ? "บันทึก" : "Save")}
        </button>
      </footer>
    </form>
  </dialog>;
}
