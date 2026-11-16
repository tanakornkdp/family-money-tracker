"use client";

import { useState } from "react";
import { Transaction } from "@/types";
import type { CreditCard } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import TransactionForm from "./TransactionForm";
import TransactionTable from "./TransactionTable";
import TransactionFilterPanel from "./TransactionFilterPanel";
import TransactionImportExport from "./TransactionImportExport";

export default function TransactionsPageClient({
  transactions,
  displayNames,
  currentUserId,
  currency,
  initialCategoryIconMap,
  cardNames,
  cards,
  tripNames,
}: {
  transactions: Transaction[];
  displayNames: Record<string, string>;
  currentUserId: string;
  currency: string;
  initialCategoryIconMap: Record<string, string>;
  cardNames: Record<string, string>;
  cards: CreditCard[];
  tripNames: Record<string, string>;
}) {
  const { t, locale } = useLanguage();
  const [categoryIconMap, setCategoryIconMap] = useState(initialCategoryIconMap);

  const handleIconChanged = (categoryName: string, icon: string) => {
    setCategoryIconMap((prev) => ({ ...prev, [categoryName]: icon }));
  };

  return (
    <div className="flex flex-row gap-6 items-start">
      {/* เพิ่มรายการ - ซ้าย */}
      <div className="w-80 shrink-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          {t.transactions.addTransaction}
        </h2>
        <TransactionForm
          categoryIconMap={categoryIconMap}
          onIconChanged={handleIconChanged}
        />
      </div>

      {/* รายการทั้งหมด - ขวา */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 shrink-0">
            {t.transactions.allTransactions}
          </h2>
        </div>
        <div className="mb-5"><TransactionImportExport transactions={transactions} cards={cards} locale={locale} /></div>
        <TransactionFilterPanel transactions={transactions} displayNames={displayNames} cardNames={cardNames} locale={locale}>
          {(filtered) => <>
            <TransactionTable transactions={filtered} displayNames={displayNames} currentUserId={currentUserId} currency={currency} categoryIconMap={categoryIconMap} tripNames={tripNames} />
            {filtered.length === 0 && transactions.length > 0 && <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t.transactions.noFilteredTransactions}</p>}
          </>}
        </TransactionFilterPanel>
      </div>
    </div>
  );
}
