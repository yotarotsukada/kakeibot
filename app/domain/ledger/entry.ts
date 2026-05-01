/**
 * 元帳ドメイン: エントリと AI 解析結果のスキーマ・型定義。
 *
 * 不変条件（amount > 0、date の形式、type の列挙）は domain の責務であり、
 * スキーマから型を導出することで宣言と検証を一箇所に集約する。
 * valibot はインフラ固有ライブラリではなく、型不変条件を表現するための
 * 言語的ツールとして位置づけ、domain への依存を許容する。
 */

import * as v from "valibot";

// ---- ParsedEntry: AI パーサーが返す解析結果 ----

/**
 * AI パーサーが返す解析結果のスキーマ（1 メッセージ = 1 エントリ）。
 *
 * ドメイン不変条件:
 * - date は YYYY-MM-DD 形式（toLedgerEntry で year/month を分割するため必須）
 * - amount は 1 以上の整数
 * - type は "入金" または "支出" の二値
 *
 * wallet / shouldSettle / actor は AI の責務外であり、
 * features 層でプログラマティックに付与する。
 */
export const ParsedEntrySchema = v.object({
  date: v.optional(
    v.union([
      v.pipe(
        v.string(),
        v.regex(/^\d{4}-\d{2}-\d{2}$/, "日付は YYYY-MM-DD 形式"),
      ),
      v.literal(""),
    ]),
    "",
  ),
  type: v.picklist(["入金", "支出"]),
  amount: v.pipe(v.number(), v.integer(), v.minValue(1)),
  category: v.string(),
  memo: v.string(),
});

/** ParsedEntry 型はスキーマから導出する（インターフェースとの二重定義を防ぐ）。 */
export type ParsedEntry = v.InferOutput<typeof ParsedEntrySchema>;

// ---- LedgerEntry: 元帳の 1 行。Storage に書き込む最終形 ----

/**
 * LedgerEntry は自コードで構築する（外部入力ではない）ため、
 * 通常の interface として宣言する。
 */
export interface LedgerEntry {
  date: string;
  type: "入金" | "支出";
  amount: number;
  actor: string;
  category: string;
  wallet: string;
  shouldSettle: boolean;
  memo: string;
}

// ---- ParserInput: AI パーサーへの入力 ----

/** ParserInput は自コードで構築するため interface として宣言する。 */
export interface ParserInput {
  text?: string;
  imageBase64?: string;
  actor: string;
  today?: string; // YYYY-MM-DD
}
