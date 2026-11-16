"use client";

import { toDateInputValue } from "@/lib/utils/dateHelpers";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteCreditCard } from "@/services/creditCards";
import { CreditCard } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import CardEditorSheet from "./CardEditorSheet";
import { cardBackground } from "@/lib/utils/cardColors";
import { Pencil, Trash2, Plus } from "lucide-react";

type CardWithBalance = CreditCard & { balance: number; available: number };

export default function CreditCardsManager({
  initialCards, currency, compact = false,
}: {
  initialCards: CardWithBalance[];
  currency: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const [cards, setCards] = useState<CardWithBalance[]>(initialCards);
  const [previousSnapshot, setPreviousSnapshot] = useState(initialCards);
  if (previousSnapshot !== initialCards) {
    setPreviousSnapshot(initialCards);
    setCards(initialCards);
  }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardWithBalance | null>(null);
  const [notice, setNotice] = useState("");

  const [payingCard, setPayingCard] = useState<CardWithBalance | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleSaved = (updated: CreditCard) => {
    setCards(previous => {
      const original = previous.find(card => card.id === updated.id);
      const balance = original?.balance ?? 0;
      const card = { ...updated, balance, available: updated.card_type === "debit" ? balance : updated.credit_limit - balance };
      return original ? previous.map(item => item.id === card.id ? card : item) : [...previous, card];
    });
    setEditingCard(null);
    setShowCreateModal(false);
    setNotice(locale === "th" ? "บันทึกแล้ว" : "Saved");
  };

  const handleDelete = async (cardId: string) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      await deleteCreditCard(supabase, cardId);
      setCards((prev) => prev.filter((c) => c.id !== cardId));
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handlePayCard = async () => {
    const paid = Number(payAmount);
    if (!payingCard || loading || !Number.isFinite(paid) || paid <= 0) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const isDebit = payingCard.card_type === "debit";
      const { error: paymentError } = await supabase.from("transactions").insert({
        user_id: userData.user.id,
        title: isDebit ? `เติมเงิน ${payingCard.name}` : `ชำระบัตร ${payingCard.name}`,
        amount: parseFloat(payAmount),
        type: isDebit ? "expense" : "income",  // debit=expense, credit=income
        category: isDebit ? "เติมเงินวอลเล็ต" : "ชำระบัตรเครดิต",
        date: toDateInputValue(),
        payment_method: "cash",
        card_id: payingCard.id,
      });
      if (paymentError) throw paymentError;
      setCards((prev) =>
        prev.map((c) =>
          c.id === payingCard.id
            ? {
                ...c,
                balance: isDebit ? c.balance + paid : c.balance - paid,
                available: c.available + paid,
              }
            : c
        )
      );
      setPayingCard(null);
      setPayAmount("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };    

  const usedPercent = (card: CardWithBalance) =>
    card.credit_limit > 0 ? Math.min(100, (card.balance / card.credit_limit) * 100) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <Button onClick={() => { setNotice(""); setShowCreateModal(true); }} className="inline-flex h-12 items-center gap-2 whitespace-nowrap px-5">
        <Plus size={16} aria-hidden="true" /> {t.creditCards.addCard}
      </Button>

      <p role="status" className={notice ? "text-sm font-medium text-emerald-700 dark:text-emerald-300" : "sr-only"}>{notice}</p>

      {cards.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.creditCards.noCards}</p>
        </Card>
      ) : (
        <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${compact ? "gap-3" : "gap-5"}`}>
          {cards.map((card) => (
            <div key={card.id} className={`relative flex h-[264px] flex-col overflow-hidden rounded-2xl text-white shadow-lg ${compact ? "p-4" : "h-[312px] p-5"}`}
              style={{ background: cardBackground(card.color) }}>
              <div className={`pointer-events-none absolute right-0 top-0 rounded-full bg-white/10 ${compact ? "h-24 w-24 -translate-y-7 translate-x-7" : "h-32 w-32 -translate-y-8 translate-x-8"}`} />
              <div className={`pointer-events-none absolute bottom-0 left-0 rounded-full bg-white/10 ${compact ? "h-16 w-16 translate-y-6 -translate-x-6" : "h-24 w-24 translate-y-8 -translate-x-8"}`} />

              <div className="relative z-10 flex h-full flex-col">
                <div className={`mb-3 flex min-h-[52px] items-start justify-between gap-2 ${compact ? "" : "mb-4"}`}>
                  <div className="min-w-0">
                    <p className="text-xs text-white/70 font-medium uppercase tracking-wide">
                      {card.card_type === "debit" ? "🏧 " + t.creditCards.debit : "💳 " + t.creditCards.credit}
                    </p>
                    <h3 className={`line-clamp-2 break-words font-bold ${compact ? "text-base" : "text-lg"}`}>{card.name}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <button type="button" aria-label={t.creditCards.editCardTitle.replace("{name}", card.name)} onClick={() => { setNotice(""); setEditingCard(card); }} className="grid size-11 place-items-center rounded-lg bg-white/20 hover:bg-white/30 transition">
                      <Pencil size={13} />
                    </button>
                    <button type="button" aria-label={t.creditCards.delete + " " + card.name} onClick={() => { setError(null); setConfirmDeleteId(card.id); }} className="grid size-11 place-items-center rounded-lg bg-white/20 hover:bg-white/30 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className={`mb-3 min-h-[48px] ${compact ? "" : "mb-4"}`}>
                  <p className="text-xs text-white/70">{t.creditCards.balance}</p>
                  <p className={`font-bold ${compact ? "text-xl" : "text-2xl"}`}>{formatCurrency(card.balance, currency)}</p>
                </div>

                <div className={`min-h-[34px] ${compact ? "mb-2" : "mb-3"}`}>
                  {card.card_type === "credit" ? (
                    <div className="mb-1.5 flex justify-between gap-2 text-[11px] text-white/80">
                      <span>{t.creditCards.used}: {usedPercent(card).toFixed(0)}%</span>
                      <span>{t.creditCards.available}: {formatCurrency(card.available, currency)}</span>
                    </div>
                  ) : (
                    <div aria-hidden="true" className="h-[34px]" />
                  )}
                  {card.card_type === "credit" && (
                    <div className="w-full overflow-hidden rounded-full bg-white/20 h-1.5">
                      <div className="h-full rounded-full bg-white transition-all" style={{ width: `${usedPercent(card)}%` }} />
                    </div>
                  )}
                </div>

                <div className={`mb-2 flex min-h-[18px] flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/70 ${compact ? "" : "text-xs"}`}>
                  {card.card_type === "credit" && card.billing_date && <span>📅 {t.creditCards.billingCycle.replace("{day}", String(card.billing_date))}</span>}
                  {card.card_type === "credit" && card.due_date && <span>⏰ {t.creditCards.dueCycle.replace("{day}", String(card.due_date))}</span>}
                </div>

                <button
                  onClick={() => { setError(null); setPayingCard(card); setPayAmount(""); }}
                  className={`mt-auto w-full rounded-xl bg-white/20 font-semibold transition hover:bg-white/30 ${compact ? "py-2 text-xs" : "py-2 text-sm"}`}
                >
                  {card.card_type === "debit" ? `💰 ${t.creditCards.topUp}` : `💳 ${t.creditCards.payCard}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showCreateModal || editingCard) && <CardEditorSheet
        key={editingCard?.id ?? "new"}
        card={editingCard ?? undefined}
        onClose={() => { setShowCreateModal(false); setEditingCard(null); }}
        onSaved={handleSaved}
      />}

      {/* Pay / Top Up Modal */}
      {payingCard && (
        <Modal open={!!payingCard} onClose={() => setPayingCard(null)}
          title={payingCard.card_type === "debit" ? `${t.creditCards.topUp} — ${payingCard.name}` : `${t.creditCards.payCard} — ${payingCard.name}`}>
          <div className="space-y-4">
            <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">{t.creditCards.balance}</span>
                <span className="font-semibold text-rose-600">{formatCurrency(payingCard.balance, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{t.creditCards.available}</span>
                <span className="font-semibold text-emerald-600">{formatCurrency(payingCard.available, currency)}</span>
              </div>
            </div>

            <Input
              label={t.creditCards.payAmount}
              type="number" min="0" step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
            />

            {payingCard.card_type === "credit" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => setPayAmount(payingCard.balance.toString())}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition">
                  {t.creditCards.payFull}
                </button>
                <button type="button" onClick={() => setPayAmount((payingCard.balance / 2).toFixed(2))}
                  className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 transition">
                  {t.creditCards.payHalf}
                </button>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handlePayCard} disabled={loading || !payAmount || parseFloat(payAmount) <= 0}>
                {payingCard.card_type === "debit" ? t.creditCards.topUp : t.creditCards.confirmPay}
              </Button>
              <Button variant="secondary" onClick={() => setPayingCard(null)}>{t.creditCards.cancel}</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirm Delete */}
      {confirmDeleteId && (
        <Modal open={!!confirmDeleteId} onClose={() => setConfirmDeleteId(null)} title={t.creditCards.deleteConfirm}>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {t.creditCards.deleteDisclaimer}
            </p>
            {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => handleDelete(confirmDeleteId)} disabled={loading}>{t.creditCards.delete}</Button>
              <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>{t.creditCards.cancel}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
