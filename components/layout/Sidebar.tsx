"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  Tag,
  ScanLine,
  Bot,
  Users,
  Target,
  CalendarDays,
  Settings,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import clsx from "clsx";
import { CreditCard } from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard },
    { href: "/transactions", label: t.nav.transactions, icon: Receipt },
    { href: "/categories", label: t.nav.categories, icon: Tag },
    { href: "/credit-cards", label: t.nav.creditCards, icon: CreditCard },
    { href: "/recurring-bills", label: t.nav.recurring, icon: RefreshCw },
    { href: "/receipts", label: t.nav.receipts, icon: ScanLine },
    { href: "/assistant", label: t.nav.assistant, icon: Bot, badge: "AI" },
    { href: "/household", label: t.nav.household, icon: Users },
    { href: "/goals", label: t.nav.goals, icon: Target },
    { href: "/budget", label: t.nav.budget, icon: CalendarDays },
    { href: "/settings", label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-65px)] border-r shrink-0 sticky top-[65px] p-4 gap-1 bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-900">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all",
              isActive
                ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
            )}
          >
            <div className="flex items-center gap-3">
              <Icon
                size={16}
                className={clsx(
                  isActive ? "text-indigo-500" : "text-slate-400 dark:text-slate-500"
                )}
              />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase animate-pulse shrink-0">
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </aside>
  );
}