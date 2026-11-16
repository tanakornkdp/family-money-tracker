"use client";

import { useMemo, useState, type ReactNode } from "react";
import FilterBar, { FilterDate, FilterSearch, FilterSelect } from "@/components/ui/FilterBar";
import type { Transaction } from "@/types";
import { filterTransactions } from "@/services/transactionFilters";

type FilteredContent = (transactions: Transaction[]) => ReactNode;

export default function TransactionFilterPanel({
  transactions,
  displayNames,
  cardNames,
  locale,
  footer,
  children,
}: {
  transactions: Transaction[];
  displayNames: Record<string, string>;
  cardNames: Record<string, string>;
  locale: "th" | "en";
  footer?: ReactNode;
  children: FilteredContent;
}) {
  const english = locale === "en";
  const [filters, setFilters] = useState({ query: "", from: "", to: "", category: "all", account: "all", member: "all", type: "all" });
  const [reset, setReset] = useState(0);
  const [dates, setDates] = useState({ from: "", to: "" });
  const active = Object.values(filters).some(value => value && value !== "all");
  const categories = useMemo(() => Array.from(new Set(transactions.map((tx) => tx.category))).sort(), [transactions]);
  const members = useMemo(() => Array.from(new Set(transactions.map((tx) => tx.user_id))), [transactions]);
  const accounts = useMemo(() => {
    const keys = new Set(transactions.map((tx) => tx.card_id ? `card:${tx.card_id}` : `method:${tx.payment_method ?? "cash"}`));
    return Array.from(keys);
  }, [transactions]);
  const filtered = useMemo(() => filterTransactions(
    transactions,
    filters,
    displayNames,
    cardNames,
  ), [transactions, filters, displayNames, cardNames]);
  return (
    <div className="space-y-4">
      <FilterBar
        key={reset}
        locale={locale}
        footer={footer}
        search={<FilterSearch locale={locale} name="query" defaultValue={filters.query} />}
        fields={<>
          <FilterDate locale={locale} label={english ? "From" : "ตั้งแต่"} name="from" defaultValue={filters.from} max={dates.to || undefined} onChange={event => setDates(current => ({ ...current, from: event.target.value }))} />
          <FilterDate locale={locale} label={english ? "To" : "ถึงวันที่"} name="to" defaultValue={filters.to} min={dates.from || undefined} onChange={event => setDates(current => ({ ...current, to: event.target.value }))} />
          <FilterSelect label={english ? "Category" : "หมวดหมู่"} name="category" defaultValue={filters.category}><option value="all">{english ? "All categories" : "ทุกหมวดหมู่"}</option>{categories.map((item) => <option key={item}>{item}</option>)}</FilterSelect>
          <FilterSelect label={english ? "Account" : "บัญชี"} name="account" defaultValue={filters.account}><option value="all">{english ? "All accounts" : "ทุกบัญชี"}</option>{accounts.map((key) => <option key={key} value={key}>{key.startsWith("card:") ? cardNames[key.slice(5)] ?? (english ? "Card" : "บัตร") : key.slice(7).replace("bank_transfer", english ? "Bank transfer" : "โอนเงิน").replace("cash", english ? "Cash" : "เงินสด").replace("debit_card", english ? "Debit card" : "บัตรเดบิต").replace("credit_card", english ? "Credit card" : "บัตรเครดิต")}</option>)}</FilterSelect>
          {members.length > 1 && <FilterSelect label={english ? "Member" : "สมาชิก"} name="member" defaultValue={filters.member}><option value="all">{english ? "All members" : "ทุกคน"}</option>{members.map((id) => <option key={id} value={id}>{displayNames[id] || (english ? "Unnamed member" : "สมาชิกไม่ระบุชื่อ")}</option>)}</FilterSelect>}
          <FilterSelect label={english ? "Type" : "ประเภท"} name="type" defaultValue={filters.type}><option value="all">{english ? "Income and expense" : "รายรับและรายจ่าย"}</option><option value="income">{english ? "Income" : "รายรับ"}</option><option value="expense">{english ? "Expense" : "รายจ่าย"}</option></FilterSelect>
        </>}
        count={filtered.length}
        total={transactions.length}
        onSubmit={event => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          const read = (name: string, fallback = "") => String(form.get(name) ?? fallback);
          setFilters({ query: read("query"), from: read("from"), to: read("to"), category: read("category", "all"), account: read("account", "all"), member: read("member", "all"), type: read("type", "all") });
        }}
        onClear={active ? () => {
          setFilters({ query: "", from: "", to: "", category: "all", account: "all", member: "all", type: "all" });
          setDates({ from: "", to: "" });
          setReset(value => value + 1);
        } : undefined}
      />
      {children(filtered)}
    </div>
  );
}
