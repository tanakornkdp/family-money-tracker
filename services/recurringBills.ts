import { PaymentMethod, TransactionType } from "@/types";

export interface RecurringBill {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  category: string;
  frequency: "weekly" | "monthly" | "yearly";
  start_date: string; // YYYY-MM-DD
  payment_method: PaymentMethod;
  card_id?: string | null;
  household_id?: string | null;
  is_active: boolean;
}

const STORAGE_KEY = "smart_finance_recurring_bills";

export function getRecurringBills(): RecurringBill[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    // Seed some default subscriptions for mock/experience if empty
    const defaults: RecurringBill[] = [
      {
        id: "rec_netflix",
        name: "Netflix Premium",
        amount: 419,
        type: "expense",
        category: "ความบันเทิง",
        frequency: "monthly",
        start_date: "2026-07-05",
        payment_method: "credit_card",
        card_id: null,
        household_id: null,
        is_active: true,
      },
      {
        id: "rec_spotify",
        name: "Spotify Family",
        amount: 209,
        type: "expense",
        category: "ความบันเทิง",
        frequency: "monthly",
        start_date: "2026-07-15",
        payment_method: "credit_card",
        card_id: null,
        household_id: null,
        is_active: true,
      },
      {
        id: "rec_insurance",
        name: "ประกันภัยรถยนต์",
        amount: 1500,
        type: "expense",
        category: "ยานพาหนะ",
        frequency: "monthly",
        start_date: "2026-07-25",
        payment_method: "cash",
        card_id: null,
        household_id: null,
        is_active: true,
      }
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
    return defaults;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveRecurringBills(bills: RecurringBill[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
}

export function addRecurringBill(bill: Omit<RecurringBill, "id">): RecurringBill {
  const bills = getRecurringBills();
  const newBill: RecurringBill = {
    ...bill,
    id: "rec_" + Math.random().toString(36).substr(2, 9),
  };
  bills.push(newBill);
  saveRecurringBills(bills);
  return newBill;
}

export function updateRecurringBill(id: string, updated: Partial<RecurringBill>): RecurringBill {
  const bills = getRecurringBills();
  const index = bills.findIndex((b) => b.id === id);
  if (index === -1) throw new Error("Recurring bill not found");
  
  const newBill = { ...bills[index], ...updated };
  bills[index] = newBill;
  saveRecurringBills(bills);
  return newBill;
}

export function deleteRecurringBill(id: string) {
  const bills = getRecurringBills();
  const filtered = bills.filter((b) => b.id !== id);
  saveRecurringBills(filtered);
}

/**
 * Calculates occurrences of recurring bills between a given date range.
 */
export function getUpcomingOccurrences(
  startDateStr: string,
  endDateStr: string,
  householdId?: string | null
): { date: string; bill: RecurringBill }[] {
  const bills = getRecurringBills().filter((b) => b.is_active);
  const occurrences: { date: string; bill: RecurringBill }[] = [];
  
  const rangeStart = new Date(startDateStr);
  const rangeEnd = new Date(endDateStr);

  for (const bill of bills) {
    if (householdId && bill.household_id !== householdId) continue;
    if (!householdId && bill.household_id) continue; // If looking for personal, skip household

    const billStart = new Date(bill.start_date);
    const current = new Date(billStart);

    // Keep adding intervals until we hit or pass the end date
    while (current <= rangeEnd) {
      if (current >= rangeStart) {
        occurrences.push({
          date: current.toISOString().split("T")[0],
          bill,
        });
      }

      // Increment based on frequency
      if (bill.frequency === "weekly") {
        current.setDate(current.getDate() + 7);
      } else if (bill.frequency === "monthly") {
        current.setMonth(current.getMonth() + 1);
      } else if (bill.frequency === "yearly") {
        current.setFullYear(current.getFullYear() + 1);
      } else {
        break; // safety net
      }
    }
  }

  return occurrences.sort((a, b) => a.date.localeCompare(b.date));
}
