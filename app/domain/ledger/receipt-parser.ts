/**
 * レシートパーサーのインターフェース。
 * 1 メッセージ = 1 エントリ。配列は返さない。
 * 外部ライブラリへの依存禁止。
 */

import type { ParsedEntry, ParserInput } from "./entry";

export interface ReceiptParser {
  parse(input: ParserInput): Promise<ParsedEntry>;
}
