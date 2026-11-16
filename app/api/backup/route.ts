import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
const TABLES = ["user_settings", "categories", "credit_cards", "travel_trips", "financial_goals", "transaction_titles", "budget_plans", "recurring_bills", "transactions", "goal_contributions", "account_reconciliations", "receipts"] as const;
type ReceiptBackupFile = { receipt_id: string; content_type: string; base64: string };
type Backup = { format: "family-money-backup"; version: 1 | 2; created_at: string; data: Record<string, Record<string, unknown>[]>; receipt_files?: ReceiptBackupFile[] };

export async function GET() {
  const user = await requireUser();
  const supabase = await createClient();
  const data: Backup["data"] = {};
  for (const table of TABLES) {
    const { data: rows, error } = await supabase.from(table).select("*").eq("user_id", user.id);
    if (error) return NextResponse.json({ error: `Could not back up ${table}: ${error.message}` }, { status: 500 });
    data[table] = (rows ?? []) as Record<string, unknown>[];
  }
  const receiptRows = data.receipts ?? [];
  const receiptFiles: ReceiptBackupFile[] = [];
  let imageBytes = 0;
  for (const row of receiptRows) {
    const path = row.file_path;
    if (typeof path !== "string" || !path.startsWith(`${user.id}/`)) continue;
    const { data: file, error } = await supabase.storage.from("receipts").download(path);
    if (error || !file) return NextResponse.json({ error: `Could not back up receipt image ${String(row.id)}: ${error?.message ?? "file unavailable"}` }, { status: 500 });
    imageBytes += file.size;
    if (imageBytes > 30_000_000) return NextResponse.json({ error: "Receipt images are larger than the 30 MB backup limit. Remove older images and try again." }, { status: 413 });
    const bytes = Buffer.from(await file.arrayBuffer());
    const extension = path.split(".").pop()?.toLowerCase();
    const detectedType = file.type.startsWith("image/") ? file.type : ({ jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", heic: "image/heic", heif: "image/heif" } as Record<string, string>)[extension ?? ""];
    if (!detectedType) return NextResponse.json({ error: `Receipt image ${String(row.id)} has an unsupported file type.` }, { status: 415 });
    receiptFiles.push({ receipt_id: String(row.id), content_type: detectedType, base64: bytes.toString("base64") });
  }
  const backup: Backup = { format: "family-money-backup", version: 2, created_at: new Date().toISOString(), data, receipt_files: receiptFiles };
  return new NextResponse(JSON.stringify(backup, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="family-money-backup-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > 10_000_000) return NextResponse.json({ error: "Backup file must be 10 MB or smaller." }, { status: 413 });
  let payload: unknown;
  try { payload = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON backup file." }, { status: 400 }); }
  if (!payload || typeof payload !== "object" || (payload as Backup).format !== "family-money-backup" || ![1, 2].includes((payload as Backup).version) || !(payload as Backup).data || typeof (payload as Backup).data !== "object") return NextResponse.json({ error: "Unsupported backup format." }, { status: 400 });

  const supabase = await createClient();
  const data = (payload as Backup).data;
  const errors: string[] = [];
  // Restore is merge-only. Ownership is always rewritten to the authenticated user.
  // Household links are stripped so a backup cannot write into a shared space.
  for (const table of TABLES) {
    if (!Array.isArray(data[table])) continue;
    const rows: Record<string, unknown>[] = data[table].filter((row): row is Record<string, unknown> => !!row && typeof row === "object" && !Array.isArray(row)).slice(0, 10000)
      .map((row) => ({ ...row, user_id: user.id, ...(table === "budget_plans" || table === "transactions" || table === "financial_goals" || table === "recurring_bills" ? { household_id: null } : {}) }));
    if (!rows.length) continue;
    if (table === "receipts") {
      // Receipt images are uploaded directly by the signed-in browser so large images do not
      // exceed serverless request limits. The browser rewrites file_path to this user's folder.
      for (const row of rows) {
        if (typeof row.file_path !== "string" || !row.file_path.startsWith(`${user.id}/`)) {
          row.file_path = `${user.id}/image-not-included-${String(row.id)}`;
        }
      }
    }
    const conflict = table === "user_settings" ? "user_id" : "id";
    const { error } = await supabase.from(table).upsert(rows, { onConflict: conflict });
    if (error) { errors.push(`${table}: ${error.message}`); break; }
  }
  if (!errors.length && Array.isArray(data.financial_goals)) {
    for (const row of data.financial_goals) {
      if (typeof row.id !== "string" || !Number.isFinite(Number(row.current_amount))) continue;
      const { error } = await supabase.from("financial_goals").update({ current_amount: Number(row.current_amount) }).eq("id", row.id).eq("user_id", user.id);
      if (error) { errors.push("financial_goals: " + error.message); break; }
    }
  }
  if (errors.length) return NextResponse.json({ error: "Restore stopped at the first table error. Earlier tables may already have been restored.", details: errors }, { status: 400 });
  return NextResponse.json({ restored: true });
}
