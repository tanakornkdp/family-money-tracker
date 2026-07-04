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
  RecurringBill,
} from "@/services/recurringBills";
import { createTransaction } from "@/services/transactions";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Calendar, Trash2, Plus, Sparkles, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";

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
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("credit_card");
  const [cardId, setCardId] = useState<string>("");
  const [householdId, setHouseholdId] = useState<string>("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setBills(getRecurringBills());
    };
    load();
  }, []);

  const handleToggleActive = (id: string, currentStatus: boolean) => {
    try {
      const updated = updateRecurringBill(id, { is_active: !currentStatus });
      setBills((prev) => prev.map((b) => (b.id === id ? updated : b)));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm(locale === "th" ? "คุณแน่ใจหรือไม่ที่จะลบรายการประจำนี้?" : "Are you sure you want to delete this recurring bill?")) return;
    try {
      deleteRecurringBill(id);
      setBills((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) return setError(locale === "th" ? "กรุณากรอกชื่อรายการ" : "Please enter the name");
    if (!amount || Number(amount) <= 0) return setError(locale === "th" ? "กรุณากรอกจำนวนเงินให้ถูกต้อง" : "Please enter a valid amount");
    if (!category) return setError(locale === "th" ? "กรุณาเลือกหมวดหมู่" : "Please select a category");

    try {
      const newBill = addRecurringBill({
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
      });

      setBills((prev) => [...prev, newBill]);
      setShowAddForm(false);
      
      // Reset form
      setName("");
      setAmount("");
      setCategory("");
      setCardId("");
      setHouseholdId("");
      
      setSuccessMsg(locale === "th" ? "เพิ่มรายการประจำสำเร็จแล้ว!" : "Successfully added recurring bill!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handlePostTransaction = async (bill: RecurringBill) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const today = new Date().toISOString().split("T")[0];
      await createTransaction(supabase, userId, {
        title: bill.name,
        amount: bill.amount,
        type: bill.type,
        category: bill.category,
        date: today,
        payment_method: bill.payment_method,
        card_id: bill.card_id,
        household_id: bill.household_id,
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
    const cat = initialCategories.find((c) => c.name === categoryName);
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

      {showAddForm && (
        <Card className="border border-indigo-100 dark:border-indigo-900/60 shadow-lg shadow-indigo-100/10">
          <form onSubmit={handleCreate} className="space-y-4">
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
              {locale === "th" ? "สร้างรายการใหม่" : "Create New Recurring Item"}
            </h3>

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
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {locale === "th" ? "หมวดหมู่" : "Category"}
                </label>
                <select
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">-- {locale === "th" ? "เลือกหมวดหมู่" : "Select Category"} --</option>
                  {initialCategories
                    .filter((c) => c.type === "both" || c.type === type)
                    .map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                </select>
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
                    <p className="text-[11px] text-slate-400 font-medium">
                      {bill.category} · {bill.frequency === "weekly" ? (locale === "th" ? "รายสัปดาห์" : "Weekly") : bill.frequency === "monthly" ? (locale === "th" ? "รายเดือน" : "Monthly") : (locale === "th" ? "รายปี" : "Yearly")}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
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
                </div>
              </div>

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

              {bill.is_active && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex justify-end">
                  <button
                    onClick={() => handlePostTransaction(bill)}
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
