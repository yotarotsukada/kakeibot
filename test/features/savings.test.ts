import { describe, expect, it } from "vitest";
import { getSavingsData } from "~/features/savings/balance";
import { createTestStorage } from "../helpers/storage";

// テスト用エントリのショートハンド
function entry(
  id: string,
  date: string,
  type: "入金" | "支出",
  amount: number,
  wallet: string,
): Parameters<typeof createTestStorage>[0]["ledger"][number] {
  return { id, date, type, amount, wallet, actor: "共同", category: "食費", shouldSettle: true, memo: "" };
}

describe("getSavingsData", () => {
  it("正常系: 通常財布の入金・支出・予算を正しく集計する", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-05通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-05通常", categoryName: "日用品費", amount: 20000 },
      ],
      ledger: [
        entry("i1", "2026-05-25", "入金", 110000, "2026-05通常"),
        entry("s1", "2026-05-01", "支出", 30000, "2026-05通常"),
        entry("s2", "2026-05-15", "支出", 10000, "2026-05通常"),
      ],
    });

    const result = await getSavingsData({ storage, months: ["2026-05"] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [m] = result.value.months;
    expect(m.totalIncome).toBe(110000);
    expect(m.totalSpending).toBe(40000);
    expect(m.normalWalletSpending).toBe(40000);
    expect(m.totalBudget).toBe(70000);
    expect(m.savedAmount).toBe(30000); // 70000 - 40000
    expect(m.cumulativeBalance).toBe(70000); // 110000 - 40000
  });

  it("貯金額: 通常財布の支出のみを予算と比較し、特別財布の支出を含まない", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-05通常", categoryName: "食費", amount: 50000 },
      ],
      ledger: [
        entry("i1", "2026-05-25", "入金", 100000, "2026-05通常"),
        entry("s1", "2026-05-10", "支出", 20000, "2026-05通常"),
        // 特別財布の支出 — savedAmount には影響しないこと
        entry("s2", "2026-05-06", "支出", 80000, "沖縄旅行"),
      ],
    });

    const result = await getSavingsData({ storage, months: ["2026-05"] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [m] = result.value.months;
    expect(m.normalWalletSpending).toBe(20000);
    expect(m.totalSpending).toBe(100000); // 全財布の合計
    expect(m.savedAmount).toBe(30000); // 50000 - 20000（特別財布除く）
  });

  it("累計残高: 特別財布の支出も含む全収支で累積する", async () => {
    const storage = createTestStorage({
      budgets: [],
      ledger: [
        entry("i1", "2026-05-25", "入金", 100000, "2026-05通常"),
        entry("s1", "2026-05-10", "支出", 30000, "2026-05通常"),
        entry("s2", "2026-05-06", "支出", 50000, "沖縄旅行"),
      ],
    });

    const result = await getSavingsData({ storage, months: ["2026-05"] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [m] = result.value.months;
    expect(m.cumulativeBalance).toBe(20000); // 100000 - 30000 - 50000
  });

  it("特別財布の精算入金が累計残高に反映される", async () => {
    const storage = createTestStorage({
      budgets: [],
      ledger: [
        // 月の通常入金
        entry("i1", "2026-05-25", "入金", 100000, "2026-05通常"),
        // 特別財布への支出（旅行費）
        entry("s1", "2026-04-01", "支出", 80000, "沖縄旅行"),
        // 特別財布の精算入金（4月）
        entry("i2", "2026-04-20", "入金", 80000, "沖縄旅行"),
      ],
    });

    const result = await getSavingsData({
      storage,
      months: ["2026-04", "2026-05"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [apr, may] = result.value.months;

    // 4月: 入金80000 - 支出80000 = 0
    expect(apr.cumulativeBalance).toBe(0);
    // 5月: +100000の純収支で累計100000
    expect(may.cumulativeBalance).toBe(100000);
  });

  it("複数月の累計残高が正しく積み上がる", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-04通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-05通常", categoryName: "食費", amount: 50000 },
      ],
      ledger: [
        entry("i1", "2026-04-25", "入金", 100000, "2026-04通常"),
        entry("s1", "2026-04-10", "支出", 40000, "2026-04通常"),
        entry("i2", "2026-05-25", "入金", 100000, "2026-05通常"),
        entry("s2", "2026-05-10", "支出", 60000, "2026-05通常"),
      ],
    });

    const result = await getSavingsData({
      storage,
      months: ["2026-04", "2026-05"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [apr, may] = result.value.months;

    expect(apr.cumulativeBalance).toBe(60000); // 100000 - 40000
    expect(may.cumulativeBalance).toBe(100000); // 60000 + (100000 - 60000)
    expect(apr.savedAmount).toBe(10000); // 50000 - 40000
    expect(may.savedAmount).toBe(-10000); // 50000 - 60000（超過）
  });

  it("返却月は yearMonth 昇順（古い月が先）に並ぶ", async () => {
    const storage = createTestStorage({ budgets: [], ledger: [] });

    const result = await getSavingsData({
      storage,
      months: ["2026-05", "2026-03", "2026-04"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const yearMonths = result.value.months.map((m) => m.yearMonth);
    expect(yearMonths).toEqual(["2026-03", "2026-04", "2026-05"]);
  });

  it("totalSavedAmount: savedAmount が正の月のみを合算する", async () => {
    const storage = createTestStorage({
      budgets: [
        { walletName: "2026-04通常", categoryName: "食費", amount: 50000 },
        { walletName: "2026-05通常", categoryName: "食費", amount: 50000 },
      ],
      ledger: [
        // 4月: 節約 +10000
        entry("s1", "2026-04-10", "支出", 40000, "2026-04通常"),
        // 5月: 超過 -10000（totalSavedAmount には含まれない）
        entry("s2", "2026-05-10", "支出", 60000, "2026-05通常"),
      ],
    });

    const result = await getSavingsData({
      storage,
      months: ["2026-04", "2026-05"],
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.totalSavedAmount).toBe(10000); // 4月分のみ
  });

  it("データが空の月は全てゼロ、予算未設定月は savedAmount が 0", async () => {
    const storage = createTestStorage({ budgets: [], ledger: [] });

    const result = await getSavingsData({ storage, months: ["2026-05"] });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const [m] = result.value.months;
    expect(m.totalIncome).toBe(0);
    expect(m.totalSpending).toBe(0);
    expect(m.normalWalletSpending).toBe(0);
    expect(m.totalBudget).toBe(0);
    expect(m.savedAmount).toBe(0); // 0 - 0
    expect(m.cumulativeBalance).toBe(0);
    expect(result.value.totalSavedAmount).toBe(0);
  });
});
