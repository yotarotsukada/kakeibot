import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildMonthRange,
  getCurrentMonthJST,
  isValidMonth,
} from "~/lib/date";

describe("getCurrentMonthJST", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("JST で 2026-05 を返す（UTC 2026-05-13 12:00）", () => {
    vi.setSystemTime(new Date("2026-05-13T12:00:00Z"));
    expect(getCurrentMonthJST()).toBe("2026-05");
  });

  it("UTC 15:00 は JST 翌 0:00 なので翌月になる（月末境界）", () => {
    // UTC 2026-01-31 15:00 → JST 2026-02-01 00:00
    vi.setSystemTime(new Date("2026-01-31T15:00:00Z"));
    expect(getCurrentMonthJST()).toBe("2026-02");
  });

  it("UTC 14:59 は JST 23:59 なのでまだ前月（月末境界）", () => {
    // UTC 2026-01-31 14:59 → JST 2026-01-31 23:59
    vi.setSystemTime(new Date("2026-01-31T14:59:00Z"));
    expect(getCurrentMonthJST()).toBe("2026-01");
  });

  it("UTC 12月末 15:00 は JST 翌年 1月になる（年末境界）", () => {
    // UTC 2025-12-31 15:00 → JST 2026-01-01 00:00
    vi.setSystemTime(new Date("2025-12-31T15:00:00Z"));
    expect(getCurrentMonthJST()).toBe("2026-01");
  });
});

describe("buildMonthRange", () => {
  it("futureMonths=0 のとき 13 件（過去 12 ヶ月 + 当月）返す", () => {
    const range = buildMonthRange("2026-05", 0);
    expect(range).toHaveLength(13);
  });

  it("先頭は 12 ヶ月前、末尾は currentMonth", () => {
    const range = buildMonthRange("2026-05", 0);
    expect(range[0]).toBe("2025-05");
    expect(range[range.length - 1]).toBe("2026-05");
  });

  it("futureMonths=1 のとき 14 件返す", () => {
    const range = buildMonthRange("2026-05", 1);
    expect(range).toHaveLength(14);
    expect(range[range.length - 1]).toBe("2026-06");
  });

  it("年をまたぐ場合も正しく生成される（2026-01 起点）", () => {
    const range = buildMonthRange("2026-01", 0);
    expect(range[0]).toBe("2025-01");
    expect(range[range.length - 1]).toBe("2026-01");
  });

  it("月のゼロパディングが行われる（2月 → '02'）", () => {
    const range = buildMonthRange("2026-03", 0);
    expect(range).toContain("2026-02");
    expect(range).toContain("2026-01");
    expect(range).toContain("2025-12");
  });

  it("全要素が YYYY-MM 形式", () => {
    const range = buildMonthRange("2026-05", 2);
    for (const m of range) {
      expect(m).toMatch(/^\d{4}-\d{2}$/);
    }
  });
});

describe("isValidMonth", () => {
  const range = buildMonthRange("2026-05", 0);

  it("range に含まれる正しい形式は true", () => {
    expect(isValidMonth("2026-05", range)).toBe(true);
    expect(isValidMonth("2025-05", range)).toBe(true);
  });

  it("range に含まれない月は false（形式が正しくても）", () => {
    expect(isValidMonth("2020-01", range)).toBe(false);
  });

  it("ゼロ埋めなしの形式は false（'2026-5'）", () => {
    expect(isValidMonth("2026-5", range)).toBe(false);
  });

  it("スラッシュ区切りは false（'2026/05'）", () => {
    expect(isValidMonth("2026/05", range)).toBe(false);
  });

  it("8桁連結は false（'202605'）", () => {
    expect(isValidMonth("202605", range)).toBe(false);
  });

  it("無効月（13月）は range に存在しないので false", () => {
    expect(isValidMonth("2026-13", range)).toBe(false);
  });
});
