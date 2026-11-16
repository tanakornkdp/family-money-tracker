"use client";

import { toDateInputValue } from "@/lib/utils/dateHelpers";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createBudgetPlan } from "@/services/budgetPlans";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { BudgetPlan, Household } from "@/types";
import type { TravelTrip } from "@/types";
import { useEffect } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Card from "@/components/ui/Card";
import BudgetAlertThresholdPicker from "./BudgetAlertThresholdPicker";

export default function BudgetPlanForm({
  userId,
  households,
  onCreated,
  onCancel,
}: {
  userId: string;
  households: Household[];
  onCreated: (plan: BudgetPlan) => void;
  onCancel: () => void;
}) {
  const [supabase] = useState(() => createClient());
  const { t } = useLanguage();

  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [startDate, setStartDate] = useState(() => toDateInputValue());
  const [endDate, setEndDate] = useState("");
  const [householdId, setHouseholdId] = useState("");
  const [category, setCategory] = useState("");
  const [tripId, setTripId] = useState("");
  const [alertThresholds, setAlertThresholds] = useState<number[]>([25, 50, 75]);
  const [categories, setCategories] = useState<string[]>([]);
  const [trips, setTrips] = useState<TravelTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOptions = async () => {
      const [categoryResult, tripResult] = await Promise.all([
        supabase.from("categories").select("name").neq("type", "income").order("name"),
        supabase.from("travel_trips").select("id,name,destination,start_date,end_date,currency,user_id,time_zone,activation_mode,is_active,exchange_rate_to_thb,created_at,updated_at").eq("user_id", userId).order("start_date", { ascending: false }),
      ]);
      if (!categoryResult.error) setCategories((categoryResult.data ?? []).map((row) => row.name));
      if (!tripResult.error) setTrips((tripResult.data ?? []) as TravelTrip[]);
    };
    void loadOptions();
  }, [supabase, userId]);

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
        category: category || null,
        travel_trip_id: tripId || null,
        alert_threshold: alertThresholds[0] ?? 80,
        alert_thresholds: alertThresholds,
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            หมวดหมู่ (ไม่เลือก = งบรวม)
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">งบรวม</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
            ทริป (ไม่เลือก = ไม่ผูกทริป)
            <select value={tripId} onChange={(e) => setTripId(e.target.value)} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">ทุกทริป / ปกติ</option>{trips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name} · {trip.destination}</option>)}
            </select>
          </label>
        </div>

        <BudgetAlertThresholdPicker idPrefix="budget-create" value={alertThresholds} onChange={setAlertThresholds} />

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
