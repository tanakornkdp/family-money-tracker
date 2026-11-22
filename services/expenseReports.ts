import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "../lib/utils/pagination.mjs";
import type { Category, Household, Transaction } from "@/types";
import { getDisplayNamesByUserIds } from "@/services/userSettings";
import { getUserHouseholds, getHouseholdMembers } from "@/services/households";
import { getCreditCards } from "@/services/creditCards";
import { filterTransactions } from "@/services/transactionFilters";

export type ReportGranularity = "day" | "month";
export type ReportScope = "personal" | "household";

export interface ExpenseTrendPoint {
  period: string;
  label: string;
  amount: number;
}

export interface ExpenseCategoryPoint {
  category: string;
  amount: number;
}

export interface ExpenseReportSummary {
  total: number;
  count: number;
  dailyAverage: number;
}

export interface ReportMemberOption {
  userId: string;
  name: string;
  householdId: string;
}

export interface ExpenseReportData {
  filterTotal: number;
  filtersActive: boolean;
  query: string;
  account: string;
  transactionType: "all" | "income" | "expense";
  accounts: { key: string; name: string }[];
  from: string;
  to: string;
  granularity: ReportGranularity;
  scope: ReportScope;
  householdId: string;
  memberId: string;
  households: Household[];
  members: ReportMemberOption[];
  categories: string[];
  selectedCategories: string[];
  currency: string;
  locale: "th" | "en";
  summary: ExpenseReportSummary;
  trend: ExpenseTrendPoint[];
  categoryComparison: ExpenseCategoryPoint[];
  exportRows: { id: string; type: Transaction["type"]; date: string; title: string; category: string; amount: number; scope: string }[];
}

function getBangkokToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return values.year + "-" + values.month + "-" + values.day;
}

function isDateOnly(value: string | undefined): value is string {
  return !!value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z"));
}

function isWalletTopUp(category: string): boolean {
  return category === "เติมเงินวอลเล็ต";
}

function periodFor(date: string, granularity: ReportGranularity): string {
  return granularity === "day" ? date : date.slice(0, 7);
}

function periodLabel(period: string, granularity: ReportGranularity, locale: "th" | "en"): string {
  const dateValue = granularity === "day" ? period : period + "-01";
  const date = new Date(dateValue + "T00:00:00Z");
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", granularity === "day"
    ? { month: "short", day: "numeric", timeZone: "UTC" }
    : { month: "short", year: "2-digit", timeZone: "UTC" }).format(date);
}

export function buildExpenseReport(
  transactions: Transaction[],
  from: string,
  to: string,
  selectedCategories: string[],
  granularity: ReportGranularity,
  locale: "th" | "en",
  type: ExpenseReportData["transactionType"] = "expense",
): Pick<ExpenseReportData, "summary" | "trend" | "categoryComparison"> {
  const selected = new Set(selectedCategories);
  const expenses = transactions.filter((transaction) =>
    (type === "all" || transaction.type === type) &&
    !isWalletTopUp(transaction.category) &&
    transaction.date >= from &&
    transaction.date <= to &&
    (selected.size === 0 || selected.has(transaction.category)) &&
    Number.isFinite(Number(transaction.amount)) &&
    Number(transaction.amount) >= 0
  );

  const byPeriod = new Map<string, number>();
  const byCategory = new Map<string, number>();
  let total = 0;
  for (const transaction of expenses) {
    const amount = Number(transaction.amount);
    total += amount;
    const period = periodFor(transaction.date, granularity);
    byPeriod.set(period, (byPeriod.get(period) ?? 0) + amount);
    byCategory.set(transaction.category, (byCategory.get(transaction.category) ?? 0) + amount);
  }

  const fromTime = Date.parse(from + "T00:00:00Z");
  const toTime = Date.parse(to + "T00:00:00Z");
  const days = Number.isFinite(fromTime) && Number.isFinite(toTime)
    ? Math.max(1, Math.floor((toTime - fromTime) / 86_400_000) + 1)
    : 1;

  return {
    summary: {
      total,
      count: expenses.length,
      dailyAverage: total / days,
    },
    trend: Array.from(byPeriod.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, label: periodLabel(period, granularity, locale), amount })),
    categoryComparison: Array.from(byCategory.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount || a.category.localeCompare(b.category)),
  };
}

async function getReportTransactions(
  supabase: SupabaseClient,
  options: { userId: string; householdId?: string; memberId?: string; from: string; to: string },
): Promise<Transaction[]> {
  return fetchAllRows<Transaction>((from, to) => {
    let query = supabase.from("transactions").select("*")
      .gte("date", options.from).lte("date", options.to)
      .order("date", { ascending: true }).order("created_at", { ascending: true }).order("id", { ascending: true });
    if (options.householdId) query = query.eq("household_id", options.householdId);
    else query = query.eq("user_id", options.userId).is("household_id", null);
    if (options.memberId) query = query.eq("user_id", options.memberId);

    return query.range(from, to);
  });
}

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function singleParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function multiParam(value: string | string[] | undefined): string[] {
  return (Array.isArray(value) ? value : value ? [value] : []).filter(Boolean);
}

