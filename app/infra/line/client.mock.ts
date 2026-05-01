/**
 * モック LINE クライアント（開発用）。
 */

import type { LineClient } from "~/domain/line/client";

const PLACEHOLDER_JPEG =
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDB" +
  "kSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAAR" +
  "CAABAAEDASIAAhEBAxEB/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAA" +
  "AAAAAAAAAAAAAP/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAA" +
  "AAAAAAAA/9oADAMBAAIRAxEAPwCwABmX/9k=";

export class MockLineClient implements LineClient {
  async fetchImage(messageId: string): Promise<string> {
    if (messageId.startsWith("base64:")) {
      console.log(`[MockLineClient] 🖼️  fetchImage: 実画像データを受信しました`);
      return messageId.slice(7);
    }
    console.log(
      `[MockLineClient] 🖼️  fetchImage: ${messageId} → プレースホルダー返却`,
    );
    return PLACEHOLDER_JPEG;
  }

  async reply(replyToken: string, message: string): Promise<void> {
    console.log(
      `[MockLineClient] 💬 reply (token: ${replyToken.slice(0, 12)}...):\n${message}`,
    );
  }
}
