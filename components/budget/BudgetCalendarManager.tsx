"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  calculateDailyBudgetStatuses,
  deleteBudgetPlan,
} from "@/services/budgetPlans";
import { getUpcomingOccurrences } from "@/services/recurringBills";
import { BudgetPlan, Household, Transaction, DailyBudgetStatus } from "@/types";
import BudgetPlanForm from "./BudgetPlanForm";
import BudgetCalendarGrid from "./BudgetCalendarGrid";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function BudgetCalendarManager({
  initialPlans,
  initialTransactions,
  households,
  userId,
  currency,
  initialHouseholdId = "",
}: {
  initialPlans: BudgetPlan[];
  initialTransactions: Transaction[];
  households: Household[];
  userId: string;
  currency: string;
  initialHouseholdId?: string;
}) {
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [plans, setPlans] = useState<BudgetPlan[]>(initialPlans);
  const [prevInitialPlans, setPrevInitialPlans] = useState<BudgetPlan[]>(initialPlans);

  if (initialPlans !== prevInitialPlans) {
    setPlans(initialPlans);
    setPrevInitialPlans(initialPlans);
  }

  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string>(initialHouseholdId);
  const [showForm, setShowForm] = useState(false);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const [statuses, setStatuses] = useState<Map<string, DailyBudgetStatus>>(new Map());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadPlanForMonth() {
    setLoading(true);

    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    try {
      const matchingPlan = plans.find(
        (p) => {
          const pStart = p.start_date.substring(0, 10);
          const pEnd = p.end_date.substring(0, 10);
          const overlaps = pStart <= monthEnd && pEnd >= monthStart;
          if (!overlaps) return false;

          if (selectedHouseholdId) {
            return p.household_id === selectedHouseholdId;
          }
          return !p.household_id;
        }
      );

      setActivePlan(matchingPlan ?? null);

      if (matchingPlan) {
        const pStart = matchingPlan.start_date.substring(0, 10);
        const pEnd = matchingPlan.end_date.substring(0, 10);
        const txs = initialTransactions.filter((tx) => {
          const txDate = tx.date.substring(0, 10);
          const inRange = txDate >= pStart && txDate <= pEnd;
          if (!inRange) return false;
          
          if (matchingPlan.household_id) {
            return tx.household_id === matchingPlan.household_id;
          }
          return !tx.household_id;
        });
        
        const occurrences = getUpcomingOccurrences(
          pStart,
          pEnd,
          matchingPlan.household_id
        ).map((o) => ({ date: o.date.substring(0, 10), amount: o.bill.amount }));

        setTransactions(txs);
        setStatuses(calculateDailyBudgetStatuses(matchingPlan, txs, occurrences));
      } else {
        setStatuses(new Map());
        setTransactions([]);
      }
    } finally {
      setLoading(false);
      setSelectedDate(null);
    }
  }

  useEffect(() => {
    let active = true;
    const run = async () => {
      await Promise.resolve();
      if (active) {
        loadPlanForMonth();
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [viewYear, viewMonth, plans, initialTransactions, selectedHouseholdId]);

  const handlePlanCreated = (plan: BudgetPlan) => {
    setPlans((prev) => [plan, ...prev]);
    setSelectedHouseholdId(plan.household_id ?? "");
    
    const pStart = plan.start_date.substring(0, 10);
    const parts = pStart.split("-");
    if (parts.length === 3) {
      setViewYear(Number(parts[0]));
      setViewMonth(Number(parts[1]) - 1);
    }
    
    setShowForm(false);
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
          initialHouseholdId={selectedHouseholdId}
          onCreated={handlePlanCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {!showForm && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Button onClick={() => setShowForm(true)}>{t.budget.createPlan}</Button>

          {households.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                {t.budget.household}:
              </span>
              <select
                value={selectedHouseholdId}
                onChange={(e) => setSelectedHouseholdId(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t.household.personalView}</option>
                {households.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
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

      {/* All Budget Plans Section */}
      <Card>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center justify-between">
          <span>{t.budget.allPlans}</span>
          <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal px-2.5 py-1 rounded-full">
            {plans.length}
          </span>
        </h3>

        {plans.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 py-4 text-center">
            {t.budget.noPlan}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-4">{t.budget.planName}</th>
                  <th className="py-3 px-4">{t.budget.totalBudget}</th>
                  <th className="py-3 px-4">{t.budget.startDate} - {t.budget.endDate}</th>
                  <th className="py-3 px-4">{t.budget.household}</th>
                  <th className="py-3 px-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {plans.map((p) => {
                  const pStart = p.start_date.substring(0, 10);
                  const pEnd = p.end_date.substring(0, 10);
                  const hName = p.household_id
                    ? households.find((h) => h.id === p.household_id)?.name ?? t.budget.household
                    : t.budget.personal;
                  
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                        {p.name}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-semibold">
                        {formatCurrency(p.total_amount, currency)}
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-xs font-mono">
                        {pStart} → {pEnd}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          p.household_id
                            ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/30"
                            : "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30"
                        }`}>
                          {p.household_id ? "👥 " : "👤 "}
                          {hName}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="secondary"
                          className="text-xs px-2.5 py-1"
                          onClick={() => {
                            setSelectedHouseholdId(p.household_id ?? "");
                            const parts = pStart.split("-");
                            if (parts.length === 3) {
                              setViewYear(Number(parts[0]));
                              setViewMonth(Number(parts[1]) - 1);
                            }
                          }}
                        >
                          {t.budget.jumpToPlan}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
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
    (tx) => tx.date.substring(0, 10) === status.date && tx.type === "expense"
  );

  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  const todayStr = localToday.toISOString().split("T")[0];
  const isFuture = status.date > todayStr;
  
  const upcomingBills = isFuture 
    ? getUpcomingOccurrences(status.date, status.date).filter(o => o.bill.type === "expense")
    : [];

  const hasItems = dayTransactions.length > 0 || upcomingBills.length > 0;

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
          <p className="text-xs text-slate-500 dark:text-slate-400">{isFuture ? "Spent (Projected)" : t.budget.spent}</p>
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
          {status.isOverBudget ? (isFuture ? "Over Budget (Projected)" : t.budget.overBudget) : t.budget.remaining}
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
        {!hasItems ? (
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
            {upcomingBills.map((occ, idx) => (
              <li key={`bill-${idx}`} className="flex justify-between text-sm italic bg-indigo-50/40 dark:bg-indigo-950/20 p-1.5 rounded-lg border border-dashed border-indigo-200 dark:border-indigo-900">
                <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 font-medium">
                  🕒 {occ.bill.name} <span className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.2 rounded-full font-sans not-italic">Projected</span>
                </span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  -{formatCurrency(Number(occ.bill.amount), currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}