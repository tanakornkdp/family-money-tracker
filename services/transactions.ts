import { SupabaseClient } from "@supabase/supabase-js";
import { Transaction, TransactionType, PaymentMethod } from "@/types";
import { getPeriodKey, formatPeriodLabel, PeriodGranularity } from "@/lib/utils/dateHelpers";

export interface TransactionInput {
  title: string;
  title_id?: string | null;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  household_id?: string | null;
  payment_method?: PaymentMethod;
  card_id?: string | null;
}

export async function getTransactions(
  supabase: SupabaseClient,
  options?: {
    limit?: number;
    householdId?: string | null;
    userIds?: string[];
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<Transaction[]> {
  let query = supabase
    .from("transactions")
    .select("*")
    .order("date", { ascending: false });

  if (options?.householdId) {
    query = query.eq("household_id", options.householdId);
  }

  if (options?.userIds && options.userIds.length > 0) {
    query = query.in("user_id", options.userIds);
  }

  if (options?.dateFrom) {
    query = query.gte("date", options.dateFrom);
  }

  if (options?.dateTo) {
    query = query.lte("date", options.dateTo);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw new Error(error.message);
  return data as Transaction[];
}

export async function createTransaction(
  supabase: SupabaseClient,
  userId: string,
  input: TransactionInput
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Transaction;
}

export async function updateTransaction(
  supabase: SupabaseClient,
  id: string,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const { data, error } = await supabase
    .from("transactions")
    .update(input)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Transaction;
}

export async function deleteTransaction(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export function calculateKpis(transactions: Transaction[]) {
  // กรอง transaction เติมวอลเล็ตออก ไม่นับเป็นรายจ่าย
  const filtered = transactions.filter(
    (t) => t.category !== "เติมเงินวอลเล็ต"
  );

  const totalIncome = filtered
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalExpense = filtered
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: filtered.length,
  };
}

export interface MemberBreakdown {
  userId: string;
  totalIncome: number;
  totalExpense: number;
  transactionCount: number;
}

export function calculateMemberBreakdown(transactions: Transaction[]): MemberBreakdown[] {
  const map = new Map<string, MemberBreakdown>();

  for (const t of transactions) {
    if (!map.has(t.user_id)) {
      map.set(t.user_id, {
        userId: t.user_id,
        totalIncome: 0,
        totalExpense: 0,
        transactionCount: 0,
      });
    }
    const entry = map.get(t.user_id)!;
    if (t.type === "income") {
      entry.totalIncome += Number(t.amount);
    } else {
      entry.totalExpense += Number(t.amount);
    }
    entry.transactionCount += 1;
  }

  return Array.from(map.values());
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export function calculateCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  const total = expenseTransactions.reduce((sum, t) => sum + Number(t.amount), 0);

  if (total === 0) return [];

  const map = new Map<string, number>();
  for (const t of expenseTransactions) {
    map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
  }

  return Array.from(map.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percentage: (amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface TypeBreakdown {
  type: "income" | "expense";
  amount: number;
  percentage: number;
}

export function calculateTypeBreakdown(transactions: Transaction[]): TypeBreakdown[] {
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const total = totalIncome + totalExpense;
  if (total === 0) return [];

  return [
    { type: "income", amount: totalIncome, percentage: (totalIncome / total) * 100 },
    { type: "expense", amount: totalExpense, percentage: (totalExpense / total) * 100 },
  ];
}

export interface StackedBarPoint {
  period: string;
  label: string;
  [category: string]: string | number;
}

export function calculateStackedBarData(
  transactions: Transaction[],
  granularity: PeriodGranularity
): { data: StackedBarPoint[]; categories: string[] } {
  const expenseTransactions = transactions.filter((t) => t.type === "expense");
  const categorySet = new Set<string>();
  const periodMap = new Map<string, Record<string, number>>();

  for (const t of expenseTransactions) {
    const periodKey = getPeriodKey(t.date, granularity);
    categorySet.add(t.category);

    if (!periodMap.has(periodKey)) {
      periodMap.set(periodKey, {});
    }
    const periodData = periodMap.get(periodKey)!;
    periodData[t.category] = (periodData[t.category] ?? 0) + Number(t.amount);
  }

  const categories = Array.from(categorySet).sort();

  const data: StackedBarPoint[] = Array.from(periodMap.entries())
    .map(([period, categoryAmounts]) => {
      const point: StackedBarPoint = {
        period,
        label: formatPeriodLabel(period, granularity),
      };
      for (const cat of categories) {
        point[cat] = categoryAmounts[cat] ?? 0;
      }
      return point;
    })
    .sort((a, b) => a.period.localeCompare(b.period));

  return { data, categories };
}

export function calculateCashBalance(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => {
    // ถ้าจ่ายผ่านบัตรเดบิต ไม่กระทบเงินสด
    if (t.payment_method === "debit_card") return sum;
    
    // เติมวอลเล็ตด้วยเงินสด = เงินสดไหลออก (หัก)
    if (t.category === "เติมเงินวอลเล็ต") {
      return sum - Number(t.amount);
    }
    
    if (t.type === "income") return sum + Number(t.amount);
    if (t.type === "expense") return sum - Number(t.amount);
    return sum;
  }, 0);
}