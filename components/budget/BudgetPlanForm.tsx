"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createBudgetPlan } from "@/services/budgetPlans";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { BudgetPlan, Household } from "@/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";

export default function BudgetPlanForm({
  userId,
  households,
  initialHouseholdId = "",
  onCreated,
  onCancel,
}: {
  userId: string;
  households: Household[];
  initialHouseholdId?: string;
  onCreated: (plan: BudgetPlan) => void;
  onCancel: () => void;
}) {
  const supabase = createClient();
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [householdId, setHouseholdId] = useState(initialHouseholdId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim() || !totalAmount || !startDate || !endDate) return;
    if (new Date(endDate) < new Date(startDate)) {
      setError(t.budget.dateValidationError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const plan = await createBudgetPlan(supabase, userId, {
        name: name.trim(),
        total_amount: parseFloat(totalAmount),
        start_date: startDate,
        end_date: endDate,
        household_id: householdId || null,
      });
      onCreated(plan);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
        {t.budget.createPlan}
      </h2>

      <div className="space-y-4">
        <Input label={t.budget.planName} value={name} onChange={(e) => setName(e.target.value)} />

        <Input
          label={t.budget.totalBudget}
          type="number"
          min="0"
          step="0.01"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label={t.budget.startDate}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label={t.budget.endDate}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {households.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.budget.household}
            </label>
            <select
              value={householdId}
              onChange={(e) => setHouseholdId(e.target.value)}
              className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t.budget.personal}</option>
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-2">
          <Button
            onClick={handleCreate}
            disabled={loading || !name.trim() || !totalAmount || !startDate || !endDate}
          >
            {t.budget.create}
          </Button>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            {t.budget.cancel}
          </Button>
        </div>
      </div>
    </Card>
  );
}