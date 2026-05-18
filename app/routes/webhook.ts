/**
 * POST /webhook — LINE Messaging API Webhook エンドポイント。
 *
 * Composition Root: infra インスタンスを生成し features に DI する。
 * ビジネスロジックは features に委譲。
 */

import type { ReceiptParser } from "~/domain/ledger/receipt-parser";
import type { LineClient } from "~/domain/line/client";
import { registerLedgerEntries } from "~/features/ledger/register";
import { createStorage } from "~/infra/factory";
import { GeminiReceiptParser } from "~/infra/gemini/receipt-parser";
import { MockReceiptParser } from "~/infra/gemini/receipt-parser.mock";
import { GoogleLineClient } from "~/infra/line/client";
import { MockLineClient } from "~/infra/line/client.mock";
import {
  parseAndExtractMessages,
  verifyLineSignature,
} from "~/infra/line/webhook";
import type { Route } from "./+types/webhook";

// ---- Composition Root: infra ファクトリ ----

function createLineClient(env: Env): LineClient {
  return env.USE_MOCK_LINE === "true"
    ? new MockLineClient()
    : new GoogleLineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
}

function createReceiptParser(env: Env): ReceiptParser {
  return env.USE_MOCK_AI === "true"
    ? new MockReceiptParser()
    : new GeminiReceiptParser(env.GEMINI_API_KEY, env.GEMINI_MODEL);
}

// ---- Route ----

export async function action({ request, context }: Route.ActionArgs) {
  const { env, ctx } = (
    context as { cloudflare: { env: Env; ctx: ExecutionContext } }
  ).cloudflare;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-line-signature");
  if (!signature) {
    return new Response("Missing x-line-signature", { status: 401 });
  }

  const isValid = await verifyLineSignature(
    rawBody,
    env.LINE_CHANNEL_SECRET,
    signature,
  );
  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  let messages: ReturnType<typeof parseAndExtractMessages>;
  try {
    messages = parseAndExtractMessages(rawBody);
  } catch (err) {
    console.error(
      "[Webhook] ペイロード解析エラー（LINE リトライ防止のため 200 を返す）:",
      err,
    );
    return new Response("OK", { status: 200 });
  }

  ctx.waitUntil(
    registerLedgerEntries(messages, {
      lineClient: createLineClient(env),
      parser: createReceiptParser(env),
      storage: createStorage(env),
      appBaseUrl: env.APP_BASE_URL,
    }),
  );

  return new Response("OK", { status: 200 });
}

/** GET /webhook — ヘルスチェック（パターンB）。 */
export function loader() {
  return new Response("Webhook endpoint is active", { status: 200 });
}
