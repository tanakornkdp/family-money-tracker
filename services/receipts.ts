import { SupabaseClient } from "@supabase/supabase-js";
import { Receipt } from "@/types";

export async function uploadReceiptFile(
  supabase: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage
    .from("receipts")
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw new Error(error.message);
  return filePath;
}

export async function createReceiptRecord(
  supabase: SupabaseClient,
  userId: string,
  filePath: string
): Promise<Receipt> {
  const { data, error } = await supabase
    .from("receipts")
    .insert({
      user_id: userId,
      file_path: filePath,
      status: "pending",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as Receipt;
}

export async function getReceipts(
  supabase: SupabaseClient
): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from("receipts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data as Receipt[];
}

export async function getReceiptSignedUrl(
  supabase: SupabaseClient,
  filePath: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("receipts")
    .createSignedUrl(filePath, 3600);

  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export async function convertReceiptToTransaction(
  supabase: SupabaseClient,
  receiptId: string,
  transactionId: string
): Promise<void> {
  const { error } = await supabase
    .from("receipts")
    .update({ status: "converted", transaction_id: transactionId })
    .eq("id", receiptId);

  if (error) throw new Error(error.message);
}