export async function loadExpenseReportData(
  supabase: SupabaseClient,
  userId: string,
  searchParams: SearchParams,
): Promise<ExpenseReportData> {
  const params = await searchParams;
  const today = getBangkokToday();
  const monthStart = today.slice(0, 8) + "01";
  let from = singleParam(params.from);
  let to = singleParam(params.to);
  if (!isDateOnly(from) || !isDateOnly(to) || from > to) {
    from = monthStart;
    to = today;
  }

  const [settings, households, ownCategories, cards] = await Promise.all([
    getCachedUserSettings(userId),
    getUserHouseholds(supabase),
    supabase.from("categories").select("name,type").order("name", { ascending: true }),
    getCreditCards(supabase),
  ]);
  if (ownCategories.error) throw new Error(ownCategories.error.message);

  const requestedScope = singleParam(params.scope);
  const scope: ReportScope = requestedScope?.startsWith("household:") || requestedScope === "household"
    ? "household"
    : "personal";
  const scopedHouseholdId = requestedScope?.startsWith("household:")
    ? requestedScope.slice("household:".length)
    : undefined;
  const requestedHouseholdId = scopedHouseholdId ?? singleParam(params.household);
  const selectedHousehold = scope === "household"
    ? households.find((household) => household.id === requestedHouseholdId) ?? households[0]
    : null;
  const householdMembers = selectedHousehold
    ? await getHouseholdMembers(supabase, selectedHousehold.id)
    : [];
  const profiles = await getDisplayNamesByUserIds(supabase, householdMembers.map((member) => member.user_id));
  const members = householdMembers.map((member) => ({
    userId: member.user_id,
    name: profiles[member.user_id] || member.display_name?.trim() || member.user_id.slice(0, 8),
    householdId: member.household_id,
  }));
  const requestedMemberId = singleParam(params.member) ?? "";
  const memberId = selectedHousehold && members.some((member) =>
    member.householdId === selectedHousehold.id && member.userId === requestedMemberId
  ) ? requestedMemberId : "";

  const transactions = await getReportTransactions(supabase, {
    userId,
    householdId: selectedHousehold?.id,
    memberId,
    from,
    to,
  });
  const requestedType = singleParam(params.type);
  const transactionType = requestedType === "income" || requestedType === "expense" ? requestedType : "all";
  const query = (singleParam(params.q) ?? "").trim().slice(0, 120);
  const account = singleParam(params.account) ?? "";
  const cardNames = Object.fromEntries(cards.map(card => [card.id, card.name]));
  const accounts = [...new Set(transactions.map(tx => tx.card_id ? `card:${tx.card_id}` : `method:${tx.payment_method ?? "cash"}`))]
    .map(key => ({ key, name: key.startsWith("card:") ? cardNames[key.slice(5)] ?? "" : "" }));
  const filtered = filterTransactions(transactions, { query, account, type: transactionType }, {}, cardNames);
  const categoriesFromTransactions = filtered
    .filter((transaction) => !isWalletTopUp(transaction.category))
    .map((transaction) => transaction.category);
  const categoryRows = ownCategories.data as Pick<Category, "name" | "type">[];
  const categories = Array.from(new Set([
    ...categoryRows.filter((category) => transactionType === "all" || category.type === "both" || category.type === transactionType).map((category) => category.name),
    ...categoriesFromTransactions,
  ])).sort((a, b) => a.localeCompare(b));
  const validCategoryNames = new Set(categories);
  const selectedCategories = multiParam(params.category).filter((category) => validCategoryNames.has(category));
  const granularity: ReportGranularity = singleParam(params.groupBy) === "month" ? "month" : "day";
  const locale = settings?.language === "en" ? "en" : "th";
  const report = buildExpenseReport(filtered, from, to, selectedCategories, granularity, locale, transactionType);

  return {
    query, account, transactionType, accounts,
    filterTotal: transactions.filter(transaction => !isWalletTopUp(transaction.category)).length,
    filtersActive: Boolean(query || account || transactionType !== "all" || selectedCategories.length ||
      selectedHousehold || granularity !== "day" || from !== monthStart || to !== today),
    from,
    to,
    granularity,
    scope,
    householdId: selectedHousehold?.id ?? "",
    memberId,
    households,
    members,
    categories,
    selectedCategories,
    currency: settings?.currency ?? "THB",
    locale,
    ...report,
    exportRows: filtered.filter((transaction) => !isWalletTopUp(transaction.category) && (selectedCategories.length === 0 || selectedCategories.includes(transaction.category))).map((transaction) => ({ id: transaction.id, type: transaction.type, date: transaction.date, title: transaction.title, category: transaction.category, amount: Number(transaction.amount), scope: transaction.household_id ? "household" : "personal" })),
  };
}





