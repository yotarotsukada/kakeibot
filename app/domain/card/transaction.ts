/**
 * カードドメイン: 利用速報メールから解析した 1 取引のスキーマ・型定義。
 *
 * 不変条件（金額は 1 以上の整数、利用日は YYYY-MM-DD）を valibot スキーマで宣言し、
 * `InferOutput` で型を導出する。元帳の amountField（entry.ts）と同じ流儀。
 */

import * as v from "valibot";

const amountField = v.pipe(v.number(), v.integer(), v.minValue(1));

const usedDateField = v.pipe(
  v.string(),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, "利用日は YYYY-MM-DD 形式"),
);

/** カードの名義区分。本会員カードか家族カードか。 */
export const CardLabelSchema = v.picklist(["本会員", "家族"]);
export type CardLabel = v.InferOutput<typeof CardLabelSchema>;

export const ParsedCardTransactionSchema = v.object({
  amount: amountField,
  usedDate: usedDateField,
  merchant: v.pipe(v.string(), v.minLength(1)),
  cardLabel: CardLabelSchema,
});

export type ParsedCardTransaction = v.InferOutput<
  typeof ParsedCardTransactionSchema
>;
