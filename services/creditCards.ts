import { SupabaseClient } from "@supabase/supabase-js";
import { CreditCard, CardType } from "@/types";

export interface CreditCardInput {
  name: string;
  card_type: CardType;
  credit_limit: number;
  billing_date?: number | null;
  due_date?: number | null;
  color?: string;
}

export async function getCreditCards(supabase: SupabaseClient): Promise<CreditCard[]> {
  const { data, error } = await supabase
    .from("credit_cards")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return data as CreditCard[];
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
  input: Partial<CreditCardInput>
): Promise<CreditCard> {
  const { data, error } = await supabase
    .from("credit_cards")
    .update(input)
    .eq("id", cardId)
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
  cards: CreditCard[]
): Promise<Record<string, number>> {
  if (cards.length === 0) return {};

  const cardIds = cards.map((c) => c.id);
  const { data, error } = await supabase
    .from("transactions")
    .select("card_id, amount, type, category")
    .in("card_id", cardIds);

  if (error) throw new Error(error.message);

  const balances: Record<string, number> = {};
  for (const card of cards) balances[card.id] = 0;

  for (const tx of data as { card_id: string; amount: number; type: string; category: string }[]) {
    if (!tx.card_id) continue;
    
    const card = cards.find((c) => c.id === tx.card_id);
    
    if (card?.card_type === "debit") {
      if (tx.category === "เติมเงินวอลเล็ต") {
        // เติมเงิน = เพิ่มยอดในบัตร
        balances[tx.card_id] = (balances[tx.card_id] ?? 0) + Number(tx.amount);
      } else {
        // ใช้จ่ายผ่านบัตร = ลดยอดในบัตร
        balances[tx.card_id] = (balances[tx.card_id] ?? 0) - Number(tx.amount);
      }
    } else {
      // credit: expense = ยอดหนี้ (+), income = ชำระ (-)
      if (tx.type === "expense") {
        balances[tx.card_id] = (balances[tx.card_id] ?? 0) + Number(tx.amount);
      } else if (tx.type === "income") {
        balances[tx.card_id] = (balances[tx.card_id] ?? 0) - Number(tx.amount);
      }
    }
  }

  return balances;
}

export async function getCardsWithBalance(
  supabase: SupabaseClient
): Promise<(CreditCard & { balance: number; available: number })[]> {
  const cards = await getCreditCards(supabase);
  const results = await Promise.all(
    cards.map(async (card) => {
      const balances = await getCardBalances(supabase, [card]);
      const balance = balances[card.id] ?? 0;
      return {
        ...card,
        balance: balance,
        // debit: available = ยอดเงินในบัตร, credit: available = วงเงินคงเหลือ
        available: card.card_type === "debit" ? balance : card.credit_limit - balance,
      };
    })
  );

  return results;
}