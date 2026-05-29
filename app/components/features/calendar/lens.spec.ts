import { describe, expect, it } from "vitest";
import type { LedgerEntryWithId } from "~/domain/storage";
import { spendingLensKey, UNCATEGORIZED_KEY } from "./lens";

const MONTHLY = "2026-05通常";
const SPECIAL = ["沖縄旅行"];
const CATEGORIES = ["食費", "日用品費"];

function spending(
  overrides: Partial<LedgerEntryWithId> = {},
): LedgerEntryWithId {
  return {
    id: "1",
    date: "2026-05-10",
    type: "支出",
    amount: 1000,
    actor: "共同",
    memo: "",
    wallet: MONTHLY,
    category: "食費",
    shouldSettle: true,
    ...overrides,
  } as LedgerEntryWithId;
}

describe("spendingLensKey", () => {
  it("月次財布の予算カテゴリ支出はカテゴリ名を返す", () => {
    const key = spendingLensKey(spending(), MONTHLY, SPECIAL, CATEGORIES);
    expect(key).toBe("食費");
  });

  it("予算カテゴリに無い支出は未分類を返す", () => {
    const key = spendingLensKey(
      spending({ category: "その他" }),
      MONTHLY,
      SPECIAL,
      CATEGORIES,
    );
    expect(key).toBe(UNCATEGORIZED_KEY);
  });

  it("不明財布の支出は未分類を返す", () => {
    const key = spendingLensKey(
      spending({ wallet: "謎の財布", category: "食費" }),
      MONTHLY,
      SPECIAL,
      CATEGORIES,
    );
    expect(key).toBe(UNCATEGORIZED_KEY);
  });

  it("特別財布の支出はレンズ対象外（null）", () => {
    const key = spendingLensKey(
      spending({ wallet: "沖縄旅行", category: "一括" }),
      MONTHLY,
      SPECIAL,
      CATEGORIES,
    );
    expect(key).toBeNull();
  });

  it("入金はレンズ対象外（null）", () => {
    const income: LedgerEntryWithId = {
      id: "2",
      date: "2026-05-10",
      type: "入金",
      amount: 5000,
      actor: "A",
      memo: "",
    };
    const key = spendingLensKey(income, MONTHLY, SPECIAL, CATEGORIES);
    expect(key).toBeNull();
  });
});
