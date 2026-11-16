import Link from 'next/link';
import type { Receipt } from '@/types';

export interface ReceiptScan {
  receipt: Pick<Receipt, 'parsed_merchant' | 'parsed_date' | 'parsed_amount'>;
  warnings: string[];
  currency: string | null;
  provider?: string;
}

export default function ReceiptScanResult({ scan, href }: { scan: ReceiptScan; href: string }) {
  return <section aria-label="ผลอ่านใบเสร็จ" className="space-y-3 rounded-2xl border border-mobile-border bg-mobile-surface p-4 text-mobile-ink">
    <h3 className="font-semibold">ตรวจข้อมูลจากใบเสร็จ</h3>
    {scan.provider && <p className="text-xs text-slate-500">AI: {scan.provider}</p>}
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
      <dt>ร้านค้า</dt><dd className="break-words">{scan.receipt.parsed_merchant ?? 'ต้องกรอกเอง'}</dd>
      <dt>วันที่</dt><dd>{scan.receipt.parsed_date ?? 'ต้องตรวจวันที่'}</dd>
      <dt>ยอดสุทธิ</dt><dd>{scan.receipt.parsed_amount === null ? 'ต้องตรวจและกรอกเอง' : `${scan.receipt.parsed_amount} ${scan.currency ?? ''}`}</dd>
    </dl>
    {scan.warnings.length > 0 && <ul className="list-disc space-y-1 pl-4 text-sm text-amber-800 dark:text-amber-300">{scan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
    <p className="text-xs text-slate-500">ยังไม่สร้างรายจ่าย เปิดรายการใบเสร็จเพื่อตรวจภาพและแก้ไขข้อมูลก่อนยืนยัน</p>
    <Link className="inline-flex min-h-11 items-center font-semibold text-primary-600 underline" href={href}>เปิดรายการใบเสร็จ</Link>
  </section>;
}
