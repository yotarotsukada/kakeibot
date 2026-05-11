import * as v from "valibot";

export const BudgetRecordSchema = v.object({
  walletName: v.string(),
  categoryName: v.string(),
  amount: v.pipe(v.number(), v.integer(), v.minValue(0)),
});
export type BudgetRecord = v.InferOutput<typeof BudgetRecordSchema>;

export const WalletSchema = v.object({
  name: v.string(),
  type: v.picklist(["月次", "一括"]),
  /** 特別財布（一括）の精算完了フラグ。月次財布では常に false。 */
  settled: v.optional(v.boolean(), false),
});
export type Wallet = v.InferOutput<typeof WalletSchema>;
