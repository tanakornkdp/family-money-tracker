"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { cardColors } from "@/lib/utils/cardColors";
import { createCreditCard, updateCreditCard } from "@/services/creditCards";

const common = {
  name: z.string().trim().min(1).max(50),
  color: z.enum(Object.keys(cardColors) as [keyof typeof cardColors, ...(keyof typeof cardColors)[]]),
};
const day = z.number().int().min(1).max(31).optional();
const schema = z.discriminatedUnion("card_type", [
  z.strictObject({ ...common, card_type: z.literal("credit"), credit_limit: z.number().positive(), billing_date: day, due_date: day }),
  z.strictObject({ ...common, card_type: z.literal("debit") }),
]);

export async function saveCard(input: unknown, id?: string) {
  const data = schema.safeParse(input);
  if (!data.success || (id !== undefined && !z.uuid().safeParse(id).success)) {
    return { error: "invalid" } as const;
  }
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { error: "unauthorized" } as const;

  const values = data.data.card_type === "debit"
    ? { ...data.data, credit_limit: 0, billing_date: null, due_date: null }
    : { ...data.data, billing_date: data.data.billing_date ?? null, due_date: data.data.due_date ?? null };

  try {
    const card = id
      ? await updateCreditCard(supabase, id, auth.user.id, values)
      : await createCreditCard(supabase, auth.user.id, values);
    if (!card || card.name !== values.name || card.card_type !== values.card_type ||
      card.color !== values.color || Number(card.credit_limit) !== values.credit_limit ||
      (card.billing_date ?? null) !== values.billing_date || (card.due_date ?? null) !== values.due_date) {
      return { error: "save" } as const;
    }
    revalidatePath("/credit-cards");
    revalidatePath("/mobile/credit-cards");
    return { card } as const;
  } catch {
    return { error: "save" } as const;
  }
}
