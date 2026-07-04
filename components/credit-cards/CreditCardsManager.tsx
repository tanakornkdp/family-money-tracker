"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createCreditCard, updateCreditCard, deleteCreditCard } from "@/services/creditCards";
import { CreditCard, CardType } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { Pencil, Trash2, Plus } from "lucide-react";

type CardWithBalance = CreditCard & { balance: number; available: number };

const CARD_COLORS = [
  "#6366f1", "#ec4899", "#f97316", "#22c55e",
  "#3b82f6", "#a855f7", "#ef4444", "#06b6d4",
];

const CardTypeSelector = ({
  value,
  onChange,
  creditLabel,
  debitLabel,
}: {
  value: CardType;
  onChange: (v: CardType) => void;
  creditLabel: string;
  debitLabel: string;
}) => (
  <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
    <button type="button" onClick={() => onChange("credit")}
      className={`flex-1 py-2 text-sm font-semibold transition-all ${value === "credit" ? "bg-indigo-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500"}`}>
      💳 {creditLabel}
    </button>
    <button type="button" onClick={() => onChange("debit")}
      className={`flex-1 py-2 text-sm font-semibold transition-all ${value === "debit" ? "bg-emerald-500 text-white" : "bg-white dark:bg-slate-800 text-slate-500"}`}>
      🏧 {debitLabel}
    </button>
  </div>
);

