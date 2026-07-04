"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  calculateDailyBudgetStatuses,
  deleteBudgetPlan,
} from "@/services/budgetPlans";
import { getTransactions } from "@/services/transactions";
import { BudgetPlan, Household, Transaction, DailyBudgetStatus } from "@/types";
import BudgetPlanForm from "./BudgetPlanForm";
import BudgetCalendarGrid from "./BudgetCalendarGrid";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function BudgetCalendarManager({
  initialPlans,
  households,
  userId,
  currency,
}: {
  initialPlans: BudgetPlan[];
  households: Household[];
  userId: string;
  currency: string;
}) {
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [plans, setPlans] = useState<BudgetPlan[]>(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const [statuses, setStatuses] = useState<Map<string, DailyBudgetStatus>>(new Map());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPlanForMonth();
  }, [viewYear, viewMonth, plans]);

  async function loadPlanForMonth() {
    setLoading(true);

    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    try {
      const matchingPlan = plans.find(
        (p) => p.start_date <= monthEnd && p.end_date >= monthStart
      );

      setActivePlan(matchingPlan ?? null);

      if (matchingPlan) {
        const txs = await getTransactions(supabase, {
          dateFrom: matchingPlan.start_date,
          dateTo: matchingPlan.end_date,
          householdId: matchingPlan.household_id || undefined,
        });
        setTransactions(txs);
        setStatuses(calculateDailyBudgetStatuses(matchingPlan, txs));
      } else {
        setStatuses(new Map());
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setSelectedDate(null);
    }
  }

  const handlePlanCreated = (plan: BudgetPlan) => {
    setPlans((prev) => [plan, ...prev]);
    setShowForm(false);
    loadPlanForMonth();
  };

  const handleDeletePlan = async () => {
    if (!activePlan) return;
    await deleteBudgetPlan(supabase, activePlan.id);
    setPlans((prev) => prev.filter((p) => p.id !== activePlan.id));
    setActivePlan(null);
    setStatuses(new Map());
  };

  const changeMonth = (delta: number) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear -= 1;
    } else if (newMonth > 11) {
      newMonth = 0;
      newYear += 1;
    }
    setViewMonth(newMonth);
    setViewYear(newYear);
  };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString(
    locale === "th" ? "th-TH" : "en-US",
    {
      month: "long",
      year: "numeric",
    }
  );

  const selectedStatus = selectedDate ? statuses.get(selectedDate) ?? null : null;

  return (
    <div className="space-y-6">
      {showForm && (
        <BudgetPlanForm
          userId={userId}
          households={households}
          onCreated={handlePlanCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!showForm && (
        <Button onClick={() => setShowForm(true)}>{t.budget.createPlan}</Button>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => changeMonth(-1)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 px-2"
            >
              ←
            </button>
            <h2 className="font-semibold text-slate-900 dark:text-slate-100">{monthLabel}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 px-2"
            >
              →
            </button>
          </div>

          {activePlan ? (
            <>
              <div className="mb-4 flex items-center justify-between rounded-xl bg-primary-50 dark:bg-primary-950/30 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {activePlan.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(activePlan.total_amount, currency)} ·{" "}
                    {activePlan.start_date} → {activePlan.end_date}
                  </p>
                </div>
                <button
                  onClick={handleDeletePlan}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  {t.budget.deletePlan}
                </button>
              </div>

              <BudgetCalendarGrid
                year={viewYear}
                month={viewMonth}
                statuses={statuses}
                currency={currency}
                onSelectDay={setSelectedDate}
                selectedDate={selectedDate}
              />
            </>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400 py-8 text-center">
              {loading ? "..." : t.budget.noPlan}
            </p>
          )}
        </Card>

        <Card>
          {selectedStatus ? (
            <DayDetailClient status={selectedStatus} transactions={transactions} currency={currency} />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t.budget.noActivePlan}</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function DayDetailClient({
  status,
  transactions,
  currency,
}: {
  status: DailyBudgetStatus;
  transactions: Transaction[];
  currency: string;
}) {
  const { t } = useLanguage();

  const dayTransactions = transactions.filter(
    (tx) => tx.date === status.date && tx.type === "expense"
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{status.date}</p>
        <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {t.budget.dayDetail}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.budget.dailyAllowance}</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(status.dailyAllowance, currency)}
          </p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.budget.spent}</p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {formatCurrency(status.spentAmount, currency)}
          </p>
        </div>
      </div>

      <div
        className={`rounded-xl p-3 ${
          status.isOverBudget ? "bg-red-50 dark:bg-red-950/40" : "bg-green-50 dark:bg-green-950/40"
        }`}
      >
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {status.isOverBudget ? t.budget.overBudget : t.budget.remaining}
        </p>
        <p
          className={`text-xl font-bold ${
            status.isOverBudget ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
          }`}
        >
          {formatCurrency(Math.abs(status.remaining), currency)}
        </p>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t.transactions.allTransactions}
        </p>
        {dayTransactions.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t.budget.noTransactionsThisDay}
          </p>
        ) : (
          <ul className="space-y-2">
            {dayTransactions.map((tx) => (
              <li key={tx.id} className="flex justify-between text-sm">
                <span className="text-slate-700 dark:text-slate-300">{tx.title}</span>
                <span className="font-medium text-red-600 dark:text-red-400">
                  -{formatCurrency(Number(tx.amount), currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}