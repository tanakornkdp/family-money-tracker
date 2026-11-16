import type { OcrResult } from './processReceipt';

export interface ReceiptVisionResult extends OcrResult {
  warnings: string[];
  currency: string | null;
}

export function validateReceiptVision(value: unknown, independentText?: string): ReceiptVisionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('รูปแบบผลอ่านใบเสร็จไม่ถูกต้อง กรุณาลองใหม่');
  const data = value as Record<string, unknown>;
  const warnings: string[] = [];
  const text = (v: unknown, max: number) => typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;
  const money = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1e9 && Math.abs(v * 100 - Math.round(v * 100)) < .001 ? v : null;
  const uncertain = Array.isArray(data.uncertainFields) ? data.uncertainFields : [];
  let parsedAmount = money(data.total);
  const parsedMerchant = uncertain.includes('merchant') ? null : text(data.merchant, 200);
  let parsedDate = typeof data.date === 'string' ? data.date : null;
  if (!parsedDate || !/^\d{4}-\d{2}-\d{2}$/.test(parsedDate) || !Number.isFinite(Date.parse(parsedDate)) || new Date(parsedDate).toISOString().slice(0, 10) !== parsedDate) parsedDate = null;
  const currency = typeof data.currency === 'string' && /^[A-Za-z]{3}$/.test(data.currency) ? data.currency.toUpperCase() : null;
  if (currency !== 'THB') {
    warnings.push('กรุณาตรวจสกุลเงินและแปลงยอดก่อนบันทึก ระบบยังไม่ใส่ยอดให้อัตโนมัติ');
    parsedAmount = null;
  }
  if (uncertain.includes('total')) parsedAmount = null;
  if (uncertain.includes('date')) parsedDate = null;
  const parts = [data.subtotal, data.discount, data.tax, data.serviceCharge].map(money);
  if (data.itemsComplete === true && Array.isArray(data.items) && data.items.length > 0 && parts[0] !== null) {
    const amounts = data.items.map((item: unknown) => item && typeof item === 'object' ? money((item as Record<string, unknown>).lineTotal) : null);
    if (amounts.some(amount => amount === null) || Math.abs(amounts.reduce<number>((sum, amount) => sum + Math.round((amount ?? 0) * 100), 0) - Math.round(parts[0] * 100)) > 1) {
      warnings.push('ยอดรายการสินค้าไม่ตรงยอดรวมก่อนภาษี กรุณาตรวจทุกรายการกับภาพ');
      parsedAmount = null;
    }
  } else {
    warnings.push('ยังตรวจยอดรวมรายการสินค้าไม่ได้ กรุณาตรวจรายการกับภาพ');
  }
  if (data.totalsComplete === true && parts.every((p) => p !== null) && parsedAmount !== null) {
    const [subtotal, discount, tax, service] = parts as number[];
    if (Math.abs(Math.round((subtotal - discount + tax + service) * 100) - Math.round(parsedAmount * 100)) > 1) {
      warnings.push('ยอดก่อนภาษี − ส่วนลด + ภาษี + ค่าบริการ ไม่ตรงยอดสุทธิ กรุณาตรวจภาพ');
      parsedAmount = null;
    }
  } else {
    warnings.push('ข้อมูลไม่ครบสำหรับตรวจสมการยอดสุทธิ กรุณาเทียบยอดกับภาพ');
  }
  // Compare only explicitly labelled final totals, never cash tendered or subtotal.
  const totals = independentText?.split(/\r?\n/).flatMap((line) => {
    if (!/^\s*(?:grand\s+total|net\s+total|total|amount\s+due|ยอดสุทธิ|ยอดรวม(?:ทั้งสิ้น)?|รวมทั้งสิ้น)\s*[:：]?\s*(?:฿|THB)?\s*\d/i.test(line)) return [];
    const match = line.match(/(\d[\d,]*\.\d{2})\s*(?:บาท|THB)?\s*$/i);
    return match ? [Number(match[1].replace(/,/g, ''))] : [];
  }) ?? [];
  if (parsedAmount !== null && totals.some((total) => Math.abs(total - parsedAmount!) > .01)) {
    warnings.push('AI และ OCR อ่านยอดสุทธิไม่ตรงกัน กรุณากรอกยอดจากภาพ');
    parsedAmount = null;
  }
  if (!totals.length) warnings.push('ยังเทียบยอดสุทธิกับ OCR ไม่ได้ กรุณาตรวจยอดกับภาพ');
  if (!parsedMerchant) warnings.push('อ่านชื่อร้านไม่ชัด กรุณากรอกเอง');
  if (!parsedDate) warnings.push('อ่านวันที่ไม่ชัด กรุณาตรวจวันที่ก่อนบันทึก');
  if (parsedAmount === null) warnings.push('ต้องตรวจและกรอกยอดเงินก่อนสร้างรายการ');
  return { rawText: text(data.rawText, 30000) ?? '', parsedAmount, parsedMerchant, parsedDate, currency, warnings };
}
