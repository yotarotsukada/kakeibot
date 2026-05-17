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
import type { LedgerEntry, ParsedEntry } from "~/domain/ledger/entry";
import type { ReceiptParser } from "~/domain/ledger/receipt-parser";
import type { LineClient } from "~/domain/line/client";
import type { ExtractedMessage } from "~/domain/line/event";
import type { Storage } from "~/domain/storage";

export interface LedgerDeps {
  lineClient: LineClient;
  parser: ReceiptParser;
  storage: Storage;
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
  { lineClient, parser, storage }: LedgerDeps,
): Promise<void> {
  try {
    // 1. ユーザーマスタで存在確認（認証）。元帳に書き込む actor は共同に統一する
    const registeredActor = await storage.findActorByLineUserId(msg.userId);
    if (!registeredActor) {
      throw new UnknownUserError(msg.userId);
    }
    const actor = "共同";

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
      actor,
      today: getTodayJST(),
    });

    // 4. ParsedEntry → LedgerEntry（wallet, shouldSettle を付与）
    const entry = toLedgerEntry(parsed, actor);

    // 5. 元帳に追記
    await storage.appendLedgerEntries([entry]);

    // 6. 返信
    if (msg.replyToken) {
      await lineClient.reply(
        msg.replyToken,
        `✅ 登録しました\n${formatEntryDate(entry.date)} ${entry.category}: ¥${entry.amount.toLocaleString()}\nhttps://kakeibot.yotarotsukada.workers.dev/calendar`,
      );
    }

    console.log(
      `[Ledger] ✅ 登録 (${msg.userId} / actor: ${actor}) ${entry.category} ¥${entry.amount}`,
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

function formatEntryDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
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
 * - date: 空の場合は今日の日付（JST）を補完する。
 * - wallet: AI が返却した date の YYYY-MM から「YYYY-MM通常」を生成。
 * - shouldSettle: 常に true（仕様: SPEC.md §8 参照）。
 */
function toLedgerEntry(parsed: ParsedEntry, actor: string): LedgerEntry {
  const dateStr = parsed.date || getTodayJST();
  const [year, month] = dateStr.split("-");
  const wallet = `${year}-${month}通常`;
  return { ...parsed, date: dateStr, actor, wallet, shouldSettle: true };
}
