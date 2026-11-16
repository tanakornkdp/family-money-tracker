import type { PaymentMethod, Transaction, TransactionType } from "@/types";

export type ImportedTransaction = { title: string; amount: number; type: TransactionType; category: string; date: string; payment_method: PaymentMethod; card_id?: string | null };
const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, "");
const aliases: Record<string, string[]> = {
  date: ["date", "transactiondate", "วันที่", "วัน"], title: ["title", "merchant", "description", "details", "payee", "ชื่อร้าน", "รายละเอียด", "รายการ"],
  amount: ["amount", "ยอดเงิน", "จำนวนเงิน", "จำนวน"], type: ["type", "transactiontype", "ประเภทรายการ", "ประเภท"], category: ["category", "หมวดหมู่"],
  debit: ["debit", "withdrawal", "expense", "รายจ่าย", "ถอน"], credit: ["credit", "deposit", "income", "รายรับ", "ฝาก"], method: ["paymentmethod", "account", "บัญชี", "ช่องทาง"], cardId: ["cardid", "รหัสบัตร"],
};

function parseDelimited(text: string): string[][] {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === '"' && quoted && source[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (char === delimiter && !quoted) { row.push(cell.trim()); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && source[i + 1] === "\n") i++;
      row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = "";
    } else cell += char;
  }
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseAmount(value: string): number {
  const cleaned = value.replace(/[฿$€£¥,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  return Number(cleaned);
}

export function parseTransactionCsv(text: string): ImportedTransaction[] {
  const rows = parseDelimited(text);
  if (rows.length < 2) throw new Error("ไฟล์ต้องมีแถวหัวตารางและรายการอย่างน้อย 1 แถว");
  const headers = rows[0].map(normalize);
  const index = (field: string) => headers.findIndex((header) => aliases[field].some((alias) => normalize(alias) === header));
  const dateIndex = index("date"), titleIndex = index("title"), amountIndex = index("amount"), typeIndex = index("type"), categoryIndex = index("category"), debitIndex = index("debit"), creditIndex = index("credit"), methodIndex = index("method"), cardIdIndex = index("cardId");
  if (dateIndex < 0 || titleIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) throw new Error("หา column วันที่ ชื่อรายการ หรือยอดเงินไม่เจอ โปรดตรวจแถวหัวตาราง");
  return rows.slice(1).slice(0, 2000).flatMap((cells) => {
    const dateValue = cells[dateIndex] ?? "";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateValue) ? dateValue : /^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(dateValue) ? (() => { const [a,b,c]=dateValue.split(/[/-]/).map(Number); const year=c>2400?c-543:c; return `${year}-${String(b).padStart(2,"0")}-${String(a).padStart(2,"0")}`; })() : "";
    let amount = amountIndex >= 0 ? parseAmount(cells[amountIndex] ?? "") : 0;
    let typeValue = typeIndex >= 0 ? normalize(cells[typeIndex] ?? "") : "";
    if (!amount && (debitIndex >= 0 || creditIndex >= 0)) {
      const debit = debitIndex >= 0 ? Math.abs(parseAmount(cells[debitIndex] ?? "") || 0) : 0;
      const credit = creditIndex >= 0 ? Math.abs(parseAmount(cells[creditIndex] ?? "") || 0) : 0;
      amount = credit > 0 ? credit : debit;
      typeValue = credit > 0 ? "income" : "expense";
    }
    const title = (cells[titleIndex] ?? "").trim();
    if (!title && !date && !amount) return [];
    if (!title || !date || !Number.isFinite(amount) || amount === 0) return [];
    const type: TransactionType = ["income", "รายรับ", "credit", "deposit"].includes(typeValue) ? "income" : "expense";
    const paymentText = normalize(methodIndex >= 0 ? cells[methodIndex] ?? "" : "");
    const payment_method: PaymentMethod = paymentText.includes("debitcard") || paymentText.includes("บัตรเดบิต")
      ? "debit_card"
      : paymentText.includes("creditcard") || paymentText.includes("บัตรเครดิต")
        ? "credit_card"
        : ["banktransfer", "โอน", "โอนเงิน"].some((word) => paymentText.includes(normalize(word))) ? "bank_transfer" : "cash";
    const card_id = cardIdIndex >= 0 ? cells[cardIdIndex]?.trim() || null : null;
    return [{ title, amount: Math.abs(amount), type, category: (categoryIndex >= 0 ? cells[categoryIndex] : "")?.trim() || "Other", date, payment_method, ...(card_id ? { card_id } : {}) }];
  });
}

export function transactionsToCsv(transactions: Transaction[]): string {
  const quote = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [["date", "description", "type", "category", "amount", "payment_method", "card_id"], ...transactions.map((tx) => [tx.date, tx.title, tx.type, tx.category, tx.amount, tx.payment_method ?? "cash", tx.card_id ?? ""])];
  return "\uFEFF" + lines.map((line) => line.map(quote).join(",")).join("\r\n");
}
