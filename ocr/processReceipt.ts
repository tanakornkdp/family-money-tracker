/**
 * OCR processing module using OCR.space API.
 * Free tier: 25,000 requests/month, no credit card required.
 * Sign up: https://ocr.space/ocrapi
 */

export interface OcrResult {
  rawText: string;
  parsedAmount: number | null;
  parsedMerchant: string | null;
  parsedDate: string | null;
}

export async function extractTextFromImage(imageUrl: string): Promise<string> {
  const apiKey = process.env.OCR_API_KEY;

  if (!apiKey) {
    throw new Error("OCR_API_KEY is not configured. Add it to your environment variables.");
  }

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      apikey: apiKey,
      url: imageUrl,
      OCREngine: "2",
      scale: "true",
      language: "tha",
    }),
  });

if (!response.ok) {
    throw new Error(`OCR API request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.IsErroredOnProcessing) {
    throw new Error(data.ErrorMessage?.[0] ?? "OCR processing failed");
  }

  const parsedText = data.ParsedResults?.[0]?.ParsedText ?? "";

  if (!parsedText.trim()) {
    throw new Error("No text could be extracted from the image");
  }

  return parsedText;
}

export function parseReceiptText(rawText: string): OcrResult {
  // หาตัวเลขที่มีจุดทศนิยม 2 ตำแหน่ง (รูปแบบเงิน) แล้วเลือกตัวที่มากที่สุด
  // (ใบเสร็จมักมี subtotal, vat, total หลายตัว — total มักเป็นตัวที่มากที่สุดหรืออยู่ใกล้คำว่า total/รวม)
  const amountMatches = rawText.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/g);
  let parsedAmount: number | null = null;

  if (amountMatches && amountMatches.length > 0) {
    const amounts = amountMatches.map((m) => parseFloat(m.replace(/,/g, "")));
    parsedAmount = Math.max(...amounts);
  }

  // หาวันที่ในหลายรูปแบบที่พบบ่อยในใบเสร็จไทย/อังกฤษ
  const dateMatch =
    rawText.match(/(\d{4}-\d{2}-\d{2})/) ||
    rawText.match(/(\d{1,2}\/\d{1,2}\/\d{2,4})/) ||
    rawText.match(/(\d{1,2}-\d{1,2}-\d{2,4})/);

  let parsedDate: string | null = null;
  if (dateMatch) {
    parsedDate = normalizeDate(dateMatch[1]);
  }

  // merchant name: มักเป็นบรรทัดแรกที่ไม่ใช่ตัวเลข/สัญลักษณ์ล้วน
  const lines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[\d\s.,/:-]+$/.test(l));

  const parsedMerchant = lines.length > 0 ? lines[0] : null;

  return {
    rawText,
    parsedAmount,
    parsedMerchant,
    parsedDate,
  };
}

function normalizeDate(raw: string): string {
  // แปลงรูปแบบ DD/MM/YYYY หรือ DD-MM-YYYY เป็น YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  const parts = raw.split(/[/-]/);
  if (parts.length === 3) {
    const [day, month] = parts;
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return raw;
}

export async function processReceiptImage(imageUrl: string): Promise<OcrResult> {
  const rawText = await extractTextFromImage(imageUrl);
  return parseReceiptText(rawText);
}