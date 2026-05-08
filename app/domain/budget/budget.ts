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
});
export type Wallet = v.InferOutput<typeof WalletSchema>;
