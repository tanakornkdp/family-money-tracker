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

export async function extractTextFromImage(imageUrl: string, base64Image?: string): Promise<string> {
  const apiKey = process.env.OCR_API_KEY;

  if (!apiKey) {
    throw new Error("OCR_API_KEY is not configured. Add it to your environment variables.");
  }

  const response = await fetch("https://api.ocr.space/parse/image", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      apikey: apiKey,
      ...(base64Image ? { base64Image } : { url: imageUrl }),
      OCREngine: "2",
      scale: "true",
      language: "auto",
      detectOrientation: "true",
      isTable: "true",
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
  const normalizedText = normalizeThaiDigits(rawText);
  const lines = normalizedText.split(/\r?\n/).map((line) => line.trim());
  const totalLabel = /(?:ยอดสุทธิ|ยอดรวม(?:ทั้งสิ้น)?|รวมทั้งสิ้น|ต้องชำระ|จำนวนเงินสุทธิ|grand\s*total|net\s*total|amount\s*due|total)/i;
  const moneyPattern = /(?:฿|THB)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\s*(?:บาท|THB)?/gi;
  const extractAmounts = (line: string) => Array.from(line.matchAll(moneyPattern), (match) => ({
    value: Number(`${match[1].replace(/,/g, "")}.${(match[2] ?? "0").padEnd(2, "0")}`),
    hasDecimals: Boolean(match[2]),
  })).filter(({ value }) => Number.isFinite(value));
  const totalLine = [...lines].reverse().find((line) => totalLabel.test(line));
  const labeledAmounts = totalLine ? extractAmounts(totalLine) : [];
  const decimalAmounts = lines.flatMap(extractAmounts).filter((amount) => amount.hasDecimals);
  let parsedAmount: number | null = null;

  if (labeledAmounts.length > 0) {
    parsedAmount = labeledAmounts[labeledAmounts.length - 1].value;
  } else if (decimalAmounts.length > 0) {
    parsedAmount = Math.max(...decimalAmounts.map(({ value }) => value));
  }

  // หาวันที่ในหลายรูปแบบที่พบบ่อยในใบเสร็จไทย/อังกฤษ
  const dateMatch =
    normalizedText.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})/) ||
    normalizedText.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);

  let parsedDate: string | null = null;
  if (dateMatch) {
    parsedDate = normalizeDate(dateMatch[1]) || null;
  }

  // merchant name: มักเป็นบรรทัดแรกที่ไม่ใช่ตัวเลข/สัญลักษณ์ล้วน
  const merchantLines = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && !/^[\d\s.,/:-]+$/.test(l));

  const parsedMerchant = merchantLines.length > 0 ? merchantLines[0] : null;

  return {
    rawText,
    parsedAmount,
    parsedMerchant,
    parsedDate,
  };
}

function normalizeDate(raw: string): string | null {
  const parts = raw.split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;

  let year: number;
  let month: number;
  let day: number;
  if (raw.split(/[/-]/)[0].length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
    if (year < 100) year += year < 80 ? 2000 : 1900;
  }
  if (year >= 2400) year -= 543;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeThaiDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (digit) => String("๐๑๒๓๔๕๖๗๘๙".indexOf(digit)));
}

export async function processReceiptImage(imageUrl: string): Promise<OcrResult> {
  const rawText = await extractTextFromImage(imageUrl);
  return parseReceiptText(rawText);
}
