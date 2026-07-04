import { translations } from "@/lib/i18n/translations";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  ReceiptText,
  Banknote,
} from "lucide-react";

type AccentKey = "green" | "red" | "blue" | "slate";
type TitleKey = "totalIncome" | "totalExpense" | "netBalance" | "transactions" | "cashBalance";

const ACCENT_CONFIG: Record<AccentKey, {
  iconBg: string;
  iconColor: string;
  badge: string;
  badgeBg: string;
  valueColor: string;
}> = {
  green: {
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-500",
    badge: "",
    badgeBg: "bg-emerald-500/10 text-emerald-500",
    valueColor: "text-emerald-500",
  },
  red: {
    iconBg: "bg-rose-500/10",
    iconColor: "text-rose-500",
    badge: "",
    badgeBg: "bg-rose-500/10 text-rose-500",
    valueColor: "text-rose-500",
  },
  blue: {
    iconBg: "bg-indigo-500/10",
    iconColor: "text-indigo-500",
    badge: "",
    badgeBg: "bg-indigo-500/10 text-indigo-500",
    valueColor: "text-slate-900 dark:text-slate-100",
  },
  slate: {
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-500",
    badge: "",
    badgeBg: "bg-amber-500/10 text-amber-500",
    valueColor: "text-slate-900 dark:text-slate-100",
  },
};

const ICONS: Record<TitleKey, React.ElementType> = {
  totalIncome: TrendingUp,
  totalExpense: TrendingDown,
  netBalance: Wallet,
  transactions: ReceiptText,
  cashBalance: Banknote,
};

const BADGE_LABELS: Record<string, Record<TitleKey, string>> = {
  en: {
    totalIncome: "Income",
    totalExpense: "Expense",
    netBalance: "Balance",
    transactions: "Count",
    cashBalance: "Cash",
  },
  th: {
    totalIncome: "รายรับสะสม",
    totalExpense: "รายจ่ายสะสม",
    netBalance: "ยอดสุทธิ",
    transactions: "จำนวน",
    cashBalance: "เงินสด",
  },
};

export default function KpiCard({
  titleKey,
  value,
  accent,
  locale = "th",
}: {
  titleKey: TitleKey;
  value: string;
  accent: AccentKey;
  locale?: "en" | "th";
}) {
  const t = translations[locale];
  const config = ACCENT_CONFIG[accent];
  const Icon = ICONS[titleKey];
  const badgeLabel = BADGE_LABELS[locale][titleKey];

  const titles: Record<TitleKey, string> = {
    totalIncome: t.dashboard.totalIncome,
    totalExpense: t.dashboard.totalExpense,
    netBalance: t.dashboard.netBalance,
    transactions: t.dashboard.transactions,
    cashBalance: t.dashboard.cashBalance,
  };

  return (
    <div className="p-6 rounded-2xl shadow-sm border bg-white dark:bg-slate-800/80 border-slate-100 dark:border-slate-700/50">
      <div className="flex justify-between items-start">
        <div className={`p-3 rounded-xl ${config.iconBg}`}>
          <Icon className={`w-6 h-6 ${config.iconColor}`} />
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${config.badgeBg}`}>
          {badgeLabel}
        </span>
      </div>
      <div className="mt-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">{titles[titleKey]}</p>
        <h3 className={`text-2xl font-bold mt-1 ${config.valueColor}`}>
          {value}
        </h3>
      </div>
    </div>
  );
}