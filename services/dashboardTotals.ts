import type { SupabaseClient } from "@supabase/supabase-js";
import type { Transaction } from "@/types";
import { fetchAllRows } from "../lib/utils/pagination.mjs";
import { throwIfMissingRpcMigration } from "../lib/api/rpcMigration.mjs";

export interface DashboardScope {
  householdId?: string | null;
  personalOnly?: boolean;
  userIds?: string[];
}
export interface DashboardTotalsOptions extends DashboardScope {
  dateFrom?: string;
  dateTo?: string;
  includeCategories?: boolean;
}
const dependency = { name: "get_dashboard_totals", migration: "20261120130000_dashboard_totals" };
function number(value: unknown): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || !Number.isFinite(Number(value))) throw new Error("Invalid dashboard totals response");
  return Number(value);
}
function count(value: unknown): number {
  const result = number(value);
  if (!Number.isSafeInteger(result) || result < 0) throw new Error("Invalid dashboard totals count");
  return result;
}
export async function getDashboardTotals(supabase: SupabaseClient, options: DashboardTotalsOptions = {}) {
  const { data, error } = await supabase.rpc(dependency.name, {
    p_household_id: options.householdId || null,
    p_personal_only: options.personalOnly ?? false,
    p_user_ids: options.userIds?.length ? options.userIds : null,
    p_date_from: options.dateFrom || null,
    p_date_to: options.dateTo || null,
    p_include_categories: options.includeCategories ?? false,
  });
  if (error) {
    throwIfMissingRpcMigration(error, dependency, supabase);
    throw new Error("Could not load dashboard totals", { cause: error });
  }
  if (!Array.isArray(data) || data.length !== 1 || !data[0] || typeof data[0] !== "object") throw new Error("Invalid dashboard totals response");
  const row = data[0];
  if (!Array.isArray(row.top_categories) || row.top_categories.length > 4) throw new Error("Invalid dashboard categories response");
  const topCategories: { category: string; amount: number }[] = row.top_categories.map((entry: { category?: unknown; amount?: unknown }) => {
    if (!entry || typeof entry.category !== "string") throw new Error("Invalid dashboard category response");
    return { category: entry.category, amount: number(entry.amount) };
  });
  return {
    cashBalance: number(row.cash_balance), rangeCashBalance: number(row.range_cash_balance), personalCashBalance: number(row.personal_cash_balance),
    kpis: { totalIncome: number(row.total_income), totalExpense: number(row.total_expense), balance: number(row.balance), transactionCount: count(row.transaction_count) },
    accountCashBalance: number(row.account_cash_balance), bankBalance: number(row.bank_balance),
    incomeCount: count(row.income_count), expenseCount: count(row.expense_count), topCategories,
  };
}

/** Forecast needs current-month variable activity plus ALL paid keys for upcoming
 * occurrences, even when recorded years earlier/later. Both windows remain paged. */
export function getForecastTransactions(supabase: SupabaseClient, scope: DashboardScope, today: string) {
  const [year, month] = today.split("-").map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(today + "T00:00:00Z")) || new Date(today + "T00:00:00Z").toISOString().slice(0, 10) !== today) throw new Error("Invalid forecast date");
  const from = today.slice(0, 8) + "01";
  const end = today.slice(0, 8) + String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
  return fetchAllRows<Transaction>((first, last) => {
    let query = supabase.from("transactions").select("*")
      .order("date", { ascending: false }).order("created_at", { ascending: false }).order("id", { ascending: false });
    // Match getTransactions: household wins over personalOnly; empty users = no filter.
    if (scope.householdId) query = query.eq("household_id", scope.householdId);
    else if (scope.personalOnly) query = query.is("household_id", null);
    if (scope.userIds?.length) query = query.in("user_id", scope.userIds);
    return query.or(`and(date.gte.${from},date.lte.${today}),and(recurring_occurrence_date.gte.${today},recurring_occurrence_date.lte.${end})`).range(first, last);
  });
}
