import { SupabaseClient } from "@supabase/supabase-js";
import { Category, CategoryType } from "@/types";

export async function getCategories(
  supabase: SupabaseClient
): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);
  return data as Category[];
}

export async function createCategory(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  type: CategoryType = "both",
  icon: string = "💰"
): Promise<Category> {
  const { data, error } = await supabase
    .from("categories")
    .insert({ user_id: userId, name: name.trim(), type, icon })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Category;
}

export async function getCategoryIconMap(
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("categories")
    .select("name, icon");

  if (error) throw new Error(error.message);

  const map: Record<string, string> = {};
  for (const row of data as { name: string; icon: string }[]) {
    map[row.name] = row.icon;
  }
  return map;
}

export async function updateCategoryIcon(
  supabase: SupabaseClient,
  categoryName: string,
  userId: string,
  icon: string
): Promise<void> {
  const { error } = await supabase
    .from("categories")
    .update({ icon })
    .eq("name", categoryName)
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
}

export async function renameCategory(
  supabase: SupabaseClient,
  userId: string,
  oldName: string,
  newName: string,
  newIcon: string
): Promise<void> {
  const { error } = await supabase.rpc("rename_category", {
    p_user_id: userId,
    p_old_name: oldName,
    p_new_name: newName.trim(),
    p_new_icon: newIcon,
  });

  if (error) throw new Error(error.message);
}

export async function countTitlesUsingCategory(
  supabase: SupabaseClient,
  userId: string,
  categoryName: string
): Promise<number> {
  const { data, error } = await supabase.rpc("count_titles_using_category", {
    p_user_id: userId,
    p_category_name: categoryName,
  });

  if (error) throw new Error(error.message);
  return data as number;
}

export async function deleteCategory(
  supabase: SupabaseClient,
  categoryId: string
): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw new Error(error.message);
}