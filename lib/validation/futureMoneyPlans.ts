import { z } from "zod";

export const money = z.number().finite().nonnegative().max(1e12).refine(value => Math.abs(value * 100 - Math.round(value * 100)) < 0.001, "Use at most two decimal places");
const date = z.iso.date();
export const allocationSchema = z.object({
  id: z.uuid(), name: z.string().trim().min(1).max(100), amount: money,
  kind: z.enum(["other", "category", "card", "goal", "trip"]), target: z.string().max(200).default(""),
}).superRefine((item, ctx) => {
  if (item.kind !== "other" && !item.target) ctx.addIssue({ code: "custom", message: "Select a destination", path: ["target"] });
  if (["card", "goal", "trip"].includes(item.kind) && !z.uuid().safeParse(item.target).success) ctx.addIssue({ code: "custom", message: "Invalid destination", path: ["target"] });
});
export const futurePlanSchema = z.object({
  name: z.string().trim().min(1).max(100), expected_amount: money.refine(value => value > 0), expected_date: date,
  household_id: z.uuid().nullable(), allocations: z.array(allocationSchema).max(50), archived: z.boolean().default(false),
}).superRefine((plan, ctx) => {
  if (new Set(plan.allocations.map(item => item.id)).size !== plan.allocations.length) ctx.addIssue({ code: "custom", message: "Duplicate allocation" });
});
export type FutureAllocation = z.infer<typeof allocationSchema>;
export type FuturePlanInput = z.infer<typeof futurePlanSchema>;
export type FuturePlan = FuturePlanInput & { id: string; user_id: string; revision: number; created_at: string; updated_at: string };
export type FuturePlanLink = { id: string; plan_id: string; allocation_id: string | null; transaction_id: string | null; contribution_id: string | null; created_at: string; user_id: string };
export type FuturePlanEvent = { id: string; plan_id: string; user_id: string | null; action: string; snapshot: Record<string, unknown>; created_at: string };

export function summarizeFuturePlan(plan: FuturePlanInput & { user_id?: string }, links: FuturePlanLink[], transactions: { id: string; amount: number; type: string; household_id?: string | null; user_id?: string; category?: string; travel_trip_id?: string | null }[], contributions: { id: string; amount: number; household_id?: string | null; goal_id?: string }[]) {
  const cents = (value: number) => Math.round(Number(value) * 100);
  const byTransaction = new Map(transactions.map(item => [item.id, item]));
  const byContribution = new Map(contributions.map(item => [item.id, item]));
  let received = 0;
  const actual: Record<string, number> = {};
  const invalidLinks: string[] = [];
  for (const link of links) {
    const candidate = link.transaction_id ? byTransaction.get(link.transaction_id) : undefined;
    const tx = candidate && (candidate.household_id ?? null) === plan.household_id && (plan.household_id || !plan.user_id || candidate.user_id === plan.user_id) ? candidate : undefined;
    const saving = link.contribution_id ? byContribution.get(link.contribution_id) : undefined;
    const contribution = saving && (saving.household_id ?? null) === plan.household_id ? saving : undefined;
    const allocation = plan.allocations.find(item => item.id === link.allocation_id);
    if (!link.allocation_id && tx?.type === "income") received += cents(tx.amount);
    else if (allocation && ((tx?.type === "expense" && allocation.kind !== "goal" && (allocation.kind !== "category" || tx.category === allocation.target) && (allocation.kind !== "trip" || tx.travel_trip_id === allocation.target)) || (contribution && allocation.kind === "goal" && contribution.goal_id === allocation.target))) actual[link.allocation_id!] = (actual[link.allocation_id!] ?? 0) + cents(tx?.amount ?? contribution!.amount);
    else invalidLinks.push(link.id);
  }
  const allocated = plan.allocations.reduce((sum, item) => sum + cents(item.amount), 0);
  const used = Object.values(actual).reduce((sum, value) => sum + value, 0);
  return { received: received / 100, allocated: allocated / 100, unallocated: (cents(plan.expected_amount) - allocated) / 100, used: used / 100, actual: Object.fromEntries(Object.entries(actual).map(([key, value]) => [key, value / 100])), invalidLinks };
}
