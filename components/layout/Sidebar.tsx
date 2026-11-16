"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, Receipt, Tag, ScanLine, Bot, Users, Target, CalendarDays, BarChart3, Settings, ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import clsx from "clsx";

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [collapsed, setCollapsed] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const navItems = [
    { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard }, { href: "/transactions", label: t.nav.transactions, icon: Receipt },
    { href: "/categories", label: t.nav.categories, icon: Tag }, { href: "/credit-cards", label: t.nav.creditCards, icon: CreditCard },
    { href: "/receipts", label: t.nav.receipts, icon: ScanLine }, { href: "/assistant", label: t.nav.assistant, icon: Bot, badge: "AI" },
    { href: "/household", label: t.nav.household, icon: Users }, { href: "/goals", label: t.nav.goals, icon: Target },
    { href: "/budget", label: t.nav.budget, icon: CalendarDays }, { href: "/reports", label: t.nav.reports, icon: BarChart3 }, { href: "/settings", label: t.nav.settings, icon: Settings },
  ];
  useEffect(() => {
    const updatePill = () => {
      const active = navRef.current?.querySelector<HTMLElement>("[data-active='true']"); const pill = pillRef.current;
      if (!active || !pill || !navRef.current) return;
      const parent = navRef.current.getBoundingClientRect(); const target = active.getBoundingClientRect().top - parent.top; const previous = Number(pill.dataset.top ?? target); const distance = Math.abs(target - previous);
      pill.animate([{ top: `${previous}px`, height: "40px" }, { top: `${Math.min(previous, target)}px`, height: `${distance + 40}px` }, { top: `${target}px`, height: "40px" }], { duration: 560, easing: "cubic-bezier(.65,0,.35,1)" });
      pill.style.top = `${target}px`; pill.dataset.top = String(target);
    };
    updatePill(); window.addEventListener("resize", updatePill); return () => window.removeEventListener("resize", updatePill);
  }, [pathname]);
  return <aside className={clsx("sidebar-shell hidden md:flex", collapsed && "is-collapsed")}>
    <nav ref={navRef} className="relative flex flex-1 flex-col gap-1 p-3" aria-label="เมนูหลัก"><div ref={pillRef} className="sidebar-active-pill" aria-hidden="true" />
      {navItems.map((item, index) => { const Icon = item.icon; const active = pathname === item.href || pathname.startsWith(`${item.href}/`); return <Link key={item.href} href={item.href} data-active={active} className={clsx("sidebar-item group", active && "is-active")} style={{ "--item-index": index } as React.CSSProperties}><Icon className="sidebar-icon" size={18} aria-hidden="true" /><span className="sidebar-label">{item.label}</span>{item.badge && <span className="sidebar-badge">{item.badge}</span>}<span className="sidebar-tooltip">{item.label}</span></Link>; })}
      <button type="button" className="sidebar-collapse" aria-expanded={!collapsed} aria-label={collapsed ? "ขยายเมนู" : "ยุบเมนู"} onClick={() => setCollapsed((value) => !value)}>{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}<span className="sidebar-label">{collapsed ? "ขยายเมนู" : "ยุบเมนู"}</span></button>
    </nav></aside>;
}

