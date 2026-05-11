export function getCurrentMonthJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** currentMonth を基準に過去12ヶ月〜futureMonths先までの月リストを返す */
export function buildMonthRange(
  currentMonth: string,
  futureMonths = 0,
): string[] {
  const [year, month] = currentMonth.split("-").map(Number);
  const months: string[] = [];
  for (let offset = -12; offset <= futureMonths; offset++) {
    const d = new Date(year, month - 1 + offset, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    months.push(`${y}-${m}`);
  }
  return months;
}

export function isValidMonth(month: string, range: string[]): boolean {
  return /^\d{4}-\d{2}$/.test(month) && range.includes(month);
}
