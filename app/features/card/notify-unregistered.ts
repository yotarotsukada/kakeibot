/**
 * カード利用速報 → 未登録検知 → 通知ユースケース。
 *
 * 速報メールを解析し、金額完全一致かつ利用日 ±1 日の支出が元帳に既にあるかを照合する。
 * 未登録（該当なし）のときだけ通知グループへ LINE push する。
 *
 * 依存は domain のインターフェースのみ。infra の throw は catch して Result 化する。
 */

import type {
  CardEmailInput,
  CardEmailParser,
} from "~/domain/card/email-parser";
import type { ParsedCardTransaction } from "~/domain/card/transaction";
import { type AppError, wrapUnknownError } from "~/domain/errors";
import type { LineClient } from "~/domain/line/client";
import { err, ok, type Result } from "~/domain/result";
import type { Storage } from "~/domain/storage";
import { addDaysToDateString } from "~/lib/date";

/**
 * - `ignored`: この発行元の速報メールではない（canParse=false）。
 * - `matched`: 元帳に同額・近接日付の支出が既にある（通知しない）。
 * - `notified`: 元帳に見当たらないため通知グループへ push した。
 */
export type CardNotifyOutcome = "ignored" | "matched" | "notified";

const MATCH_DATE_TOLERANCE_DAYS = 1;

export interface CardNotifyDeps {
  parser: CardEmailParser;
  storage: Storage;
  lineClient: LineClient;
  notifyGroupId: string;
}

export async function notifyUnregisteredCardCharge(
  input: CardEmailInput,
  deps: CardNotifyDeps,
): Promise<Result<CardNotifyOutcome, AppError>> {
  const { parser, storage, lineClient, notifyGroupId } = deps;
  try {
    if (!parser.canParse(input)) {
      return ok("ignored");
    }

    const tx = parser.parse(input);
    const fromDate = addDaysToDateString(
      tx.usedDate,
      -MATCH_DATE_TOLERANCE_DAYS,
    );
    const toDate = addDaysToDateString(tx.usedDate, MATCH_DATE_TOLERANCE_DAYS);

    const matches = await storage.findSpendingEntriesByAmountAndDateRange(
      tx.amount,
      fromDate,
      toDate,
    );
    if (matches.length > 0) {
      return ok("matched");
    }

    await lineClient.push(notifyGroupId, formatCardChargeMessage(tx));
    return ok("notified");
  } catch (e) {
    return err(wrapUnknownError(e));
  }
}

function formatCardChargeMessage(tx: ParsedCardTransaction): string {
  return [
    "💳 カード利用のお知らせ（家計簿に未登録かも）",
    `楽天カード（${tx.cardLabel}）`,
    `${tx.usedDate}　${tx.merchant}`,
    `¥${tx.amount.toLocaleString()}`,
    "",
    "まだ登録していない場合はレシートを送って登録してね。",
  ].join("\n");
}
