import { SupabaseClient } from "@supabase/supabase-js";
import { CreditCard, CardType } from "@/types";
import { fetchAllRows } from "../lib/utils/pagination.mjs";

export interface CreditCardInput {
  name: string;
  card_type: CardType;
  credit_limit: number;
  billing_date?: number | null;
  due_date?: number | null;
  color?: string;
}

export async function getCreditCards(supabase: SupabaseClient): Promise<CreditCard[]> {
  return fetchAllRows<CreditCard>((from, to) => supabase
    .from("credit_cards")
    .select("*")
    .order("created_at", { ascending: true })
    .order("id", { ascending: true }).range(from, to));
}

export async function createCreditCard(
  supabase: SupabaseClient,
  userId: string,
  input: CreditCardInput
): Promise<CreditCard> {
  const { data, error } = await supabase
    .from("credit_cards")
    .insert({ ...input, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CreditCard;
}

export async function updateCreditCard(
  supabase: SupabaseClient,
  cardId: string,
  userId: string,
  input: Partial<CreditCardInput>
): Promise<CreditCard> {
  const { data, error } = await supabase
    .from("credit_cards")
    .update(input)
    .eq("id", cardId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as CreditCard;
}

export async function deleteCreditCard(
  supabase: SupabaseClient,
  cardId: string
): Promise<void> {
  const { error } = await supabase.from("credit_cards").delete().eq("id", cardId);
  if (error) throw new Error(error.message);
}

export async function getCardBalances(
  supabase: SupabaseClient,
  cards: readonly Pick<CreditCard, "id">[],
  excludeTransactionId?: string,
): Promise<Record<string, number>> {
  if (cards.length === 0) return {};

  const cardIds = cards.map((c) => c.id);
  const data = await fetchAllRows<{ card_id: string; balance: number | string }>((from, to) => supabase
    .rpc("get_card_balances", { excluded_transaction_id: excludeTransactionId ?? null })
    .in("card_id", cardIds).order("card_id").range(from, to));

  const balances: Record<string, number> = {};
  for (const card of cards) balances[card.id] = 0;

  const found = new Set<string>();
  for (const row of data) if (Object.hasOwn(balances, row.card_id)) {
    balances[row.card_id] = Number(row.balance);
    found.add(row.card_id);
  }
  if (cards.some(card => !found.has(card.id))) throw new Error("Card balance unavailable");

  return balances;
}

export async function getCardsWithBalance(
  supabase: SupabaseClient,
  excludeTransactionId?: string,
): Promise<(CreditCard & { balance: number; available: number })[]> {
  const cards = await getCreditCards(supabase);
  const balances = await getCardBalances(supabase, cards, excludeTransactionId);
  return cards.map((card) => {
    const balance = balances[card.id] ?? 0;
    return {
      ...card,
      balance,
      // debit: available = ยอดเงินในบัตร, credit: available = วงเงินคงเหลือ
      available: card.card_type === "debit" ? balance : card.credit_limit - balance,
    };
  });
}
