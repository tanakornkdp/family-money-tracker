"use client";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Receipt } from "@/types";
import { formatDate } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ReceiptList({
  receipts,
  currency = "THB",
}: {
  receipts: Receipt[];
  currency?: string;
}) {

  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startConvert = (receipt: Receipt) => {
    setConvertingId(receipt.id);
    setTitle(receipt.parsed_merchant ?? "");
    setCategory("");
  };

  const handleConvert = async (receipt: Receipt) => {
    if (!receipt.parsed_amount) return;
    setLoading(true);
    setError(null);

    try {
      const userResult = await supabase.auth.getUser();
      const currentUser = userResult.data.user;

      if (!currentUser) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || "Receipt purchase",
          amount: receipt.parsed_amount,
          type: "expense",
          category: category || "Other",
          date: receipt.parsed_date || new Date().toISOString().split("T")[0],
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create transaction");
      }

      const resultData = await res.json();
      const newTransactionId = resultData.transaction.id;

      await supabase
        .from("receipts")
        .update({
          status: "converted",
          transaction_id: newTransactionId,
        })
        .eq("id", receipt.id);

      setConvertingId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (receipts.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {t.receipts.noReceipts}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {receipts.map((r) => (
        <div
          key={r.id}
          className="rounded-xl border border-slate-200 dark:border-slate-800 p-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900 dark:text-slate-100">
                {r.parsed_merchant || "Unprocessed receipt"}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {formatDate(r.created_at)} - Status: {r.status}
              </p>
            </div>
           {r.parsed_amount && (
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(r.parsed_amount, currency)}
              </p>
            )}
          </div>

          {r.status === "processed" && (
            <div className="mt-3">
              {convertingId === r.id ? (
                <div className="space-y-2">
                  <Input
                    label={t.transactions.formTitle}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Input
                    label={t.transactions.formCategory}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="e.g. Groceries"
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleConvert(r)} disabled={loading}>
                      {t.goals.confirmAdd}
                    </Button>
                    <Button variant="secondary" onClick={() => setConvertingId(null)}>
                      {t.goals.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="secondary"
                  onClick={() => startConvert(r)}
                  className="w-full"
                >
                  {t.transactions.addTransaction}
                </Button>
              )}
            </div>
          )}

          {r.status === "failed" && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              OCR processing failed. Try uploading a clearer image.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}