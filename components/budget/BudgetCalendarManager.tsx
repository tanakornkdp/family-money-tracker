"use client";

import AnimatedSelect from "@/components/ui/AnimatedSelect";
import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  calculateDailyBudgetStatuses,
  deleteBudgetPlan,
  updateBudgetAlertThresholds,
} from "@/services/budgetPlans";
import { getTransactions } from "@/services/transactions";
import { BudgetPlan, Household, Transaction, DailyBudgetStatus } from "@/types";
import BudgetPlanDialog from "./BudgetPlanDialog";
import BudgetCalendarGrid from "./BudgetCalendarGrid";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import BudgetAlertThresholdPicker from "./BudgetAlertThresholdPicker";

export default function BudgetCalendarManager({
  initialPlans,
  households,
  userId,
  currency,
  initialPlanId,
}: {
  initialPlans: BudgetPlan[];
  households: Household[];
  userId: string;
  currency: string;
  initialPlanId?: string;
}) {
  const supabase = createClient();
  const { t, locale } = useLanguage();

  const today = new Date();
  const focusedPlan = initialPlans.find(plan => plan.id === initialPlanId);
  const focusDate = focusedPlan ? new Date(focusedPlan.start_date + "T00:00:00") : today;
  const [viewYear, setViewYear] = useState(focusDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(focusDate.getMonth());
  const [plans, setPlans] = useState<BudgetPlan[]>(initialPlans);
  const [showForm, setShowForm] = useState(false);
  const createTrigger = useRef<HTMLDivElement>(null);
  const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState(initialPlanId ?? "");
  const [statuses, setStatuses] = useState<Map<string, DailyBudgetStatus>>(new Map());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [alertThresholds, setAlertThresholds] = useState<number[]>([]);
  const [editingAlerts, setEditingAlerts] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [alertError, setAlertError] = useState<string | null>(null);

  const loadPlanForMonth = useCallback(async () => {
    setLoading(true);

    const monthStart = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const monthEnd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(lastDayOfMonth).padStart(2, "0")}`;

    try {
      const matchingPlans = plans.filter(
        (p) => p.start_date <= monthEnd && p.end_date >= monthStart
      );
      const matchingPlan = matchingPlans.find((plan) => plan.id === selectedPlanId) ?? matchingPlans[0];

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
  }, [plans, selectedPlanId, supabase, viewMonth, viewYear]);

  useEffect(() => {
    Promise.resolve().then(() => loadPlanForMonth());
  }, [loadPlanForMonth]);

  const handlePlanCreated = (plan: BudgetPlan) => {
    setPlans((prev) => [plan, ...prev]);
    setSelectedPlanId(plan.id);
  };

  const handleDeletePlan = async () => {
    if (!activePlan) return;
    await deleteBudgetPlan(supabase, activePlan.id);
    setPlans((prev) => prev.filter((p) => p.id !== activePlan.id));
    setActivePlan(null);
    setStatuses(new Map());
  };

  const handleSaveAlertThresholds = async () => {
    if (!activePlan) return;
    setSavingAlerts(true);
    setAlertError(null);
    try {
      const updated = await updateBudgetAlertThresholds(supabase, activePlan.id, alertThresholds);
      setPlans((current) => current.map((plan) => plan.id === updated.id ? updated : plan));
      setActivePlan(updated);
      setEditingAlerts(false);
    } catch (error) {
      setAlertError((error as Error).message);
    } finally {
      setSavingAlerts(false);
    }
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
  const matchingPlans = plans.filter((plan) => {
    const monthStart = String(viewYear) + "-" + String(viewMonth + 1).padStart(2, "0") + "-01";
    const monthEnd = String(viewYear) + "-" + String(viewMonth + 1).padStart(2, "0") + "-" + String(new Date(viewYear, viewMonth + 1, 0).getDate()).padStart(2, "0");
    return plan.start_date <= monthEnd && plan.end_date >= monthStart;
  });
  const activeAlertLevels = activePlan?.alert_thresholds ?? (activePlan?.alert_threshold ? [activePlan.alert_threshold] : [80]);

  return (
    <div className="space-y-6">
      {showForm && (
        <BudgetPlanDialog anchor={createTrigger} title={t.budget.createPlan} onClose={() => setShowForm(false)} userId={userId} households={households} onCreated={handlePlanCreated} />
      )}

      <div ref={createTrigger} className="w-fit">
        <Button onClick={() => setShowForm(true)}>{t.budget.createPlan}</Button>
      </div>

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
              {matchingPlans.length > 1 && <label className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">แผนงบ
                <AnimatedSelect value={activePlan.id} onChange={(event) => { setSelectedPlanId(event.target.value); setSelectedDate(null); }} className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">{matchingPlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}{plan.category ? " · " + plan.category : ""}</option>)}</AnimatedSelect>
              </label>}
              <div className="mb-4 flex items-center justify-between rounded-xl bg-primary-50 dark:bg-primary-950/30 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {activePlan.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {formatCurrency(activePlan.total_amount, currency)} ·{" "}
                    {activePlan.start_date} → {activePlan.end_date}
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {activeAlertLevels.length ? "เตือนที่ " + activeAlertLevels.join("%, ") + "% และเมื่อเกิน 100%" : "เตือนเมื่อเกิน 100% เท่านั้น"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {activePlan.user_id === userId && <button type="button" onClick={() => { setAlertError(null); setAlertThresholds(activePlan.alert_thresholds ?? [activePlan.alert_threshold ?? 80]); setEditingAlerts((value) => !value); }} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">{editingAlerts ? "ปิดการตั้งเตือน" : "ปรับระดับเตือน"}</button>}
                  {activePlan.user_id === userId && <button type="button" onClick={handleDeletePlan} className="text-xs text-red-600 hover:text-red-700">{t.budget.deletePlan}</button>}
                </div>
              </div>

              {editingAlerts && activePlan.user_id === userId && <div className="mb-4 space-y-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <BudgetAlertThresholdPicker idPrefix="budget-edit" value={alertThresholds} onChange={setAlertThresholds} />
                {alertError && <p role="alert" className="text-sm text-red-600">{alertError}</p>}
                <div className="flex gap-2"><Button onClick={() => void handleSaveAlertThresholds()} disabled={savingAlerts}>{savingAlerts ? "กำลังบันทึก…" : "บันทึกระดับเตือน"}</Button><Button variant="secondary" onClick={() => { setEditingAlerts(false); setAlertThresholds(activePlan.alert_thresholds ?? [activePlan.alert_threshold ?? 80]); }}>ยกเลิก</Button></div>
              </div>}

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
