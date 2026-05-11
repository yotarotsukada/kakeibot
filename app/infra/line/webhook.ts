/**
 * LINE Webhook: 署名検証と valibot によるペイロード解析。
 * スキーマは domain/line/event.ts が所有する。
 * Web Crypto API のみ使用。
 */

import * as v from "valibot";
import { ValidationError } from "~/domain/errors";
import {
  type ExtractedMessage,
  LineWebhookBodySchema,
} from "~/domain/line/event";

// ---- Signature Verification ----

export async function verifyLineSignature(
  rawBody: string,
  channelSecret: string,
  signature: string,
): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(channelSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const calculated = btoa(String.fromCharCode(...new Uint8Array(buf)));
  return timingSafeEqual(calculated, signature);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ---- Payload Parsing ----

/**
 * 生の JSON 文字列を domain のスキーマで検証し、メッセージイベントを抽出する。
 * @throws {ValidationError} ペイロードがスキーマに合致しない場合
 */
export function parseAndExtractMessages(rawBody: string): ExtractedMessage[] {
  const parseResult = v.safeParse(LineWebhookBodySchema, JSON.parse(rawBody));
  if (!parseResult.success) {
    throw new ValidationError({
      message: `LINE Webhook ペイロードが不正です: ${JSON.stringify(v.flatten(parseResult.issues))}`,
      cause: parseResult.issues,
    });
  }

  const body = parseResult.output;
  return body.events.flatMap((event) => {
    if (event.type !== "message" || !event.message) return [];
    const msg = event.message;
    return [
      {
        userId: event.source.userId ?? "unknown",
        replyToken: event.replyToken,
        text: msg.type === "text" ? msg.text : undefined,
        imageMessageId: msg.type === "image" ? msg.id : undefined,
      },
    ];
  });
}
