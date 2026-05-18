/**
 * Gemini API レシートパーサー（本番実装）。
 * 1 メッセージ = 1 エントリを返す。
 *
 * ParsedEntry のスキーマは domain/ledger/entry.ts が所有する。
 * GeminiResponseSchema（API レスポンス構造）は Gemini 固有の外部仕様であり
 * インフラの責務として infra に置く。
 */

import * as v from "valibot";
import { GeminiApiError, ValidationError } from "~/domain/errors";
import {
  type ParsedEntry,
  ParsedEntrySchema,
  type ParserInput,
} from "~/domain/ledger/entry";
import type { ReceiptParser } from "~/domain/ledger/receipt-parser";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

function getSystemPrompt(today?: string) {
  const todayContext = today
    ? `（なお、今日の日付は ${today} です。「今日」「昨日」などの相対的な指定がある場合はこれを基準にしてください。）`
    : "";
  return `あなたは家計簿アシスタントです。ユーザーから送られたレシート画像またはテキストメッセージを解析し、以下のJSON形式で出力してください。${todayContext}

出力フォーマット（支出の場合）:
{
  "type": "支出",
  "date": "YYYY-MM-DD",
  "amount": 数値,
  "category": "カテゴリ名",
  "memo": "店名や商品の概要"
}

出力フォーマット（入金の場合）:
{
  "type": "入金",
  "date": "YYYY-MM-DD",
  "amount": 数値,
  "memo": "入金内容の概要"
}

ルール:
- typeは通常"支出"。「入金」「振り込み」「チャージ」と明示されている場合のみ"入金"。
- 入金の場合、categoryは出力しない。
- dateは取引日。レシートに記載がなければ空文字("")を出力してください。レシートは原則として直近1ヶ月以内のものです。年の読み取りが曖昧な場合は今日の日付を基準に判断してください。
- amountは正の整数（円単位）。複数品目の場合は合計金額。
- categoryは支出の場合のみ、次のいずれか: 食費, 日用品費, 水光熱費, 外食費, サブスク費, デート, その他
- memoは内容を簡潔に。支出の場合は店名と主な商品名。
- 画像に複数レシートが含まれていても、必ず上記の単一オブジェクトとして出力すること。
- JSON以外のテキストは出力しないでください。`;
}

// ---- Gemini API レスポンス構造スキーマ（Gemini 固有の外部仕様 → infra の責務） ----

const GeminiResponseSchema = v.object({
  candidates: v.pipe(
    v.array(
      v.object({
        content: v.object({
          parts: v.pipe(
            v.array(v.object({ text: v.string() })),
            v.minLength(1),
          ),
        }),
      }),
    ),
    v.minLength(1),
  ),
});

// ---- Implementation ----

export class GeminiReceiptParser implements ReceiptParser {
  constructor(
    private readonly apiKey: string,
    private readonly modelName: string = "gemini-2.5-flash-lite",
  ) {}

  async parse(input: ParserInput): Promise<ParsedEntry> {
    const parts = this.buildParts(input);
    const url = `${GEMINI_API_BASE}/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: getSystemPrompt(input.today) }],
          },
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      });
    } catch (err) {
      throw new GeminiApiError("Gemini API への接続に失敗しました", err);
    }

    if (!res.ok) {
      const body = await res.text();
      throw new GeminiApiError(`Gemini API エラー: ${res.status} ${body}`);
    }

    let rawJson: unknown;
    try {
      rawJson = await res.json();
    } catch (err) {
      throw new GeminiApiError("Gemini レスポンスの JSON パースに失敗", err);
    }

    // Gemini API レスポンス構造の検証（infra の責務）
    const apiResult = v.safeParse(GeminiResponseSchema, rawJson);
    if (!apiResult.success) {
      throw new ValidationError({
        message: `Gemini レスポンス構造が不正です: ${JSON.stringify(v.flatten(apiResult.issues))}`,
        cause: apiResult.issues,
      });
    }

    const text = apiResult.output.candidates[0].content.parts[0].text;

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch (err) {
      throw new GeminiApiError(
        "Gemini が返した JSON テキストのパースに失敗",
        err,
      );
    }

    // ParsedEntry ドメイン不変条件の検証（domain のスキーマを使用）
    const entryResult = v.safeParse(ParsedEntrySchema, parsedJson);
    if (!entryResult.success) {
      throw new ValidationError({
        message: `Gemini 解析結果が不正です: ${JSON.stringify(v.flatten(entryResult.issues))}`,
        cause: entryResult.issues,
      });
    }

    return entryResult.output;
  }

  private buildParts(input: ParserInput) {
    const parts: Array<
      { text: string } | { inlineData: { mimeType: string; data: string } }
    > = [];
    if (input.text) parts.push({ text: input.text });
    if (input.imageBase64) {
      parts.push({
        inlineData: { mimeType: "image/jpeg", data: input.imageBase64 },
      });
    }
    if (parts.length === 0) parts.push({ text: "（空のメッセージ）" });
    return parts;
  }
}
