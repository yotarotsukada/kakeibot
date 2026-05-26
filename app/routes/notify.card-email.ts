/**
 * POST /notify/card-email — カード利用速報メール受信エンドポイント。
 *
 * GAS から転送された楽天カードの利用速報メールを受け取り、未登録の支出であれば
 * 通知グループへ LINE push する。
 *
 * Composition Root: infra インスタンスを生成し features に DI する。
 */

import type { CardEmailParser } from "~/domain/card/email-parser";
import type { LineClient } from "~/domain/line/client";
import { notifyUnregisteredCardCharge } from "~/features/card/notify-unregistered";
import { RakutenCardEmailParser } from "~/infra/card/rakuten";
import { MockRakutenCardEmailParser } from "~/infra/card/rakuten.mock";
import {
  parseCardEmailPayload,
  verifyWebhookToken,
} from "~/infra/card/webhook";
import { createStorage } from "~/infra/factory";
import { GoogleLineClient } from "~/infra/line/client";
import { MockLineClient } from "~/infra/line/client.mock";
import type { Route } from "./+types/notify.card-email";

// ---- Composition Root: infra ファクトリ ----

function createLineClient(env: Env): LineClient {
  return env.USE_MOCK_LINE === "true"
    ? new MockLineClient()
    : new GoogleLineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
}

function createCardEmailParser(env: Env): CardEmailParser {
  return env.USE_MOCK_AI === "true"
    ? new MockRakutenCardEmailParser()
    : new RakutenCardEmailParser();
}

// ---- Route ----

export async function action({ request, context }: Route.ActionArgs) {
  const { env, ctx } = (
    context as { cloudflare: { env: Env; ctx: ExecutionContext } }
  ).cloudflare;

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  if (
    !verifyWebhookToken(
      request.headers.get("authorization"),
      env.CARD_EMAIL_WEBHOOK_TOKEN,
    )
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  let input: ReturnType<typeof parseCardEmailPayload>;
  try {
    input = parseCardEmailPayload(await request.text());
  } catch (err) {
    console.error(
      "[CardEmail] ペイロード解析エラー（GAS リトライ防止のため 200 を返す）:",
      err,
    );
    return new Response("OK", { status: 200 });
  }

  ctx.waitUntil(
    notifyUnregisteredCardCharge(input, {
      parser: createCardEmailParser(env),
      storage: createStorage(env),
      lineClient: createLineClient(env),
      notifyGroupId: env.LINE_NOTIFY_GROUP_ID,
    }).then((result) => {
      if (result.ok) {
        console.log(`[CardEmail] ✅ outcome=${result.value}`);
      } else {
        console.error(
          `[CardEmail] ${result.error.name}: ${result.error.message}`,
        );
      }
    }),
  );

  return new Response("OK", { status: 200 });
}

/** GET /notify/card-email — ヘルスチェック。 */
export function loader() {
  return new Response("Card email endpoint is active", { status: 200 });
}
