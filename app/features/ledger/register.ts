/**
 * 元帳登録ユースケース: メッセージを解析し、元帳に 1 エントリ記録する。
 *
 * 依存は domain のインターフェースのみ。
 * infra の具象クラスは直接 import しない。
 *
 * ParsedEntry → LedgerEntry の変換（wallet, shouldSettle の付与）は
 * このユースケース層の責務。
 */

import { AppError, UnknownUserError } from "~/domain/errors";
import type {
  IncomeEntry,
  LedgerEntry,
  ParsedEntry,
  SpendingEntry,
} from "~/domain/ledger/entry";
import type { ReceiptParser } from "~/domain/ledger/receipt-parser";
import type { LineClient } from "~/domain/line/client";
import type { ExtractedMessage } from "~/domain/line/event";
import type { Storage } from "~/domain/storage";

export interface LedgerDeps {
  lineClient: LineClient;
  parser: ReceiptParser;
  storage: Storage;
  appBaseUrl: string;
}

/**
 * 受信メッセージ群を順に処理し、元帳にエントリを登録するユースケース。
 */
export async function registerLedgerEntries(
  messages: ExtractedMessage[],
  deps: LedgerDeps,
): Promise<void> {
  if (messages.length === 0) return;
  await deps.storage.initialize();
  for (const msg of messages) {
    await processMessage(msg, deps);
  }
}

// ---- Private ----

async function processMessage(
  msg: ExtractedMessage,
  { lineClient, parser, storage, appBaseUrl }: LedgerDeps,
): Promise<void> {
  try {
    // 1. ユーザーマスタで存在確認（認証）
    const registeredActor = await storage.findActorByLineUserId(msg.userId);
    if (!registeredActor) {
      throw new UnknownUserError(msg.userId);
    }

    // 2. 画像取得（画像メッセージの場合）
    let imageBase64: string | undefined;
    if (msg.imageMessageId) {
      imageBase64 = await lineClient.fetchImage(msg.imageMessageId);
    }

    if (!msg.text && !imageBase64) return;

    // 3. レシート解析 → ParsedEntry（1 メッセージ = 1 エントリ）
    const parsed = await parser.parse({
      text: msg.text,
      imageBase64,
      actor: "共同",
      today: getTodayJST(),
    });

    // 4. ParsedEntry → LedgerEntry
    // 入金: 誰が振り込んだかを記録するため registeredActor を使う
    // 支出: 元帳上は常に共同に統一する
    const entry = toLedgerEntry(parsed, registeredActor);

    // 5. 元帳に追記
    await storage.appendLedgerEntries([entry]);

    // 6. 返信
    if (msg.replyToken) {
      const replyText =
        entry.type === "入金"
          ? `✅ 入金を登録しました\n${entry.date} ¥${entry.amount.toLocaleString()}\n${appBaseUrl}/savings`
          : `✅ 登録しました\n${entry.date} ${entry.category}: ¥${entry.amount.toLocaleString()}\n${appBaseUrl}/calendar`;
      await lineClient.reply(msg.replyToken, replyText);
    }

    const entryLabel =
      entry.type === "入金"
        ? `入金 (${entry.actor})`
        : `${entry.category} (${entry.wallet})`;
    console.log(
      `[Ledger] ✅ 登録 (${msg.userId} / actor: ${entry.actor}) ${entryLabel} ¥${entry.amount}`,
    );
  } catch (err) {
    if (err instanceof UnknownUserError) {
      console.warn(`[Ledger] ${err.message}`);
      if (msg.replyToken) {
        await lineClient.reply(
          msg.replyToken,
          "⚠️ 未登録のユーザーです。管理者に連絡してください。",
        );
      }
      return;
    }

    if (err instanceof AppError) {
      console.error(`[Ledger] ${err.name}: ${err.message}`);
      if (msg.replyToken) {
        await lineClient.reply(
          msg.replyToken,
          `処理に失敗しました: ${err.message}`,
        );
      }
      return;
    }

    console.error("[Ledger] 予期しないエラー:", err);
    if (msg.replyToken) {
      await lineClient.reply(
        msg.replyToken,
        "エラーが発生しました。しばらくしてから再度お試しください。",
      );
    }
  }
}

function getTodayJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * ParsedEntry → LedgerEntry に変換する。
 *
 * 入金:
 * - date: 空の場合は今日の日付（JST）を補完する。
 * - wallet / category / shouldSettle は入金ドメインに存在しない。
 *
 * 支出:
 * - date: 空の場合は今日の日付（JST）を補完する。
 * - wallet: AI が返却した date の YYYY-MM から「YYYY-MM通常」を生成。
 * - shouldSettle: 常に true。
 */
function toLedgerEntry(parsed: ParsedEntry, registeredActor: string): LedgerEntry {
  const dateStr = parsed.date || getTodayJST();

  if (parsed.type === "入金") {
    const entry: IncomeEntry = {
      type: "入金",
      date: dateStr,
      amount: parsed.amount,
      actor: registeredActor, // 誰が入金したかを記録
      memo: parsed.memo,
    };
    return entry;
  }

  const [year, month] = dateStr.split("-");
  const entry: SpendingEntry = {
    type: "支出",
    date: dateStr,
    amount: parsed.amount,
    actor: "共同", // 支出は元帳上常に共同
    memo: parsed.memo,
    wallet: `${year}-${month}通常`,
    category: parsed.category,
    shouldSettle: true,
  };
  return entry;
}
