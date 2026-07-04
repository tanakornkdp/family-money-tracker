import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processReceiptImage } from "@/ocr/processReceipt";

export async function POST(request: NextRequest) {
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

    if (!receiptId || !filePath) {
      return NextResponse.json(
        { error: "receiptId and filePath are required" },
        { status: 400 }
      );
    }

    const { data: signedUrlData, error: signedUrlError } =
      await supabase.storage.from("receipts").createSignedUrl(filePath, 3600);

    if (signedUrlError || !signedUrlData) {
      throw new Error(signedUrlError?.message ?? "Could not sign file URL");
    }
    const ocrResult = await processReceiptImage(signedUrlData.signedUrl);

    const { data: updated, error: updateError } = await supabase
      .from("receipts")
      .update({
        ocr_text: ocrResult.rawText,
        parsed_amount: ocrResult.parsedAmount,
        parsed_merchant: ocrResult.parsedMerchant,
        parsed_date: ocrResult.parsedDate,
        status: "processed",
      })
      .eq("id", receiptId)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    return NextResponse.json({ receipt: updated });
  } catch (err) {
    if (receiptId) {
      await supabase
        .from("receipts")
        .update({ status: "failed" })
        .eq("id", receiptId);
    }

    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}