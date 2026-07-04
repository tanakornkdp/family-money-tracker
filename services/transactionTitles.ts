import { SupabaseClient } from "@supabase/supabase-js";
import { TransactionTitle, TransactionType } from "@/types";

export interface TitleInput {
  name: string;
  type: TransactionType;
  category: string;
  goal_id?: string | null;
  icon?: string;
}

export async function getTitles(supabase: SupabaseClient): Promise<TransactionTitle[]> {
  const { data, error } = await supabase
    .from("transaction_titles")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data as TransactionTitle[];
}

export async function createTitle(
  supabase: SupabaseClient,
  userId: string,
  input: TitleInput
): Promise<TransactionTitle> {
  const { data, error } = await supabase
    .from("transaction_titles")
    .insert({ ...input, user_id: userId, goal_id: input.goal_id || null })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TransactionTitle;
}

export async function updateTitle(
  supabase: SupabaseClient,
  titleId: string,
  input: Partial<TitleInput>
): Promise<TransactionTitle> {
  const { data, error } = await supabase
    .from("transaction_titles")
    .update(input)
    .eq("id", titleId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as TransactionTitle;
}

export async function deleteTitle(supabase: SupabaseClient, titleId: string): Promise<void> {
  const { error } = await supabase.from("transaction_titles").delete().eq("id", titleId);
  if (error) throw new Error(error.message);
}