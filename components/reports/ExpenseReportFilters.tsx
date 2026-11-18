"use client";

import { useState } from "react";
import Accordion from "@/components/ui/Accordion";
import { usePathname, useRouter } from "next/navigation";
import FilterBar, { FilterDate, FilterSearch, FilterSelect, filterLabel } from "@/components/ui/FilterBar";
import type { ExpenseReportData } from "@/services/expenseReports";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ExpenseReportFilters({ data }: { data: ExpenseReportData }) {
  const { t, locale } = useLanguage();
  const th = locale === "th";
  const pathname = usePathname();
  const router = useRouter();
  const [group, setGroup] = useState(data.householdId);
  const [member, setMember] = useState(data.memberId);
  const [categories, setCategories] = useState(data.selectedCategories);
  const methods: Record<string, string> = {
    cash: th ? "เงินสด" : "Cash",
    bank_transfer: th ? "โอนเงิน" : "Bank transfer",
    debit_card: th ? "บัตรเดบิต" : "Debit card",
    credit_card: th ? "บัตรเครดิต" : "Credit card",
  };
  const active = data.filtersActive;

  return <FilterBar
    locale={locale}
    count={data.summary.count}
    total={data.filterTotal}
    onClear={active ? () => router.push(pathname) : undefined}
    search={<FilterSearch locale={locale} name="q" defaultValue={data.query} maxLength={120} />}
    fields={<>
      <FilterDate label={t.reports.dateFrom} locale={locale} name="from" required defaultValue={data.from} />
      <FilterDate label={t.reports.dateTo} locale={locale} name="to" required defaultValue={data.to} />
        <div className={filterLabel}>
          <span>{th ? "หมวดหมู่" : "Category"}</span>
          <Accordion className="relative" label={t.reports.categories} triggerClassName="field-control field-select" title={<>
              <span className="truncate">{categories.length === 0 ? t.reports.allCategories : categories.length === 1 ? categories[0] : t.reports.selectedCategories.replace("{count}", String(categories.length))}</span>
            </>}>
            <fieldset className="mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
              <legend className="sr-only">{t.reports.categories}</legend>
              <button type="button" className="min-h-9 w-full text-left" onClick={() => setCategories([])}>{t.reports.allCategories}</button>
              {data.categories.map(category => (
                <label key={category} className="flex min-h-9 items-center gap-2 break-all">
                  <input type="checkbox" name="category" value={category} checked={categories.includes(category)} onChange={event => setCategories(event.target.checked ? [...categories, category] : categories.filter(item => item !== category))} />
                  {category}
                </label>
              ))}
            </fieldset>
          </Accordion>
        </div>
      <FilterSelect label={th ? "บัญชี" : "Account"} name="account" defaultValue={data.account}>
        <option value="">{th ? "ทุกบัญชี" : "All accounts"}</option>
        {data.accounts.map(({ key, name }) => <option key={key} value={key}>{name || methods[key.slice(7)] || (th ? "บัตร" : "Card")}</option>)}
      </FilterSelect>
      {group && <FilterSelect label={t.reports.person} name="member" value={member} onChange={event => setMember(event.target.value)}>
        <option value="">{t.reports.allMembers}</option>
        {data.members.filter(item => item.householdId === group).map(item => <option key={item.userId} value={item.userId}>{item.name}</option>)}
      </FilterSelect>}
      <FilterSelect label={th ? "ประเภท" : "Type"} name="type" defaultValue={data.transactionType}>
        <option value="all">{th ? "รายรับและรายจ่าย" : "Income and expenses"}</option>
        <option value="income">{th ? "รายรับ" : "Income"}</option>
        <option value="expense">{th ? "รายจ่าย" : "Expenses"}</option>
      </FilterSelect>
    </>}
    advanced={<>
      <FilterSelect label={t.reports.view} name="scope" value={group ? "household:" + group : "personal"} onChange={event => {
        setGroup(event.target.value === "personal" ? "" : event.target.value.slice("household:".length));
        setMember("");
      }}>
        <option value="personal">{t.reports.personal}</option>
        {data.households.map(item => <option key={item.id} value={"household:" + item.id}>{item.name}</option>)}
      </FilterSelect>
      <FilterSelect label={t.reports.groupBy} name="groupBy" defaultValue={data.granularity}>
        <option value="day">{t.reports.daily}</option>
        <option value="month">{t.reports.monthly}</option>
      </FilterSelect>
    </>}
  />;
}




