"use client";

import { useState, useMemo } from "react";
import { Transaction } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import TransactionForm from "./TransactionForm";
import TransactionTable from "./TransactionTable";
import { Search } from "lucide-react";

export default function TransactionsPageClient({
  transactions,
  displayNames,
  currentUserId,
  currency,
  initialCategoryIconMap,
  userProfiles = {},
  serverSideDebug,
}: {
  transactions: Transaction[];
  displayNames: Record<string, string>;
  currentUserId: string;
  currency: string;
  initialCategoryIconMap: Record<string, string>;
  userProfiles?: Record<string, { name: string; avatarUrl: string | null }>;
  serverSideDebug?: unknown;
}) {
  const { t } = useLanguage();
  const [categoryIconMap, setCategoryIconMap] = useState(initialCategoryIconMap);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState("all");

  const handleIconChanged = (categoryName: string, icon: string) => {
    setCategoryIconMap((prev) => ({ ...prev, [categoryName]: icon }));
  };

  const handleCategoryRenamed = (oldName: string, newName: string, icon: string) => {
    setCategoryIconMap((prev) => {
      const next = { ...prev };
      delete next[oldName];
      next[newName] = icon;
      return next;
    });
  };

  const categories = useMemo(() => {
    const set = new Set(transactions.map((tx) => tx.category));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      const matchSearch =
        searchQuery === "" ||
        tx.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (displayNames[tx.user_id] ?? "").toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = filterType === "all" || tx.type === filterType;
      const matchCategory = filterCategory === "all" || tx.category === filterCategory;

      return matchSearch && matchType && matchCategory;
    });
  }, [transactions, searchQuery, filterType, filterCategory, displayNames]);

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
          onCategoryRenamed={handleCategoryRenamed}
        />
      </div>

      {/* รายการทั้งหมด - ขวา */}
      <div className="flex-1 min-w-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 shrink-0">
            {t.transactions.allTransactions}
          </h2>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.transactions.searchPlaceholder}
                className="pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500 w-52"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as "all" | "income" | "expense")}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t.transactions.filterTypeLabel}</option>
              <option value="income">{t.transactions.income}</option>
              <option value="expense">{t.transactions.expense}</option>
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">{t.transactions.filterCategoryLabel}</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryIconMap[cat] ?? "💰"} {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <TransactionTable
          transactions={filtered}
          displayNames={displayNames}
          currentUserId={currentUserId}
          currency={currency}
          categoryIconMap={categoryIconMap}
          userProfiles={userProfiles}
          serverSideDebug={serverSideDebug}
        />

        {filtered.length === 0 && transactions.length > 0 && (
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-6">
            {t.transactions.noFilteredTransactions}
          </p>
        )}
      </div>
    </div>
  );
}