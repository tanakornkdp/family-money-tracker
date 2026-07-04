import { SupabaseClient } from "@supabase/supabase-js";
import { BudgetPlan, DailyBudgetStatus, Transaction } from "@/types";

export interface BudgetPlanInput {
  name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  household_id?: string | null;
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

function getDaysBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

function getDayIndex(startDate: string, targetDate: string): number {
  const start = new Date(startDate);
  const target = new Date(targetDate);
  const diffMs = target.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculates daily budget status for every day in the plan range,
 * using cumulative carry-over logic: unused budget rolls into future days.
 * To keep future days realistic, they do not accumulate future allowances
 * until those days are reached.
 */
export function calculateDailyBudgetStatuses(
  plan: BudgetPlan,
  transactions: Transaction[],
  upcomingRecurring: { date: string; amount: number }[] = []
): Map<string, DailyBudgetStatus> {
  const totalDays = getDaysBetween(plan.start_date, plan.end_date);
  const dailyAllowance = plan.total_amount / totalDays;

  const expensesByDate = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "expense") continue;
    if (t.date < plan.start_date || t.date > plan.end_date) continue;
    expensesByDate.set(t.date, (expensesByDate.get(t.date) ?? 0) + Number(t.amount));
  }

  const projectedByDate = new Map<string, number>();
  for (const rec of upcomingRecurring) {
    if (rec.date < plan.start_date || rec.date > plan.end_date) continue;
    projectedByDate.set(rec.date, (projectedByDate.get(rec.date) ?? 0) + rec.amount);
  }

  const statuses = new Map<string, DailyBudgetStatus>();
  let cumulativeSpent = 0;

  // Get local date string YYYY-MM-DD
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localToday = new Date(today.getTime() - (offset * 60 * 1000));
  const todayStr = localToday.toISOString().split("T")[0];

  const start = new Date(plan.start_date);
  for (let i = 0; i < totalDays; i++) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const dateStr = current.toISOString().split("T")[0];

    const actualSpent = expensesByDate.get(dateStr) ?? 0;
    const projectedSpent = dateStr > todayStr ? (projectedByDate.get(dateStr) ?? 0) : 0;
    const spentAmount = actualSpent + projectedSpent;
    cumulativeSpent += spentAmount;

    const dayIndex = i + 1;
    const cumulativeBudget = dailyAllowance * dayIndex;

    let remaining = 0;
    if (dateStr > todayStr) {
      // Future day: only shows its own daily allowance minus any spent amount on that day
      remaining = dailyAllowance - spentAmount;
    } else {
      // Past or Today: shows cumulative budget minus cumulative spent up to this day (unlocked carry-over)
      remaining = cumulativeBudget - cumulativeSpent;
    }

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