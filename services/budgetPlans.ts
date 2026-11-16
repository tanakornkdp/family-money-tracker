import { toDateInputValue } from "@/lib/utils/dateHelpers";
import { SupabaseClient } from "@supabase/supabase-js";
import { BudgetPlan, DailyBudgetStatus, Transaction } from "@/types";

export interface BudgetPlanInput {
  name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  household_id?: string | null;
  category?: string | null;
  travel_trip_id?: string | null;
  alert_threshold?: number;
  alert_thresholds?: number[];
}

export function getReachedBudgetAlertLevels(percentUsed: number, configuredLevels: number[] | null | undefined): number[] {
  const levels = configuredLevels ?? [80];
  return [...new Set(levels)]
    .filter((level) => Number.isInteger(level) && level > 0 && level < 100 && percentUsed >= level)
    .sort((a, b) => a - b);
}

export async function getBudgetPlans(supabase: SupabaseClient): Promise<BudgetPlan[]> {
  const { data, error } = await supabase
    .from("budget_plans")
    .select("*")
    .order("start_date", { ascending: false });

  if (error) throw new Error(error.message);
  return data as BudgetPlan[];
}

export async function getActiveBudgetPlan(
  supabase: SupabaseClient,
  date: string
): Promise<BudgetPlan | null> {
  const { data, error } = await supabase
    .from("budget_plans")
    .select("*")
    .lte("start_date", date)
    .gte("end_date", date)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as BudgetPlan | null;
}

export async function createBudgetPlan(
  supabase: SupabaseClient,
  userId: string,
  input: BudgetPlanInput
): Promise<BudgetPlan> {
  const { data, error } = await supabase
    .from("budget_plans")
    .insert({ ...input, user_id: userId, household_id: input.household_id ?? null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as BudgetPlan;
}

export async function deleteBudgetPlan(supabase: SupabaseClient, planId: string): Promise<void> {
  const { error } = await supabase.from("budget_plans").delete().eq("id", planId);
  if (error) throw new Error(error.message);
}

export async function updateBudgetAlertThresholds(
  supabase: SupabaseClient,
  planId: string,
  thresholds: number[],
): Promise<BudgetPlan> {
  const cleaned = [...new Set(thresholds)].filter((value) => Number.isInteger(value) && value > 0 && value < 100).sort((a, b) => a - b);
  if (cleaned.length > 10) throw new Error("เลือกได้ไม่เกิน 10 ระดับ");
  const { data, error } = await supabase.from("budget_plans").update({ alert_thresholds: cleaned }).eq("id", planId).select().single();
  if (error) throw new Error(error.message);
  return data as BudgetPlan;
}

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculates daily budget status for every day in the plan range,
 * using cumulative carry-over logic: unused budget rolls into future days.
 */
export function calculateDailyBudgetStatuses(
  plan: BudgetPlan,
  transactions: Transaction[]
): Map<string, DailyBudgetStatus> {
  const totalDays = getDaysBetween(plan.start_date, plan.end_date);
  const dailyAllowance = plan.total_amount / totalDays;

  const expensesByDate = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.date < plan.start_date || t.date > plan.end_date) continue;
    if (plan.category && t.category !== plan.category) continue;
    if (plan.travel_trip_id && t.travel_trip_id !== plan.travel_trip_id) continue;
    expensesByDate.set(t.date, (expensesByDate.get(t.date) ?? 0) + Number(t.amount));
  }

  const statuses = new Map<string, DailyBudgetStatus>();
  let cumulativeSpent = 0;

  const start = new Date(plan.start_date);
  for (let i = 0; i < totalDays; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = toDateInputValue(current);

    const spentAmount = expensesByDate.get(dateStr) ?? 0;
    cumulativeSpent += spentAmount;

    const dayIndex = i + 1;
    const cumulativeBudget = dailyAllowance * dayIndex;
    const remaining = cumulativeBudget - cumulativeSpent;

    statuses.set(dateStr, {
      date: dateStr,
      dailyAllowance,
      spentAmount,
      cumulativeBudget,
      cumulativeSpent,
      remaining,
      isOverBudget: remaining < 0,
    });
  }

  return statuses;
}
