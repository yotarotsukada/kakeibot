/**
 * LINE クライアントのインターフェース。
 * 外部ライブラリへの依存禁止。
 */

export interface LineClient {
  fetchImage(messageId: string): Promise<string>;
  reply(replyToken: string, message: string): Promise<void>;
  /** 指定の送信先（ユーザー / グループ）へ能動的にメッセージを送る。 */
  push(to: string, message: string): Promise<void>;
}
