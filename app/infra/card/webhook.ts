/**
 * カード速報メール受信エンドポイントのユーティリティ。
 * ペイロード検証（valibot）と共有ベアラトークンの検証を分離して提供する。
 * スキーマは domain/card/email-parser.ts が所有する。
 */

import * as v from "valibot";
import {
  type CardEmailInput,
  CardEmailInputSchema,
} from "~/domain/card/email-parser";
import { ValidationError } from "~/domain/errors";

/**
 * 生の JSON 文字列を domain のスキーマで検証して CardEmailInput を返す。
 * @throws {ValidationError} JSON でない、またはスキーマに合致しない場合
 */
export function parseCardEmailPayload(rawBody: string): CardEmailInput {
  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch (err) {
    throw new ValidationError({
      message: "カード速報メールのペイロードが不正な JSON です",
      cause: err,
    });
  }

  const result = v.safeParse(CardEmailInputSchema, json);
  if (!result.success) {
    throw new ValidationError({
      message: `カード速報メールのペイロードが不正です: ${JSON.stringify(v.flatten(result.issues))}`,
      cause: result.issues,
    });
  }
  return result.output;
}

/**
 * `Authorization: Bearer <token>` を共有トークンと定数時間比較で検証する。
 * crypto.subtle を使わず、長さ一致チェック + XOR 累積で実装する。
 */
export function verifyWebhookToken(
  authHeader: string | null,
  expected: string,
): boolean {
  if (!authHeader) return false;
  const prefix = "Bearer ";
  if (!authHeader.startsWith(prefix)) return false;
  return timingSafeEqual(authHeader.slice(prefix.length), expected);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