export default function CreditCardsManager({
  initialCards, userId, currency,
}: {
  initialCards: CardWithBalance[];
  userId: string;
  currency: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [cards, setCards] = useState<CardWithBalance[]>(initialCards);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCardType, setNewCardType] = useState<CardType>("credit");
  const [newLimit, setNewLimit] = useState("");
  const [newBillingDate, setNewBillingDate] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newColor, setNewColor] = useState(CARD_COLORS[0]);

  const [editingCard, setEditingCard] = useState<CardWithBalance | null>(null);
  const [editName, setEditName] = useState("");
  const [editCardType, setEditCardType] = useState<CardType>("credit");
  const [editLimit, setEditLimit] = useState("");
  const [editBillingDate, setEditBillingDate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editColor, setEditColor] = useState(CARD_COLORS[0]);

  const [payingCard, setPayingCard] = useState<CardWithBalance | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const newCard = await createCreditCard(supabase, userId, {
        name: newName.trim(),
        card_type: newCardType,
        credit_limit: newCardType === "credit" ? parseFloat(newLimit) : 0,
        billing_date: newBillingDate ? parseInt(newBillingDate) : null,
        due_date: newDueDate ? parseInt(newDueDate) : null,
        color: newColor,
      });
      setCards((prev) => [...prev, { ...newCard, balance: 0, available: newCard.credit_limit }]);
      setShowCreateModal(false);
      setNewName(""); setNewLimit(""); setNewBillingDate(""); setNewDueDate("");
      setNewCardType("credit"); setNewColor(CARD_COLORS[0]);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (card: CardWithBalance) => {
    setEditingCard(card);
    setEditName(card.name);
    setEditCardType(card.card_type);
    setEditLimit(card.credit_limit.toString());
    setEditBillingDate(card.billing_date?.toString() ?? "");
    setEditDueDate(card.due_date?.toString() ?? "");
    setEditColor(card.color);
  };

  const handleEdit = async () => {
    if (!editingCard || !editName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await updateCreditCard(supabase, editingCard.id, {
        name: editName.trim(),
        card_type: editCardType,
        credit_limit: editCardType === "credit" ? parseFloat(editLimit) : 0,
        billing_date: editBillingDate ? parseInt(editBillingDate) : null,
        due_date: editDueDate ? parseInt(editDueDate) : null,
        color: editColor,
      });
      setCards((prev) =>
        prev.map((c) => c.id === updated.id
          ? { ...updated, balance: c.balance, available: updated.credit_limit - c.balance }
          : c
        )
      );
      setEditingCard(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cardId: string) => {
    setLoading(true);
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
    if (!payingCard || !payAmount) return;
    setLoading(true);
    setError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const isDebit = payingCard.card_type === "debit";
      await supabase.from("transactions").insert({
        user_id: userData.user.id,
        title: isDebit ? `เติมเงิน ${payingCard.name}` : `ชำระบัตร ${payingCard.name}`,
        amount: parseFloat(payAmount),
        type: isDebit ? "expense" : "income",  // debit=expense, credit=income
        category: isDebit ? "เติมเงินวอลเล็ต" : "ชำระบัตรเครดิต",
        date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        card_id: payingCard.id,
      });

      const paid = parseFloat(payAmount);
      setCards((prev) =>
        prev.map((c) =>
          c.id === payingCard.id
            ? {
                ...c,
                balance: isDebit ? c.balance + paid : Math.max(0, c.balance - paid),
                available: isDebit ? c.available + paid : Math.min(c.credit_limit, c.available + paid),
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

      <Button onClick={() => setShowCreateModal(true)}>
        <Plus size={16} className="mr-1" /> {t.creditCards.addCard}
      </Button>

      {cards.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.creditCards.noCards}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => (
            <div key={card.id} className="rounded-2xl p-5 text-white shadow-lg relative overflow-hidden flex flex-col"
              style={{ background: `linear-gradient(135deg, ${card.color}dd, ${card.color}99)` }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
              <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/10 translate-y-8 -translate-x-8" />

              <div className="relative z-10 flex flex-col flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs text-white/70 font-medium uppercase tracking-wide">
                      {card.card_type === "debit" ? "🏧 " + t.creditCards.debit : "💳 " + t.creditCards.credit}
                    </p>
                    <h3 className="font-bold text-lg">{card.name}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(card)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => setConfirmDeleteId(card.id)} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-xs text-white/70">{t.creditCards.balance}</p>
                  <p className="text-2xl font-bold">{formatCurrency(card.balance, currency)}</p>
                </div>

                {card.card_type === "credit" && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-white/80 mb-1.5">
                      <span>{t.creditCards.used}: {usedPercent(card).toFixed(0)}%</span>
                      <span>{t.creditCards.available}: {formatCurrency(card.available, currency)}</span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-white rounded-full transition-all" style={{ width: `${usedPercent(card)}%` }} />
                    </div>
                  </div>
                )}

                {(card.billing_date || card.due_date) && card.card_type === "credit" && (
                  <div className="flex gap-3 text-xs text-white/70 mb-3">
                    {card.billing_date && <span>📅 {t.creditCards.billingCycle.replace("{day}", String(card.billing_date))}</span>}
                    {card.due_date && <span>⏰ {t.creditCards.dueCycle.replace("{day}", String(card.due_date))}</span>}
                  </div>
                )}

                <button
                  onClick={() => { setPayingCard(card); setPayAmount(""); }}
                  className="w-full py-2 rounded-xl bg-white/20 hover:bg-white/30 text-sm font-semibold transition mt-auto"
                >
                  {card.card_type === "debit" ? `💰 ${t.creditCards.topUp}` : `💳 ${t.creditCards.payCard}`}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title={t.creditCards.addCard}>
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t.creditCards.cardType}</p>
            <CardTypeSelector value={newCardType} onChange={setNewCardType} creditLabel={t.creditCards.credit} debitLabel={t.creditCards.debit} />
          </div>
          <Input label={t.creditCards.cardName} value={newName} onChange={(e) => setNewName(e.target.value)} />
          {newCardType === "credit" && (
            <>
              <Input label={t.creditCards.creditLimit} type="number" min="0" value={newLimit} onChange={(e) => setNewLimit(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label={t.creditCards.billingDate} type="number" min="1" max="31" value={newBillingDate} onChange={(e) => setNewBillingDate(e.target.value)} />
                <Input label={t.creditCards.dueDate} type="number" min="1" max="31" value={newDueDate} onChange={(e) => setNewDueDate(e.target.value)} />
              </div>
            </>
          )}
          <div>
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.creditCards.cardColor}</p>
            <div className="flex gap-2 flex-wrap">
              {CARD_COLORS.map((color) => (
                <button key={color} type="button" onClick={() => setNewColor(color)}
                  className="w-8 h-8 rounded-full transition border-2"
                  style={{ backgroundColor: color, borderColor: newColor === color ? "#fff" : "transparent", boxShadow: newColor === color ? `0 0 0 2px ${color}` : "none" }} />
              ))}
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={loading || !newName.trim()}>{t.creditCards.addCard}</Button>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>{t.creditCards.cancel}</Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editingCard && (
        <Modal open={!!editingCard} onClose={() => setEditingCard(null)} title={t.creditCards.editCardTitle.replace("{name}", editingCard.name)}>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">{t.creditCards.cardType}</p>
              <CardTypeSelector value={editCardType} onChange={setEditCardType} creditLabel={t.creditCards.credit} debitLabel={t.creditCards.debit} />
            </div>
            <Input label={t.creditCards.cardName} value={editName} onChange={(e) => setEditName(e.target.value)} />
            {editCardType === "credit" && (
              <>
                <Input label={t.creditCards.creditLimit} type="number" min="0" value={editLimit} onChange={(e) => setEditLimit(e.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label={t.creditCards.billingDate} type="number" min="1" max="31" value={editBillingDate} onChange={(e) => setEditBillingDate(e.target.value)} />
                  <Input label={t.creditCards.dueDate} type="number" min="1" max="31" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
                </div>
              </>
            )}
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{t.creditCards.cardColor}</p>
              <div className="flex gap-2 flex-wrap">
                {CARD_COLORS.map((color) => (
                  <button key={color} type="button" onClick={() => setEditColor(color)}
                    className="w-8 h-8 rounded-full transition border-2"
                    style={{ backgroundColor: color, borderColor: editColor === color ? "#fff" : "transparent", boxShadow: editColor === color ? `0 0 0 2px ${color}` : "none" }} />
                ))}
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button onClick={handleEdit} disabled={loading || !editName.trim()}>{t.categories.saveChanges}</Button>
              <Button variant="secondary" onClick={() => setEditingCard(null)}>{t.creditCards.cancel}</Button>
            </div>
          </div>
        </Modal>
      )}

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