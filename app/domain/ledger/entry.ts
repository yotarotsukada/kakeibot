/**
 * 元帳ドメイン: エントリと AI 解析結果のスキーマ・型定義。
 *
 * 不変条件（amount > 0、date の形式、type の列挙）は domain の責務であり、
 * スキーマから型を導出することで宣言と検証を一箇所に集約する。
 * valibot はインフラ固有ライブラリではなく、型不変条件を表現するための
 * 言語的ツールとして位置づけ、domain への依存を許容する。
 *
 * 設計: docs/spec/data-model.md §3
 */

import * as v from "valibot";

// ---- 共通フィールド定義 ----

const dateField = v.optional(
  v.union([
    v.pipe(
      v.string(),
      v.regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式"),
    ),
    v.literal(""),
  ]),
  "",
);

const amountField = v.pipe(v.number(), v.integer(), v.minValue(1));

// ---- ParsedEntry: AI パーサーが返す解析結果 ----

/**
 * 入金の AI 解析結果。財布・カテゴリ・精算フラグはドメインとして不要。
 */
export const ParsedIncomeSchema = v.object({
  type: v.literal("入金"),
  date: dateField,
  amount: amountField,
  memo: v.string(),
});

/**
 * 支出の AI 解析結果。予算照合・貯金計算のためカテゴリが必要。
 */
export const ParsedSpendingSchema = v.object({
  type: v.literal("支出"),
  date: dateField,
  amount: amountField,
  category: v.string(),
  memo: v.string(),
});

/**
 * AI パーサーが返す解析結果。type で discriminate する variant union。
 */
export const ParsedEntrySchema = v.variant("type", [
  ParsedIncomeSchema,
  ParsedSpendingSchema,
]);

export type ParsedIncome = v.InferOutput<typeof ParsedIncomeSchema>;
export type ParsedSpending = v.InferOutput<typeof ParsedSpendingSchema>;
export type ParsedEntry = v.InferOutput<typeof ParsedEntrySchema>;

// ---- ドメイン型: features 層が扱う ----

/**
 * 入金エントリ。「口座にお金が入ってきた」という事実のみを記録する。
 * 財布・カテゴリ・精算フラグはドメインとして存在しない（設計: docs/spec/savings.md §4）。
 * 自コードで構築するため interface として宣言する。
 */
export interface IncomeEntry {
  date: string;
  type: "入金";
  amount: number;
  actor: string;
  memo: string;
}

/**
 * 支出エントリ。「どの財布のどのカテゴリに対する出費か」を持つ。
 * 予算照合・貯金計算・精算計算はすべてこのフィールドに依存する。
 * 自コードで構築するため interface として宣言する。
 */
export interface SpendingEntry {
  date: string;
  type: "支出";
  amount: number;
  actor: string;
  memo: string;
  wallet: string;
  category: string;
  shouldSettle: boolean;
}

/**
 * 貯金プールへの追加エントリ（積立・初期残高・精算返却）。
 * amount は常に正。方向（追加）は type で表現する。
 */
export interface SavingsDepositEntry {
  date: string;
  type: "積立";
  amount: number;
  actor: string;
  memo: string;
}

/**
 * 貯金プールからの使用エントリ（特別財布への割当）。
 * amount は常に正。方向（使用）は type で表現する。
 */
export interface SavingsAllocationEntry {
  date: string;
  type: "配分";
  amount: number;
  actor: string;
  memo: string;
}

/** features 層が扱う元帳エントリの union 型。 */
export type LedgerEntry = IncomeEntry | SpendingEntry | SavingsDepositEntry | SavingsAllocationEntry;

// ---- ParserInput: AI パーサーへの入力 ----

/** ParserInput は自コードで構築するため interface として宣言する。 */
export interface ParserInput {
  text?: string;
  imageBase64?: string;
  actor: string;
  today?: string; // YYYY-MM-DD
}
