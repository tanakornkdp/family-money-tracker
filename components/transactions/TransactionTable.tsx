"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Transaction } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/dateHelpers";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { Trash2, Pencil, Banknote, CreditCard, Wallet, MoreHorizontal } from "lucide-react";
import clsx from "clsx";
import EditTransactionModal from "./EditTransactionModal";
import { createClient } from "@/lib/supabase/client";

export default function TransactionTable({
  transactions,
  displayNames = {},
  currentUserId,
  currency = "THB",
  categoryIconMap = {},
  userProfiles = {},
  serverSideDebug,
}: {
  transactions: Transaction[];
  displayNames?: Record<string, string>;
  currentUserId?: string;
  currency?: string;
  categoryIconMap?: Record<string, string>;
  userProfiles?: Record<string, { name: string; avatarUrl: string | null }>;
  serverSideDebug?: unknown;
}) {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [localIconMap, setLocalIconMap] = useState<Record<string, string>>(categoryIconMap);

  const [clientProfiles, setClientProfiles] = useState<Record<string, { name: string; avatarUrl: string | null }>>({});

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const uniqueUserIds = Array.from(new Set(transactions.map((tx) => tx.user_id)));
      if (uniqueUserIds.length === 0) return;

      const supabase = createClient();
      
      const map: Record<string, { name: string; avatarUrl: string | null }> = {};
      
      // Try to get authenticated user's session profile details
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          map[user.id] = {
            name: user.user_metadata?.full_name || user.email?.split("@")[0] || "You",
            avatarUrl: user.user_metadata?.avatar_url || null,
          };
        }
      } catch (err) {
        console.error("Error getting user in TransactionTable:", err);
      }

      // Query database user_settings for all unique users
      try {
        const { data, error } = await supabase
          .from("user_settings")
          .select("user_id, full_name, avatar_url")
          .in("user_id", uniqueUserIds);

        if (error) {
          console.error("Error fetching user_settings in TransactionTable:", error);
        } else if (data) {
          for (const row of data) {
            map[row.user_id] = {
              name: row.full_name?.trim() || row.user_id.slice(0, 8),
              avatarUrl: row.avatar_url,
            };
          }
        }
      } catch (err) {
        console.error("Error in TransactionTable profiles fetch:", err);
      }

      setClientProfiles(map);
    }

    fetchProfiles();
  }, [transactions]);

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

  const renderPaymentMethod = (method: string) => {
    switch (method) {
      case "cash":
        return (
          <div className="flex items-center justify-center" title={locale === "th" ? "เงินสด" : "Cash"}>
            <Banknote size={20} className="text-violet-500 dark:text-violet-400" />
          </div>
        );
      case "credit_card":
        return (
          <div className="flex items-center justify-center" title={locale === "th" ? "บัตรเครดิต" : "Credit Card"}>
            <CreditCard size={20} className="text-rose-500 dark:text-rose-400" />
          </div>
        );
      case "debit_card":
        return (
          <div className="flex items-center justify-center" title={locale === "th" ? "เดบิต / วอลเล็ต" : "Debit / Wallet"}>
            <Wallet size={20} className="text-cyan-500 dark:text-cyan-400" />
          </div>
        );
      default:
        return (
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
            {method}
          </span>
        );
    }
  };

  const total = transactions.length;
  const totalPages = Math.ceil(total / pageSize);
  const activePage = Math.min(currentPage, Math.max(1, totalPages));

  const startIdx = (activePage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const paginatedTransactions = transactions.slice(startIdx, endIdx);

  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{t.transactions.noTransactions}</p>;
  }

  const mergedProfiles = { ...userProfiles, ...clientProfiles };

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
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 whitespace-nowrap">
              <th className="py-2 pr-4 font-medium">{t.transactions.formTitle}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formCategory}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formType}</th>
              <th className="py-2 pr-4 font-medium text-center">Payment</th>
              <th className="py-2 pr-4 font-medium">{t.household.members}</th>
              <th className="py-2 pr-4 font-medium">{t.transactions.formDate}</th>
              <th className="py-2 pr-4 font-medium text-right">{t.transactions.formAmount}</th>
              <th className="py-2 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTransactions.map((tx) => (
              <tr key={tx.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors whitespace-nowrap">
                <td className="py-3 pr-4 text-slate-900 dark:text-slate-100 font-medium whitespace-nowrap">
                  <span className="inline-flex items-center gap-2">
                    <span>{categoryIconMap[tx.category] ?? "💰"}</span>
                    <span>{tx.title}</span>
                  </span>
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{tx.category}</td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  {tx.type === "income" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
                      {t.transactions.income}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60">
                      {t.transactions.expense}
                    </span>
                  )}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-center">
                  {renderPaymentMethod(tx.payment_method)}
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {(() => {
                      console.log("TransactionTable diagnostic:", {
                        tx_user_id: tx.user_id,
                        currentUserId,
                        mergedProfiles,
                        hasProfile: !!mergedProfiles[tx.user_id],
                        avatarUrl: mergedProfiles[tx.user_id]?.avatarUrl
                      });
                      return null;
                    })()}
                    {mergedProfiles[tx.user_id]?.avatarUrl ? (
                      <img
                        src={mergedProfiles[tx.user_id].avatarUrl!}
                        alt={mergedProfiles[tx.user_id]?.name || getOwnerLabel(tx.user_id)}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(mergedProfiles[tx.user_id]?.name || getOwnerLabel(tx.user_id))}`}
                        alt={mergedProfiles[tx.user_id]?.name || getOwnerLabel(tx.user_id)}
                        className="w-6 h-6 rounded-full object-cover border border-slate-200 dark:border-slate-800 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <span className="truncate max-w-[120px]">
                      {mergedProfiles[tx.user_id]?.name || getOwnerLabel(tx.user_id)}
                    </span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">{formatDate(tx.date)}</td>
                <td
                  className={clsx(
                    "py-3 pr-4 font-semibold text-right whitespace-nowrap",
                    tx.type === "income" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                  )}
                >
                  {tx.type === "income" ? "+" : "-"}
                  {formatCurrency(Number(tx.amount), currency)}
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenDropdownId(openDropdownId === tx.id ? null : tx.id);
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-850 rounded-full transition cursor-pointer"
                      aria-label="More actions"
                    >
                      <MoreHorizontal size={18} />
                    </button>

                    {openDropdownId === tx.id && (
                      <>
                        <div
                          className="fixed inset-0 z-10 cursor-default"
                          onClick={() => setOpenDropdownId(null)}
                        />
                        <div className={clsx(
                          "absolute right-0 w-32 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 shadow-lg ring-1 ring-black/5 focus:outline-none z-20",
                          paginatedTransactions.indexOf(tx) >= paginatedTransactions.length - 2 && paginatedTransactions.length > 2
                            ? "bottom-full mb-1"
                            : "top-full mt-1"
                        )}>
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setOpenDropdownId(null);
                            }}
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-lg transition cursor-pointer text-left"
                          >
                            <Pencil size={14} className="text-slate-400" />
                            <span>{locale === "th" ? "แก้ไข" : "Edit"}</span>
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800 my-0.5" />
                          <button
                            onClick={() => {
                              handleDelete(tx.id);
                              setOpenDropdownId(null);
                            }}
                            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition cursor-pointer text-left"
                          >
                            <Trash2 size={14} className="text-red-500" />
                            <span>{locale === "th" ? "ลบ" : "Delete"}</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
        {/* Bottom Left: Show entries selector */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <span>{locale === "th" ? "แสดง" : "Show"}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm font-medium"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>{locale === "th" ? "รายการ" : "entries"}</span>
          <span className="ml-2 text-xs text-slate-400">
            ({locale === "th" ? `แสดง ${startIdx + 1}-${endIdx} จากทั้งหมด ${total} รายการ` : `Showing ${startIdx + 1}-${endIdx} of ${total} entries`})
          </span>
        </div>

        {/* Bottom Right: Page navigation */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={activePage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
            >
              {locale === "th" ? "ก่อนหน้า" : "Previous"}
            </button>

            {/* Render page numbers */}
            {(() => {
              const pages = [];
              const maxVisible = 5;
              let startPage = Math.max(1, activePage - 2);
              const endPage = Math.min(totalPages, startPage + maxVisible - 1);
              if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
              }

              if (startPage > 1) {
                pages.push(
                  <button
                    key={1}
                    onClick={() => setCurrentPage(1)}
                    className={`w-8 h-8 rounded-xl text-xs font-medium transition cursor-pointer ${
                      activePage === 1
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    1
                  </button>
                );
                if (startPage > 2) {
                  pages.push(<span key="ellipsis-start" className="text-slate-400 text-xs px-1">...</span>);
                }
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i)}
                    className={`w-8 h-8 rounded-xl text-xs font-medium transition cursor-pointer ${
                      activePage === i
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {i}
                  </button>
                );
              }

              if (endPage < totalPages) {
                if (endPage < totalPages - 1) {
                  pages.push(<span key="ellipsis-end" className="text-slate-400 text-xs px-1">...</span>);
                }
                pages.push(
                  <button
                    key={totalPages}
                    onClick={() => setCurrentPage(totalPages)}
                    className={`w-8 h-8 rounded-xl text-xs font-medium transition cursor-pointer ${
                      activePage === totalPages
                        ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/10"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {totalPages}
                  </button>
                );
              }

              return pages;
            })()}

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={activePage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent transition cursor-pointer"
            >
              {locale === "th" ? "ถัดไป" : "Next"}
            </button>
          </div>
        )}
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