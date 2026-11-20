import type { PaymentMethod, TransactionType } from "@/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toDateInputValue } from "@/lib/utils/dateHelpers";
import { fetchAllRows } from "../lib/utils/pagination.mjs";

export interface RecurringBill {
  id: string;
  user_id?: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: "weekly" | "monthly" | "yearly";
  start_date: string;
  payment_method: PaymentMethod;
  card_id?: string | null;
  household_id?: string | null;
  is_active: boolean;
  item_kind: RecurringItemKind;
  review_status: SubscriptionReviewStatus;
}

export type RecurringItemKind = "bill" | "subscription";
export type SubscriptionReviewStatus = "active" | "review" | "not_using";

export function normalizeRecurringBillMetadata(value: { item_kind?: unknown; review_status?: unknown }): Pick<RecurringBill, "item_kind" | "review_status"> {
  return {
    item_kind: value.item_kind === "subscription" ? "subscription" : "bill",
    review_status: value.review_status === "review" || value.review_status === "not_using" ? value.review_status : "active",
  };
}

export function getMonthlyCommitmentAmount(item: Pick<RecurringBill, "amount" | "frequency">): number {
  const amount = Number(item.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  if (item.frequency === "weekly") return amount * 52 / 12;
  if (item.frequency === "yearly") return amount / 12;
  return amount;
}

export function calculateMonthlySubscriptionCommitment(items: RecurringBill[]): number {
  return items.reduce((total, item) => {
    if (item.item_kind !== "subscription" || item.review_status === "not_using" || !item.is_active || item.type !== "expense") return total;
    return total + getMonthlyCommitmentAmount(item);
  }, 0);
}

const STORAGE_KEY = "smart_finance_recurring_bills";
const storageKey = (userId: string) => `${STORAGE_KEY}:${userId}`;

function parseStoredBills(value: string): RecurringBill[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((bill): bill is RecurringBill =>
      Boolean(
        bill &&
        typeof bill === "object" &&
        typeof bill.id === "string" &&
        typeof bill.name === "string" &&
        Number.isFinite(Number(bill.amount)) &&
        ["income", "expense"].includes(bill.type) &&
        typeof bill.category === "string" &&
        ["weekly", "monthly", "yearly"].includes(bill.frequency) &&
        typeof bill.start_date === "string" &&
        typeof bill.is_active === "boolean"
      )
    ).map((bill) => ({ ...bill, ...normalizeRecurringBillMetadata(bill) }));
  } catch {
    return [];
  }
}

function getLegacyRecurringBills(userId: string): RecurringBill[] {
  if (typeof window === "undefined" || !userId) return [];
  const stored = localStorage.getItem(storageKey(userId));
  return stored ? parseStoredBills(stored) : [];
}

export async function getRecurringBills(
  supabase: SupabaseClient,
  userId: string,
  { includeShared = false }: { includeShared?: boolean } = {},
): Promise<RecurringBill[]> {
  if (!userId) return [];
  const loadFromDatabase = async () => {
    return fetchAllRows<RecurringBill>((from, to) => {
      let query = supabase.from("recurring_bills").select("*").order("start_date").order("id");
      if (!includeShared) query = query.eq("user_id", userId);
      return query.range(from, to);
    });
  };
  if (typeof window !== "undefined") {
    const migratedKey = `${storageKey(userId)}:migrated`;
    if (!localStorage.getItem(migratedKey)) {
      const lockKey = storageKey(userId) + ":migrating";
      const lockTimestamp = Number(localStorage.getItem(lockKey) ?? 0);
      if (lockTimestamp && Date.now() - lockTimestamp < 30_000) {
        for (let attempt = 0; attempt < 300 && !localStorage.getItem(migratedKey); attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (localStorage.getItem(migratedKey)) return loadFromDatabase();
      }
      localStorage.setItem(lockKey, String(Date.now()));
      const legacy = getLegacyRecurringBills(userId);
      try {
        if (legacy.length) {
          const rows = legacy.map((bill) => ({ ...Object.fromEntries(Object.entries(bill).filter(([key]) => key !== "id")), user_id: userId }));
          const { error: migrationError } = await supabase.from("recurring_bills").insert(rows);
          if (migrationError) throw new Error(migrationError.message);
        }
        localStorage.setItem(migratedKey, "1");
        localStorage.removeItem(storageKey(userId));
      } finally {
        localStorage.removeItem(lockKey);
      }
    }
  }
  return loadFromDatabase();
}

export async function getHouseholdRecurringBills(
  supabase: SupabaseClient,
  householdId: string,
  memberIds: string[],
): Promise<RecurringBill[]> {
  return fetchAllRows<RecurringBill>((from, to) => {
    let query = supabase.from("recurring_bills").select("*").eq("household_id", householdId).order("start_date").order("id");
    if (memberIds.length) query = query.in("user_id", memberIds);
    return query.range(from, to);
  });
}

export async function addRecurringBill(
  supabase: SupabaseClient,
  userId: string,
  bill: Omit<RecurringBill, "id" | "item_kind" | "review_status"> & Partial<Pick<RecurringBill, "item_kind" | "review_status">>
): Promise<RecurringBill> {
  const metadata = normalizeRecurringBillMetadata(bill);
  const { data, error } = await supabase.from("recurring_bills").insert({ ...bill, ...metadata, user_id: userId }).select().single();
  if (error) throw new Error(error.message);
  return data as RecurringBill;
}

export async function updateRecurringBill(
  supabase: SupabaseClient,
  userId: string,
  id: string,
  updated: Partial<RecurringBill>
): Promise<RecurringBill> {
  const { data, error } = await supabase.from("recurring_bills").update(updated).eq("user_id", userId).eq("id", id).select().single();
  if (error) throw new Error(error.message);
  return data as RecurringBill;
}

export async function deleteRecurringBill(supabase: SupabaseClient, userId: string, id: string): Promise<void> {
  const { error } = await supabase.from("recurring_bills").delete().eq("user_id", userId).eq("id", id);
  if (error) throw new Error(error.message);
}

function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match
    ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : new Date(value);
}

export function getUpcomingOccurrences(
  bills: RecurringBill[],
  startDateStr: string,
  endDateStr: string,
  householdId?: string | null
): { date: string; bill: RecurringBill }[] {
  const rangeStart = parseLocalDate(startDateStr);
  const rangeEnd = parseLocalDate(endDateStr);
  if (!Number.isFinite(rangeStart.getTime()) || !Number.isFinite(rangeEnd.getTime())) return [];

  const occurrences: { date: string; bill: RecurringBill }[] = [];
  for (const bill of bills.filter((item) => item.is_active)) {
    if (householdId ? bill.household_id !== householdId : Boolean(bill.household_id)) continue;

    const start = parseLocalDate(bill.start_date);
    if (!Number.isFinite(start.getTime())) continue;
    const originalDay = start.getDate();
    const current = new Date(start);

    while (current <= rangeEnd) {
      if (current >= rangeStart) occurrences.push({ date: toDateInputValue(current), bill });

      if (bill.frequency === "weekly") {
        current.setDate(current.getDate() + 7);
      } else if (bill.frequency === "monthly") {
        current.setDate(1);
        current.setMonth(current.getMonth() + 1);
        const lastDay = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        current.setDate(Math.min(originalDay, lastDay));
      } else {
        const nextYear = current.getFullYear() + 1;
        const lastDay = new Date(nextYear, current.getMonth() + 1, 0).getDate();
        current.setFullYear(nextYear, current.getMonth(), Math.min(originalDay, lastDay));
      }
    }
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date));
}
