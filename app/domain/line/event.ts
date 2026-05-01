/**
 * LINE ドメイン: Webhook イベントのスキーマ・型定義と ExtractedMessage。
 *
 * LINE Webhook ペイロードは外部入力であり、ドメインがその構造の不変条件を
 * 所有する。スキーマから型を導出することで宣言と検証を一箇所に集約する。
 */

import * as v from "valibot";

// ---- LINE Webhook ペイロードスキーマ ----

const LineSourceSchema = v.object({
  type: v.string(),
  userId: v.optional(v.string()),
  groupId: v.optional(v.string()),
  roomId: v.optional(v.string()),
});

const LineMessageSchema = v.object({
  id: v.string(),
  type: v.string(),
  text: v.optional(v.string()),
  contentProvider: v.optional(
    v.object({
      type: v.string(),
      originalContentUrl: v.optional(v.string()),
    }),
  ),
});

const LineEventSchema = v.object({
  type: v.string(),
  timestamp: v.number(),
  source: LineSourceSchema,
  replyToken: v.optional(v.string()),
  message: v.optional(LineMessageSchema),
});

export const LineWebhookBodySchema = v.object({
  destination: v.string(),
  events: v.array(LineEventSchema),
});

/** 型はスキーマから導出する。 */
export type LineWebhookBody = v.InferOutput<typeof LineWebhookBodySchema>;
export type LineEvent = v.InferOutput<typeof LineEventSchema>;
export type LineSource = v.InferOutput<typeof LineSourceSchema>;
export type LineMessage = v.InferOutput<typeof LineMessageSchema>;

// ---- ドメイン型 ----

/**
 * ExtractedMessage は infra が LINE ペイロードから抽出して構築する内部型。
 * 外部入力ではないため interface として宣言する。
 */
export interface ExtractedMessage {
  userId: string;
  replyToken?: string;
  text?: string;
  imageMessageId?: string;
}
