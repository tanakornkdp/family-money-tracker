"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createGoal, deleteGoal, addContribution, updateGoalStatus } from "@/services/goals";
import { FinancialGoal, GoalType, Household } from "@/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

const GOAL_TYPES: GoalType[] = ["savings", "travel", "investment", "emergency_fund", "debt_payoff", "other"];

export default function GoalsManager({
  initialGoals,
  households,
  userId,
  currency,
}: {
  initialGoals: FinancialGoal[];
  households: Household[];
  userId: string;
  currency: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [goals, setGoals] = useState<FinancialGoal[]>(initialGoals);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<GoalType>("savings");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [householdId, setHouseholdId] = useState("");

  const [contributingTo, setContributingTo] = useState<string | null>(null);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionNote, setContributionNote] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [now] = useState(() => Date.now());

  const handleCreate = async () => {
    if (!name.trim() || !targetAmount) return;
    setLoading(true);
    setError(null);

    try {
      const goal = await createGoal(supabase, userId, {
        name: name.trim(),
        goal_type: goalType,
        target_amount: parseFloat(targetAmount),
        target_date: targetDate || null,
        household_id: householdId || null,
      });
      setGoals((prev) => [goal, ...prev]);
      setName("");
      setTargetAmount("");
      setTargetDate("");
      setHouseholdId("");
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddContribution = async (goalId: string) => {
    if (!contributionAmount) return;
    setLoading(true);
    setError(null);

    try {
      await addContribution(supabase, goalId, userId, parseFloat(contributionAmount), contributionNote);
      setGoals((prev) =>
        prev.map((g) =>
          g.id === goalId
            ? { ...g, current_amount: g.current_amount + parseFloat(contributionAmount) }
            : g
        )
      );
      setContributingTo(null);
      setContributionAmount("");
      setContributionNote("");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (goalId: string) => {
    setLoading(true);
    setError(null);

    try {
      await deleteGoal(supabase, goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));
      setConfirmDeleteId(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getDaysLeft = (targetDate: string | null) => {
    if (!targetDate) return null;
    const diff = Math.ceil((new Date(targetDate).getTime() - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!showCreate ? (
        <Button onClick={() => setShowCreate(true)}>{t.goals.createGoal}</Button>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.goals.createGoal}
          </h2>
          <div className="space-y-4">
            <Input label={t.goals.goalName} value={name} onChange={(e) => setName(e.target.value)} />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.goals.goalType}
              </label>
              <select
                value={goalType}
                onChange={(e) => setGoalType(e.target.value as GoalType)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {GOAL_TYPES.map((gt) => (
                  <option key={gt} value={gt}>
                    {t.goals.types[gt]}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label={t.goals.targetAmount}
              type="number"
              min="0"
              step="0.01"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
            />

            <Input
              label={t.goals.targetDate}
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />

            {households.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.goals.household}
                </label>
                <select
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t.goals.personal}</option>
                  {households.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading || !name.trim() || !targetAmount}>
                {t.goals.create}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={loading}>
                {t.goals.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {goals.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.goals.noGoals}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((g) => {
            const percent = Math.min(100, (g.current_amount / g.target_amount) * 100);
            const daysLeft = getDaysLeft(g.target_date);

            return (
              <Card key={g.id}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">{g.name}</h3>
                  <button
                    onClick={() => setConfirmDeleteId(g.id)}
                    className="text-xs text-red-600 hover:text-red-700"
                  >
                    {t.goals.delete}
                  </button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t.goals.types[g.goal_type]}
                </p>

                {confirmDeleteId === g.id && (
                  <div className="mb-3 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3">
                    <p className="text-sm text-red-700 dark:text-red-400 mb-2">{t.goals.deleteConfirm}</p>
                    <div className="flex gap-2">
                      <Button variant="danger" onClick={() => handleDelete(g.id)} disabled={loading}>
                        {t.goals.delete}
                      </Button>
                      <Button variant="secondary" onClick={() => setConfirmDeleteId(null)}>
                        {t.goals.cancel}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      {formatCurrency(g.current_amount, currency)} {t.goals.of}{" "}
                      {formatCurrency(g.target_amount, currency)}
                    </span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-primary-600 transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>

                {daysLeft !== null && (
                  <p
                    className={`text-xs mb-3 ${
                      daysLeft < 0 ? "text-red-600 dark:text-red-400" : "text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {daysLeft < 0 ? t.goals.overdue : `${daysLeft} ${t.goals.daysLeft}`}
                  </p>
                )}

                {contributingTo === g.id ? (
                  <div className="space-y-2">
                    <Input
                      label={t.goals.addAmount}
                      type="number"
                      min="0"
                      step="0.01"
                      value={contributionAmount}
                      onChange={(e) => setContributionAmount(e.target.value)}
                    />
                    <Input
                      label={t.goals.addNote}
                      value={contributionNote}
                      onChange={(e) => setContributionNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleAddContribution(g.id)}
                        disabled={loading || !contributionAmount}
                      >
                        {t.goals.confirmAdd}
                      </Button>
                      <Button variant="secondary" onClick={() => setContributingTo(null)}>
                        {t.goals.cancel}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="secondary" onClick={() => setContributingTo(g.id)} className="w-full">
                    {t.goals.addFunds}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}