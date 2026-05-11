import * as v from "valibot";

/** 特別財布の予算記録に使う予約カテゴリ名。カテゴリマスタとは無関係。 */
export const SPECIAL_WALLET_CATEGORY = "__special__" as const;

export const BudgetRecordSchema = v.object({
  walletName: v.string(),
  categoryName: v.string(),
  amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type BudgetRecord = v.InferOutput<typeof BudgetRecordSchema>;

export const WalletSchema = v.object({
  name: v.string(),
  type: v.picklist(["月次", "特別"]),
  /** 精算完了フラグ。月次財布では常に false。特別財布では精算状態を示す。 */
  settled: v.boolean(),
});
export type Wallet = v.InferOutput<typeof WalletSchema>;
