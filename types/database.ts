export type TransactionType = "income" | "expense";

export interface Receipt {
  id: string;
  user_id: string;
  file_path: string;
  ocr_text: string | null;
  parsed_amount: number | null;
  parsed_merchant: string | null;
  parsed_date: string | null;
  status: "pending" | "processed" | "failed" | "converted";
  transaction_id: string | null;
  created_at: string;
}

export interface AiMessage {
  id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}
export type CategoryType = "income" | "expense" | "both";

export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: CategoryType;
  created_at: string;
  icon: string;
}

export type AppLanguage = "en" | "th";
export type AppTheme = "light" | "dark" | "system";

export interface UserSettings {
  user_id: string;
  currency: string;
  language: AppLanguage;
  theme: AppTheme;
  avatar_url: string | null;
  full_name: string | null;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: "owner" | "member";
  display_name: string | null;
  joined_at: string;
}

export interface HouseholdInvite {
  id: string;
  household_id: string;
  email: string;
  invited_by: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  household_id: string | null;
  title: string;
  title_id: string | null;
  amount: number;
  type: TransactionType;
  category: string;
  date: string;
  payment_method: PaymentMethod;
  card_id: string | null;
  created_at: string;
}

export type GoalType = "savings" | "travel" | "investment" | "emergency_fund" | "debt_payoff" | "other";
export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export interface FinancialGoal {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  current_amount: number;
  target_date: string | null;
  status: GoalStatus;
  created_at: string;
  updated_at: string;
}

export interface GoalContribution {
  id: string;
  goal_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  created_at: string;
}

export interface TransactionTitle {
  id: string;
  user_id: string;
  name: string;
  type: TransactionType;
  category: string;
  goal_id: string | null;
  icon: string;
  created_at: string;
}

export interface BudgetPlan {
  id: string;
  user_id: string;
  household_id: string | null;
  name: string;
  total_amount: number;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface DailyBudgetStatus {
  date: string;
  dailyAllowance: number;
  spentAmount: number;
  cumulativeBudget: number;
  cumulativeSpent: number;
  remaining: number;
  isOverBudget: boolean;
}

export type CardType = "credit" | "debit";

export interface CreditCard {
  id: string;
  user_id: string;
  name: string;
  card_type: CardType;
  credit_limit: number;
  billing_date: number | null;
  due_date: number | null;
  color: string;
  created_at: string;
}

export type PaymentMethod = "cash" | "credit_card" | "debit_card";