/**
 * LINE Messaging API クライアント（本番実装）。
 * エラーは LineApiError としてラップする。
 */

import { LineApiError } from "~/domain/errors";
import type { LineClient } from "~/domain/line/client";

export class GoogleLineClient implements LineClient {
  constructor(private readonly accessToken: string) {}

  async fetchImage(messageId: string): Promise<string> {
    try {
      const res = await fetch(
        `https://api-data.line.me/v2/bot/message/${messageId}/content`,
        { headers: { Authorization: `Bearer ${this.accessToken}` } },
      );
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
      const bytes = new Uint8Array(await res.arrayBuffer());
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      return btoa(binary);
    } catch (err) {
      throw new LineApiError(
        `画像取得に失敗しました (messageId: ${messageId})`,
        err,
      );
    }
  }

  async reply(replyToken: string, message: string): Promise<void> {
    try {
      const res = await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify({
          replyToken,
          messages: [{ type: "text", text: message }],
        }),
      });
      if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`);
      }
    } catch (err) {
      // reply の失敗は処理続行可能なので、ログのみ出力してスローしない
      console.error(
        "[GoogleLineClient] reply failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}
