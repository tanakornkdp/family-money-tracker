import type { SupabaseClient } from "@supabase/supabase-js";
import type { FuturePlan, FuturePlanEvent, FuturePlanLink } from "@/lib/validation/futureMoneyPlans";
import type { CreditCard, FinancialGoal, Household, Transaction, TravelTrip } from "@/types";
import { fetchAllRows } from "../lib/utils/pagination.mjs";

export type PlanContribution = { id: string; goal_id: string; user_id: string; amount: number; note: string | null; created_at: string; household_id?: string | null };
export type FuturePlanData = {
  plans: FuturePlan[]; links: FuturePlanLink[]; events: FuturePlanEvent[]; households: Household[];
  cards: CreditCard[]; goals: FinancialGoal[]; trips: TravelTrip[]; categories: { name: string }[];
  transactions: Transaction[]; contributions: PlanContribution[];
};
export async function getAllFuturePlanLinks(client: SupabaseClient) {
  const links: (FuturePlanLink & { transactions?: Transaction | null; goal_contributions?: PlanContribution | null })[] = [];
  let cursor: string | undefined;
  for (;;) {
    let query = client.from("future_money_plan_links").select("*,transactions(*),goal_contributions(*)").order("id").limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    links.push(...(data ?? []));
    if (!data || data.length < 500) break;
    cursor = data[data.length - 1].id;
  }
  return { data: links, error: null };
}
export async function getFuturePlanData(client: SupabaseClient): Promise<FuturePlanData> {
  const all = async <T>(load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) => ({ data: await fetchAllRows(load), error: null });
  const results = await Promise.all([
    all<FuturePlan>((from, to) => client.from("future_money_plans").select("*").order("updated_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
    getAllFuturePlanLinks(client),
    client.from("future_money_plan_events").select("*").order("created_at", { ascending: false }).limit(200),
    all<Household>((from, to) => client.from("households").select("*").order("created_at").order("id").range(from, to)),
    all<CreditCard>((from, to) => client.from("credit_cards").select("*").order("created_at").order("id").range(from, to)),
    all<FinancialGoal>((from, to) => client.from("financial_goals").select("*").order("created_at").order("id").range(from, to)),
    all<TravelTrip>((from, to) => client.from("travel_trips").select("*").order("start_date").order("id").range(from, to)),
    all<{ name: string }>((from, to) => client.from("categories").select("name").order("name").order("id").range(from, to)),
    all<Transaction>((from, to) => client.from("transactions").select("*").order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
    all<PlanContribution>((from, to) => client.from("goal_contributions").select("id,goal_id,user_id,amount,note,created_at").order("created_at", { ascending: false }).order("id", { ascending: false }).range(from, to)),
  ]);
  for (const result of results) if (result.error) throw new Error(result.error.message);
  const [plans, links, events, households, cards, goals, trips, categories, transactions, contributions] = results.map(result => result.data ?? []);
  // Linked actuals must remain available even when they are older than the recent-record page.
  const related = links as (FuturePlanLink & { transactions?: Transaction | null; goal_contributions?: PlanContribution | null })[];
  const actualTransactions = new Map((transactions as Transaction[]).map(tx => [tx.id, tx]));
  const actualContributions = new Map((contributions as PlanContribution[]).map(c => [c.id, c]));
  for (const link of related) {
    if (link.transactions) actualTransactions.set(link.transactions.id, link.transactions);
    if (link.goal_contributions) actualContributions.set(link.goal_contributions.id, link.goal_contributions);
  }
  return { plans, links, events, households, cards, goals, trips, categories, transactions: [...actualTransactions.values()], contributions: [...actualContributions.values()].map(c => {
    const goal = (goals as FinancialGoal[]).find(g => g.id === c.goal_id);
    return { ...c, household_id: goal ? goal.household_id : "unavailable" };
  }) } as FuturePlanData;
}
