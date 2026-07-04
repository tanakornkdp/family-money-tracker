export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function getMonthKey(date: string): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function getLastNMonths(n: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return months;
}

export type PeriodGranularity = "day" | "week" | "month" | "year";

export function getPeriodKey(date: string, granularity: PeriodGranularity): string {
  const d = new Date(date);

  if (granularity === "day") {
    return date;
  }

  if (granularity === "week") {
    const dayOfWeek = d.getDay();
    const diff = d.getDate() - dayOfWeek;
    const weekStart = new Date(d.getFullYear(), d.getMonth(), diff);
    return weekStart.toISOString().split("T")[0];
  }

  if (granularity === "month") {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  // year
  return `${d.getFullYear()}`;
}

export function formatPeriodLabel(periodKey: string, granularity: PeriodGranularity): string {
  if (granularity === "day" || granularity === "week") {
    return new Date(periodKey).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  if (granularity === "month") {
    const [year, month] = periodKey.split("-");
    return new Date(Number(year), Number(month) - 1).toLocaleDateString("en-US", {
      month: "short",
      year: "2-digit",
    });
  }

  return periodKey;
}

export function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - 1);

  return {
    from: from.toISOString().split("T")[0],
    to: to.toISOString().split("T")[0],
  };
}