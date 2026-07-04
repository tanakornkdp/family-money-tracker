"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Trash2, Pencil } from "lucide-react";
import clsx from "clsx";
import EditTransactionModal from "./EditTransactionModal";

export default function TransactionTable({
  transactions,
  displayNames = {},
  currentUserId,
  currency = "THB",
  categoryIconMap = {},
}: {
  transactions: Transaction[];
  displayNames?: Record<string, string>;
  currentUserId?: string;
  currency?: string;
  categoryIconMap?: Record<string, string>;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [localIconMap, setLocalIconMap] = useState<Record<string, string>>(categoryIconMap);

  const effectiveIconMap = { ...categoryIconMap, ...localIconMap };

  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
  setDeleteError(null);
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
  if (res.ok) {
    router.refresh();
  } else {
    const data = await res.json();
    setDeleteError(data.error ?? "ไม่สามารถลบรายการได้");
  }
};

  const getOwnerLabel = (userId: string) => {
    if (userId === currentUserId) return t.household.you;
    const name = displayNames[userId];
    return name || userId.slice(0, 8);
  };

  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t.transactions.noTransactions}</p>;
  }

  return (
    <>
      {deleteError && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400 mb-3">
          {deleteError}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
              <th className="py-2 pr-4 font-medium">{t.transactions.formTitle}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formCategory}</th>
              <th className="py-2 pr-4 font-medium">{t.household.members}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formDate}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formAmount}</th>
              <th className="py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800">
                <td className="py-3 pr-4 text-slate-900 dark:text-slate-100 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <span>{categoryIconMap[tx.category] ?? "💰"}</span>
                    <span>{tx.title}</span>
                    {tx.payment_method === "credit_card" && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-semibold shrink-0">
                        💳
                      </span>
                    )}
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{tx.category}</td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">
                  {getOwnerLabel(tx.user_id)}
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400">{formatDate(tx.date)}</td>
                <td
                  className={clsx(
                    "py-3 pr-4 font-semibold",
                    tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(tx.amount), currency)}
                </td>
                <td className="py-3 text-right">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setEditingTx(tx)}
                      className="text-slate-400 hover:text-primary-600 transition"
                      aria-label="Edit transaction"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(tx.id)}
                      className="text-slate-400 hover:text-red-600 transition"
                      aria-label="Delete transaction"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingTx && (
        <EditTransactionModal
          transaction={editingTx}
          open={!!editingTx}
          onClose={() => setEditingTx(null)}
        />
      )}
    </>
  );
}