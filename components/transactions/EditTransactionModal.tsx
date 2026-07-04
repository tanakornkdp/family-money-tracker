"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Transaction, TransactionType, Category, FinancialGoal } from "@/types";
import { getCategories, getCategoryIconMap } from "@/services/categories";
import { getGoals } from "@/services/goals";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function EditTransactionModal({
  transaction,
  open,
  onClose,
}: {
  transaction: Transaction;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [title, setTitle] = useState(transaction.title);
  const [type, setType] = useState<TransactionType>(transaction.type);
  const [category, setCategory] = useState(transaction.category);
  const [goalId, setGoalId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadOptions() {
    try {
      const catData = await getCategories(supabase);
      const iconMap = await getCategoryIconMap(supabase);
      const goalData = await getGoals(supabase);

      setCategories(catData);
      setCategoryIconMap(iconMap);
      setGoals(goalData.filter((g) => g.status === "active"));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setTitle(transaction.title);
      setType(transaction.type);
      setCategory(transaction.category);
      loadOptions();
    });
  }, [open, transaction]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/transactions/${transaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title,
          type: type,
          category: category,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to update transaction");
      }

      if (goalId) {
        await supabase.from("goal_contributions").insert({
          goal_id: goalId,
          user_id: transaction.user_id,
          amount: Number(transaction.amount),
          note: "Linked from transaction: " + title,
        });
      }

      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={t.transactions.editTransaction}>
      <div className="space-y-4">
        <Input
          label={t.transactions.formTitle}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
          <span className="text-2xl">{categoryIconMap[category] ?? "💰"}</span>
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {t.transactions.formCategory}: {category}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.transactions.formType}
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="expense">{t.transactions.expense}</option>
            <option value="income">{t.transactions.income}</option>
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.transactions.formCategory}
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {categoryIconMap[c.name] ?? "💰"} {c.name}
              </option>
            ))}
          </select>
        </div>

        {goals.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.transactions.linkToGoal}
            </label>
            <select
              value={goalId}
              onChange={(e) => setGoalId(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t.transactions.noGoalLink}</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={loading || !title.trim()}>
            {t.transactions.saveChanges}
          </Button>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            {t.transactions.newCategoryCancel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}