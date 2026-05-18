import { describe, expect, it } from "vitest";
import { getSavingsData } from "~/features/savings/getSavingsData";
import { createTestStorage } from "../../helpers/storage";

const NORMAL_2026_05 = "2026-05通常";
const NORMAL_2026_04 = "2026-04通常";
const SPECIAL = "沖縄旅行";

describe("getSavingsData", () => {
  it("エントリがゼロのとき、すべて0を返す", async () => {
    const storage = createTestStorage();
    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.estimatedBalance).toBe(0);
    expect(result.value.totalSavings).toBe(0);
    expect(result.value.monthlyBreakdowns).toHaveLength(0);
  });

  it("推定残高: 全入金合計 − 全支出合計（特別財布含む）", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: NORMAL_2026_05, type: "月次", settled: false },
        { name: SPECIAL, type: "特別", settled: false },
      ],
      ledger: [
        { id: "i1", date: "2026-05-01", type: "入金", amount: 200000, actor: "共同", memo: "生活費" },
        { id: "s1", date: "2026-05-10", type: "支出", amount: 50000, actor: "共同", category: "食費", wallet: NORMAL_2026_05, shouldSettle: true, memo: "" },
        { id: "s2", date: "2026-05-15", type: "支出", amount: 80000, actor: "共同", category: "一括", wallet: SPECIAL, shouldSettle: true, memo: "旅費" },
      ],
    });

    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 200000 − (50000 + 80000) = 70000
    expect(result.value.estimatedBalance).toBe(70000);
  });

  it("月別節約額: 通常財布の予算 − 通常財布の支出（特別財布の支出を除外）", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: NORMAL_2026_05, type: "月次", settled: false },
        { name: SPECIAL, type: "特別", settled: false },
      ],
      budgets: [
        { walletName: NORMAL_2026_05, categoryName: "食費", amount: 50000 },
        { walletName: NORMAL_2026_05, categoryName: "日用品費", amount: 30000 },
      ],
      ledger: [
        { id: "s1", date: "2026-05-10", type: "支出", amount: 40000, actor: "共同", category: "食費", wallet: NORMAL_2026_05, shouldSettle: true, memo: "" },
        { id: "s2", date: "2026-05-15", type: "支出", amount: 80000, actor: "共同", category: "一括", wallet: SPECIAL, shouldSettle: true, memo: "旅費" },
      ],
    });

    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const breakdown = result.value.monthlyBreakdowns.find(
      (m) => m.yearMonth === "2026-05",
    );
    expect(breakdown).toBeDefined();
    if (!breakdown) return;

    // 予算合計: 80000, 通常財布支出: 40000, 特別財布は除外
    expect(breakdown.totalBudget).toBe(80000);
    expect(breakdown.normalSpending).toBe(40000);
    expect(breakdown.savedAmount).toBe(40000); // 80000 - 40000
  });

  it("累計貯金額: 月別節約額の総和（通常財布のみ）", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: NORMAL_2026_05, type: "月次", settled: false },
        { name: NORMAL_2026_04, type: "月次", settled: false },
      ],
      budgets: [
        { walletName: NORMAL_2026_05, categoryName: "食費", amount: 50000 },
        { walletName: NORMAL_2026_04, categoryName: "食費", amount: 48000 },
      ],
      ledger: [
        { id: "s1", date: "2026-05-10", type: "支出", amount: 35000, actor: "共同", category: "食費", wallet: NORMAL_2026_05, shouldSettle: true, memo: "" },
        { id: "s2", date: "2026-04-10", type: "支出", amount: 40000, actor: "共同", category: "食費", wallet: NORMAL_2026_04, shouldSettle: true, memo: "" },
      ],
    });

    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 5月節約: 50000 - 35000 = 15000
    // 4月節約: 48000 - 40000 = 8000
    // 累計: 15000 + 8000 = 23000
    expect(result.value.totalSavings).toBe(23000);
  });

  it("月別内訳は新しい月が先頭", async () => {
    const storage = createTestStorage({
      wallets: [
        { name: NORMAL_2026_05, type: "月次", settled: false },
        { name: NORMAL_2026_04, type: "月次", settled: false },
      ],
      budgets: [
        { walletName: NORMAL_2026_05, categoryName: "食費", amount: 50000 },
        { walletName: NORMAL_2026_04, categoryName: "食費", amount: 48000 },
      ],
    });

    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.monthlyBreakdowns[0].yearMonth).toBe("2026-05");
    expect(result.value.monthlyBreakdowns[1].yearMonth).toBe("2026-04");
  });

  it("月別内訳にその月の全入金合計を含む", async () => {
    const storage = createTestStorage({
      wallets: [{ name: NORMAL_2026_05, type: "月次", settled: false }],
      budgets: [{ walletName: NORMAL_2026_05, categoryName: "食費", amount: 50000 }],
      ledger: [
        { id: "i1", date: "2026-05-01", type: "入金", amount: 100000, actor: "共同", memo: "A入金" },
        { id: "i2", date: "2026-05-01", type: "入金", amount: 100000, actor: "共同", memo: "B入金" },
      ],
    });

    const result = await getSavingsData({ storage });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const breakdown = result.value.monthlyBreakdowns[0];
    expect(breakdown.totalIncome).toBe(200000);
  });
});
