/**
 * LINE クライアントのインターフェース。
 * 外部ライブラリへの依存禁止。
 */

export interface LineClient {
  fetchImage(messageId: string): Promise<string>;
  reply(replyToken: string, message: string): Promise<void>;
}
