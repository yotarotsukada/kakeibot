/**
 * カード利用速報メールの受信入力と、発行元別パーサのインターフェース。
 *
 * 受信入力は GAS から転送される JSON。外部入力なので valibot スキーマを正とし、
 * `InferOutput` で型を導出する。
 */

import * as v from "valibot";
import type { ParsedCardTransaction } from "./transaction";

export const CardEmailInputSchema = v.object({
  from: v.string(),
  subject: v.string(),
  html: v.string(),
  gmailMessageId: v.optional(v.string()),
});

export type CardEmailInput = v.InferOutput<typeof CardEmailInputSchema>;

/**
 * 発行元ごとの決定論パーサ。
 * - `canParse`: この発行元の速報メールとして扱えるか（false なら無視）。
 * - `parse`: 解析して 1 取引を返す。解析不能時は ValidationError を throw する。
 */
export interface CardEmailParser {
  canParse(input: CardEmailInput): boolean;
  parse(input: CardEmailInput): ParsedCardTransaction;
}
