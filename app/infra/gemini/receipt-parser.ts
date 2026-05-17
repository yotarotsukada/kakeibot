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

出力フォーマット（1レシート・1メッセージ = 必ず1エントリ）:
{
  "date": "YYYY-MM-DD",
  "type": "支出",
  "amount": 数値,
  "category": "カテゴリ名",
  "memo": "店名や商品の概要"
}

ルール:
- dateは取引日。レシートに記載がなければ空文字("")を出力してください。
- typeは通常"支出"。入金と明示されている場合のみ"入金"。
- amountは正の整数（円単位）。複数品目の場合は合計金額。
- categoryは次のいずれか: 食費, 日用品費, 水光熱費, 外食費, サブスク費, デート, その他
- memoは店名と主な商品名を簡潔に。
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
