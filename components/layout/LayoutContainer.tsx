"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import PageTransition from "./PageTransition";
import { X, LayoutDashboard, Receipt, Tag, ScanLine, Bot, Users, Target, CalendarDays, Settings, RefreshCw, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

interface LayoutContainerProps {
  children: React.ReactNode;
  userEmail?: string;
  avatarUrl?: string | null;
  fullName?: string | null;
}

export default function LayoutContainer({
  children,
  userEmail,
  avatarUrl,
  fullName,
}: LayoutContainerProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <div className="min-h-screen bg-gray-50/70 dark:bg-slate-950 transition-colors">
      {/* Background accent blobs */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[350px] h-[350px] bg-purple-500/5 dark:bg-purple-500/5 rounded-full blur-[100px] pointer-events-none z-0" />

      <div className="relative z-10">
        <Topbar
          userEmail={userEmail}
          avatarUrl={avatarUrl}
          fullName={fullName}
          onMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        <div className="flex">
          {/* Desktop Sidebar */}
          <Sidebar />

          {/* Mobile/Tablet Sidebar Drawer */}
          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 md:hidden flex">
              {/* Backdrop */}
              <div
                className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm transition-opacity duration-300"
                onClick={() => setMobileMenuOpen(false)}
              />

              {/* Sidebar Content */}
              <div className="relative flex flex-col w-72 max-w-[85vw] h-full bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 p-5 shadow-2xl transition-all duration-300 overflow-y-auto">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 dark:border-slate-900 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-tr from-indigo-600 to-indigo-400 rounded-lg flex items-center justify-center">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="font-bold text-sm bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                      Smart Finance AI
                    </span>
                  </div>
                  <button
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={clsx(
                          "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all",
                          isActive
                            ? "bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400"
                            : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            size={18}
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
                </div>
              </div>
            </div>
          )}

          <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-65px)] overflow-x-hidden">
            <div className="max-w-6xl mx-auto">
              <PageTransition>{children}</PageTransition>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
