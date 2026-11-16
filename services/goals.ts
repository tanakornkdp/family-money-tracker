import { SupabaseClient } from "@supabase/supabase-js";
import { FinancialGoal, GoalContribution, GoalType } from "@/types";
import { getUserProfilesByIds } from "@/services/userSettings";

export interface GoalContributionSummary {
  totalAmount: number;
  members: { userId: string; name: string; amount: number }[];
}

export function aggregateGoalContributions(contributions: GoalContribution[]): Record<string, GoalContributionSummary> {
  const summaries: Record<string, GoalContributionSummary> = {};
  for (const contribution of contributions) {
    const summary = summaries[contribution.goal_id] ??= { totalAmount: 0, members: [] };
    summary.totalAmount += Number(contribution.amount);
    const member = summary.members.find((item) => item.userId === contribution.user_id);
    if (member) member.amount += Number(contribution.amount);
    else summary.members.push({ userId: contribution.user_id, name: contribution.user_id.slice(0, 8), amount: Number(contribution.amount) });
  }
  return summaries;
}

export async function getGoalContributionSummaries(
  supabase: SupabaseClient,
  householdGoals: Pick<FinancialGoal, "id">[],
): Promise<Record<string, GoalContributionSummary>> {
  const goalIds = [...new Set(householdGoals.map((goal) => goal.id))];
  if (!goalIds.length) return {};
  const { data, error } = await supabase.from("goal_contributions").select("goal_id,user_id,amount").in("goal_id", goalIds);
  if (error) throw new Error(error.message);
  const summaries = aggregateGoalContributions((data ?? []) as GoalContribution[]);
  const contributorIds = [...new Set(Object.values(summaries).flatMap((summary) => summary.members.map((member) => member.userId)))];
  const profiles = await getUserProfilesByIds(supabase, contributorIds);
  for (const summary of Object.values(summaries)) {
    for (const member of summary.members) member.name = profiles[member.userId]?.name ?? member.userId.slice(0, 8);
  }
  for (const goalId of goalIds) summaries[goalId] ??= { totalAmount: 0, members: [] };
  return summaries;
}

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
