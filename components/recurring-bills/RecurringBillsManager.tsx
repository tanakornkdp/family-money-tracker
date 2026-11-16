"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Category, CreditCard, Household, PaymentMethod, TransactionType } from "@/types";
import {
  getRecurringBills,
  addRecurringBill,
  updateRecurringBill,
  deleteRecurringBill,
  calculateMonthlySubscriptionCommitment,
  getMonthlyCommitmentAmount,
  getUpcomingOccurrences,
  RecurringBill,
  type RecurringItemKind,
  type SubscriptionReviewStatus,
} from "@/services/recurringBills";
import { createTransaction } from "@/services/transactions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Calendar, Trash2, Plus, Sparkles, CheckCircle2, ChevronDown, Pencil } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { toDateInputValue } from "@/lib/utils/dateHelpers";
import RecurringCategoryEditor from "./RecurringCategoryEditor";

interface RecurringBillsManagerProps {
  userId: string;
  initialCategories: Category[];
  initialCreditCards: CreditCard[];
  initialHouseholds: Household[];
  currency: string;
  locale: "en" | "th";
}

export default function RecurringBillsManager({
  userId,
  initialCategories,
  initialCreditCards,
  initialHouseholds,
  currency,
  locale,
}: RecurringBillsManagerProps) {
  const router = useRouter();
  const supabase = createClient();

  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState(initialCategories);
  const [categoryEditor, setCategoryEditor] = useState<"add" | Category | null>(null);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(toDateInputValue());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [cardId, setCardId] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string>("");
  const [itemKind, setItemKind] = useState<RecurringItemKind>("bill");
  const [recordDates, setRecordDates] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try { setBills(await getRecurringBills(supabase, userId, { includeShared: true })); }
      catch (err) { setError((err as Error).message); }
    };
    load();
  }, [userId, supabase]);

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const updated = await updateRecurringBill(supabase, userId, id, { is_active: !currentStatus });
      setBills((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "th" ? "คุณแน่ใจหรือไม่ที่จะลบรายการประจำนี้?" : "Are you sure you want to delete this recurring bill?")) return;
    try {
      await deleteRecurringBill(supabase, userId, id);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) return setError(locale === "th" ? "กรุณากรอกชื่อรายการ" : "Please enter the name");
    if (!amount || Number(amount) <= 0) return setError(locale === "th" ? "กรุณากรอกจำนวนเงินให้ถูกต้อง" : "Please enter a valid amount");
    if (!category) return setError(locale === "th" ? "กรุณาเลือกหมวดหมู่" : "Please select a category");

    try {
      const newBill = await addRecurringBill(supabase, userId, {
        name: name.trim(),
        amount: Number(amount),
        type,
        category,
        frequency,
        start_date: startDate,
        payment_method: paymentMethod,
        card_id: paymentMethod !== "cash" && cardId ? cardId : null,
        household_id: householdId ? householdId : null,
        is_active: true,
        item_kind: itemKind,
        review_status: "active",
      });

      setBills((prev) => [...prev, newBill]);
      setShowAddForm(false);
      
      // Reset form
      setName("");
      setAmount("");
      setCategory("");
      setCardId("");
      setHouseholdId("");
      setItemKind("bill");
      
      setSuccessMsg(locale === "th" ? "เพิ่มรายการประจำสำเร็จแล้ว!" : "Successfully added recurring bill!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleReviewStatus = async (id: string, review_status: SubscriptionReviewStatus) => {
    try {
      const updated = await updateRecurringBill(supabase, userId, id, { review_status });
      setBills((previous) => previous.map((bill) => bill.id === id ? updated : bill));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const getCurrentOccurrenceDate = (bill: RecurringBill) => {
    const today = toDateInputValue();
    const [year, month] = today.split("-").map(Number);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    const end = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`;
    const dates = getUpcomingOccurrences([bill], start, end, bill.household_id).map((item) => item.date);
    const currentCycle = dates.filter((date) => date <= today).at(-1) ?? dates[0];
    if (currentCycle) return currentCycle;
    const nextYearEnd = `${year + 1}-12-31`;
    return getUpcomingOccurrences([bill], today, nextYearEnd, bill.household_id)[0]?.date ?? today;
  };

  const handlePostTransaction = async (bill: RecurringBill, occurrenceDate: string) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const today = toDateInputValue();
      await createTransaction(supabase, userId, {
        title: bill.name,
        amount: bill.amount,
        type: bill.type,
        category: bill.category,
        date: today,
        payment_method: bill.payment_method,
        card_id: bill.card_id,
        household_id: bill.household_id,
        recurring_bill_id: bill.id,
        recurring_occurrence_date: occurrenceDate,
      });

      setSuccessMsg(
        locale === "th" 
          ? `บันทึกรายการ "${bill.name}" ลงในประวัติจริงเรียบร้อยแล้ว!` 
          : `Recorded "${bill.name}" into your real transaction history!`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (categoryName: string) => {
    const cat = categories.find((c) => c.name === categoryName);
    return cat?.icon ?? "💰";
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl text-sm text-red-600 dark:text-red-400">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-xl text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
          {locale === "th" ? "รายการที่บันทึกไว้" : "Saved Recurring Items"}
        </h2>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5">
          {showAddForm ? (
            locale === "th" ? "ยกเลิก" : "Cancel"
          ) : (
            <>
              <Plus className="w-4 h-4" />
              {locale === "th" ? "เพิ่มรายการประจำ" : "Add Recurring Item"}
            </>
          )}
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border border-slate-200 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{locale === "th" ? "ค่าสมาชิกรายเดือนโดยประมาณ" : "Estimated monthly subscriptions"}</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{formatCurrency(calculateMonthlySubscriptionCommitment(bills), currency)}</p>
        </div>
        <p className="max-w-md text-xs text-slate-500 dark:text-slate-400">{locale === "th" ? "คำนวณจากรายการที่เปิดใช้งานและยังใช้อยู่: รายสัปดาห์ × 52 ÷ 12, รายปี ÷ 12" : "Active subscriptions only: weekly × 52 ÷ 12, yearly ÷ 12."}</p>
      </Card>

      {showAddForm && (
        <Card className="border border-indigo-100 dark:border-indigo-900/60 shadow-lg shadow-indigo-100/10">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {locale === "th" ? "สร้างรายการใหม่" : "Create New Recurring Item"}
            </h3>

            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{locale === "th" ? "ประเภทที่บันทึก" : "Item type"}</legend>
              <div className="flex gap-2">
                {(["bill", "subscription"] as const).map((kind) => <button key={kind} type="button" aria-pressed={itemKind === kind} onClick={() => setItemKind(kind)} className={`rounded-lg border px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${itemKind === kind ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300" : "border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-200"}`}>{kind === "bill" ? (locale === "th" ? "บิลประจำ" : "Bill") : (locale === "th" ? "ค่าสมาชิก" : "Subscription")}</button>)}
              </div>
            </fieldset>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label={locale === "th" ? "ชื่อรายการ (เช่น Netflix, ค่าอินเทอร์เน็ต)" : "Item Name"}
                placeholder={locale === "th" ? "กรอกชื่อรายการ..." : "e.g., Netflix subscription..."}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <Input
                label={locale === "th" ? "จำนวนเงิน" : "Amount"}
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "ประเภทรายการ" : "Type"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      type === "expense"
                        ? "bg-red-500/10 border-red-500 text-red-600"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {locale === "th" ? "รายจ่าย" : "Expense"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${
                      type === "income"
                        ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                        : "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    {locale === "th" ? "รายรับ" : "Income"}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="recurring-category" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "หมวดหมู่" : "Category"}
                </label>
                <div className="relative" onKeyDown={event => {
                  if (event.key !== "Escape" || !categoryOpen) return;
                  setCategoryOpen(false);
                  event.currentTarget.querySelector("button")?.focus();
                }}>
                  <button id="recurring-category" type="button" aria-expanded={categoryOpen} aria-controls="recurring-category-options" onClick={() => { setCategoryOpen(!categoryOpen); setCategoryEditor(null); }}
                    className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-slate-300 px-3 text-left text-sm dark:border-slate-700 dark:bg-slate-800">
                    <span className="truncate">{category ? getCategoryIcon(category) + " " + category : (locale === "th" ? "เลือกหมวดหมู่" : "Select category")}</span>
                    <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
                  </button>
                  <div id="recurring-category-options" hidden={!categoryOpen}
                    className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
                    <ul className="max-h-52 overflow-y-auto overscroll-contain">
                      {categories.filter(item => item.type === type || item.type === "both").map(item => <li key={item.id} className="flex items-center gap-1">
                        <button type="button" aria-pressed={category === item.name} onClick={() => { setCategory(item.name); setCategoryOpen(false); }}
                          className="min-h-11 min-w-0 flex-1 break-words px-3 text-left text-sm hover:bg-slate-100 aria-pressed:font-semibold dark:hover:bg-slate-700">{item.icon} {item.name}</button>
                        {item.user_id === userId && <button type="button" aria-label={(locale === "th" ? "แก้ไขหมวดหมู่ " : "Edit category ") + item.name}
                          onClick={() => { setCategoryOpen(false); setCategoryEditor(item); }}
                          className="grid size-11 shrink-0 place-items-center text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"><Pencil size={15} aria-hidden="true" /></button>}
                      </li>)}
                    </ul>
                    <button type="button" onClick={() => { setCategoryOpen(false); setCategoryEditor("add"); }}
                      className="flex min-h-11 w-full items-center gap-2 border-t border-slate-200 px-3 text-left text-sm font-semibold text-emerald-700 dark:border-slate-700 dark:text-emerald-300">
                      <Plus size={16} aria-hidden="true" />{locale === "th" ? "เพิ่มหมวดหมู่ใหม่" : "Add category"}
                    </button>
                  </div>
                </div>
                {categoryEditor && <RecurringCategoryEditor
                  key={categoryEditor === "add" ? "add" : categoryEditor.id}
                  userId={userId} locale={locale} type={type} categories={categories}
                  original={categoryEditor === "add" ? undefined : categoryEditor}
                  onClose={() => setCategoryEditor(null)}
                  onSaved={updated => {
                    setCategories(current => [...current.filter(item => item.id !== updated.id), updated].sort((a, b) => a.name.localeCompare(b.name)));
                    if (categoryEditor !== "add") {
                      setBills(current => current.map(bill => bill.user_id === userId && bill.category === categoryEditor.name ? { ...bill, category: updated.name } : bill));
                    }
                    setCategory(updated.name);
                    setCategoryEditor(null);
                    router.refresh();
                  }}
                />}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "ความถี่" : "Frequency"}
                </label>
                <select
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as "weekly" | "monthly" | "yearly")}
                >
                  <option value="weekly">{locale === "th" ? "รายสัปดาห์" : "Weekly"}</option>
                  <option value="monthly">{locale === "th" ? "รายเดือน" : "Monthly"}</option>
                  <option value="yearly">{locale === "th" ? "รายปี" : "Yearly"}</option>
                </select>
              </div>

              <Input
                label={locale === "th" ? "วันที่เริ่มเก็บเงิน" : "Start Date"}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "ช่องทางการชำระเงิน" : "Payment Method"}
                </label>
                <select
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                >
                  <option value="cash">{locale === "th" ? "เงินสด" : "Cash"}</option>
                  <option value="credit_card">{locale === "th" ? "บัตรเครดิต" : "Credit Card"}</option>
                  <option value="debit_card">{locale === "th" ? "บัตรเดบิต / วอลเล็ต" : "Debit Card"}</option>
                </select>
              </div>

              {paymentMethod !== "cash" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {locale === "th" ? "ผูกกับบัตร" : "Link to Card"}
                  </label>
                  <select
                    className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    value={cardId}
                    onChange={(e) => setCardId(e.target.value)}
                  >
                    <option value="">-- {locale === "th" ? "ไม่ผูกบัตร" : "No Card linked"} --</option>
                    {initialCreditCards
                      .filter((c) => {
                        const targetType = paymentMethod === "credit_card" ? "credit" : "debit";
                        return c.card_type === targetType;
                      })
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "สำหรับกลุ่มครอบครัว" : "For Household"}
                </label>
                <select
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={householdId}
                  onChange={(e) => setHouseholdId(e.target.value)}
                >
                  <option value="">-- {locale === "th" ? "บัญชีส่วนตัว" : "Personal Account"} --</option>
                  {initialHouseholds.map((h) => (
                    <option key={h.id} value={h.id}>
                      🏠 {h.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setShowAddForm(false)}>
                {locale === "th" ? "ยกเลิก" : "Cancel"}
              </Button>
              <Button type="submit">
                {locale === "th" ? "บันทึกข้อมูล" : "Create Item"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {bills.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {locale === "th" ? "ยังไม่มีรายการชำระประจำ" : "No recurring bills found."}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bills.map((bill) => (
            <Card
              key={bill.id}
              className={`relative overflow-hidden border transition-all hover:shadow-md ${
                bill.is_active
                  ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  : "border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 opacity-70"
              }`}
            >
              {/* Card Accent Top Line */}
              <div
                className={`absolute top-0 left-0 w-full h-1.5 ${
                  bill.type === "expense" ? "bg-red-500" : "bg-emerald-500"
                }`}
              />

              <div className="flex items-start justify-between mt-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shadow-sm">
                    {getCategoryIcon(bill.category)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">
                      {bill.name}
                    </h3>
                    {bill.household_id && (
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {initialHouseholds.find((household) => household.id === bill.household_id)?.name
                          ?? (locale === "th" ? "บิลกลุ่ม" : "Household bill")}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 font-medium">
                      {bill.category} · {bill.frequency === "weekly" ? (locale === "th" ? "รายสัปดาห์" : "Weekly") : bill.frequency === "monthly" ? (locale === "th" ? "รายเดือน" : "Monthly") : (locale === "th" ? "รายปี" : "Yearly")}
                    </p>
                    {bill.item_kind === "subscription" && <p className="mt-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">{locale === "th" ? "ค่าสมาชิก" : "Subscription"} · {formatCurrency(getMonthlyCommitmentAmount(bill), currency)}{locale === "th" ? "/เดือน โดยประมาณ" : "/mo est."}</p>}
                  </div>
                </div>

                {bill.user_id === userId && <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleToggleActive(bill.id, bill.is_active)}
                    title={bill.is_active ? "Deactivate" : "Activate"}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      bill.is_active
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {bill.is_active ? (locale === "th" ? "เปิดใช้งาน" : "Active") : (locale === "th" ? "ปิด" : "Disabled")}
                  </button>
                  <button
                    onClick={() => handleDelete(bill.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>}
              </div>

              {bill.item_kind === "subscription" && <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/60">
                <span className="text-xs text-slate-500">{locale === "th" ? "สถานะการใช้งาน" : "Usage status"}</span>
                <select disabled={bill.user_id !== userId} aria-label={locale === "th" ? `สถานะ ${bill.name}` : `${bill.name} usage status`} value={bill.review_status} onChange={(event) => void handleReviewStatus(bill.id, event.target.value as SubscriptionReviewStatus)} className="max-w-[58%] rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  <option value="active">{locale === "th" ? "ใช้อยู่" : "Using"}</option><option value="review">{locale === "th" ? "ทบทวนการใช้งาน" : "Review"}</option><option value="not_using">{locale === "th" ? "ไม่ได้ใช้" : "Not using"}</option>
                </select>
              </div>}

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-baseline justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase">
                    {locale === "th" ? "จำนวนเงินต่อรอบ" : "Per Cycle"}
                  </p>
                  <p
                    className={`text-lg font-black ${
                      bill.type === "expense"
                        ? "text-red-600 dark:text-red-400"
                        : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {bill.type === "expense" ? "-" : "+"}
                    {formatCurrency(bill.amount, currency)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 font-mono uppercase">
                    {locale === "th" ? "เริ่มวันที่" : "Starts"}
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {bill.start_date}
                  </p>
                </div>
              </div>

              {bill.is_active && bill.user_id === userId && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex flex-wrap items-center justify-end gap-2">
                  <label className="text-xs text-slate-500" htmlFor={`occurrence-${bill.id}`}>{locale === "th" ? "รอบวันที่" : "Occurrence"}</label>
                  <input id={`occurrence-${bill.id}`} type="date" value={recordDates[bill.id] ?? getCurrentOccurrenceDate(bill)} onChange={(event) => setRecordDates((previous) => ({ ...previous, [bill.id]: event.target.value }))} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
                  <button
                    onClick={() => handlePostTransaction(bill, recordDates[bill.id] ?? getCurrentOccurrenceDate(bill))}
                    disabled={loading}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-bold flex items-center gap-1.5 p-2 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/20 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/30 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                    {locale === "th" ? "บันทึกธุรกรรมรอบนี้" : "Record current cycle"}
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
