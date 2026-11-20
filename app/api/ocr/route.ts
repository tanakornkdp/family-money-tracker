import { enforceApiRateLimit } from "@/lib/api/rateLimit";
import { apiError } from "@/lib/api/errors";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeReceiptImage } from "@/ocr/analyzeReceiptImage";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 8_192) {
    return NextResponse.json({ error: "Request payload is too large" }, { status: 413 });
  }
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let receiptId: string | undefined;

  try {
    const body = await request.json();
    receiptId = body.receiptId;
    const filePath = body.filePath;

    if (typeof receiptId !== 'string' || typeof filePath !== 'string' || !receiptId || !filePath) {
      return NextResponse.json(
        { error: "receiptId and filePath are required" },
        { status: 400 }
      );
    }

    const { data: receipt, error: receiptError } = await supabase
      .from("receipts")
      .select("id, file_path")
      .eq("id", receiptId)
      .eq("user_id", userData.user.id)
      .single();

    if (receiptError || !receipt || receipt.file_path !== filePath) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    const limited = await enforceApiRateLimit(supabase, "ocr");
    if (limited) return limited;
    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage.from("receipts").createSignedUrl(filePath, 180);

    if (signedUrlError || !signedUrlData) {
      throw new Error(signedUrlError?.message ?? "Could not sign file URL");
    }
    const { data: image, error: downloadError } = await supabase.storage.from('receipts').download(filePath);
    if (downloadError || !image) throw new Error('เปิดภาพใบเสร็จไม่ได้ กรุณาลองใหม่');
    const ocrResult = await analyzeReceiptImage(image, signedUrlData.signedUrl);

    const { data: updated, error: updateError } = await supabase
      .from("receipts")
      .update({
        ocr_text: ['[AI อ่านภาพ · ต้องตรวจสอบก่อนบันทึก]', ...ocrResult.warnings, ocrResult.rawText].join('\n'),
        parsed_amount: ocrResult.parsedAmount,
        parsed_merchant: ocrResult.parsedMerchant,
        parsed_date: ocrResult.parsedDate,
        status: "processed",
      })
      .eq("id", receiptId)
      .eq("user_id", userData.user.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ receipt: updated, warnings: ocrResult.warnings, currency: ocrResult.currency, provider: ocrResult.provider, model: ocrResult.model });
  } catch (err) {
    if (receiptId) {
      await supabase
        .from("receipts")
        .update({ status: "failed" })
        .eq("id", receiptId)
        .eq("user_id", userData.user.id);
    }

    return apiError(err);
  }
}
