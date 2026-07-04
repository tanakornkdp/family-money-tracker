import { SupabaseClient } from "@supabase/supabase-js";
import { FinancialGoal, GoalContribution, GoalType } from "@/types";

export interface GoalInput {
  name: string;
  goal_type: GoalType;
  target_amount: number;
  target_date?: string | null;
  household_id?: string | null;
}

export async function getGoals(supabase: SupabaseClient): Promise<FinancialGoal[]> {
  const { data, error } = await supabase
    .from("financial_goals")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as FinancialGoal[];
}

export async function createGoal(
  supabase: SupabaseClient,
  userId: string,
  input: GoalInput
): Promise<FinancialGoal> {
  const { data, error } = await supabase
    .from("financial_goals")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FinancialGoal;
}

export async function deleteGoal(supabase: SupabaseClient, goalId: string): Promise<void> {
  const { error } = await supabase.from("financial_goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
}

export async function updateGoalStatus(
  supabase: SupabaseClient,
  goalId: string,
  status: FinancialGoal["status"]
): Promise<void> {
  const { error } = await supabase
    .from("financial_goals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", goalId);

  if (error) throw new Error(error.message);
}

export async function addContribution(
  supabase: SupabaseClient,
  goalId: string,
  userId: string,
  amount: number,
  note?: string
): Promise<GoalContribution> {
  const { data, error } = await supabase
    .from("goal_contributions")
    .insert({ goal_id: goalId, user_id: userId, amount, note: note || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as GoalContribution;
}

export async function getContributions(
  supabase: SupabaseClient,
  goalId: string
): Promise<GoalContribution[]> {
  const { data, error } = await supabase
    .from("goal_contributions")
    .select("*")
    .eq("goal_id", goalId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as GoalContribution[];
}