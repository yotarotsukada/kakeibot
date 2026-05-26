/**
 * モック楽天カードパーサ（開発用、USE_MOCK_AI で切替）。
 * 固定の取引を返す。件名に「家族」を含む場合だけ家族カード扱いにする。
 */

import type {
  CardEmailInput,
  CardEmailParser,
} from "~/domain/card/email-parser";
import type { ParsedCardTransaction } from "~/domain/card/transaction";

export class MockRakutenCardEmailParser implements CardEmailParser {
  canParse(input: CardEmailInput): boolean {
    console.log(
      `[MockRakutenCardEmailParser] 🔎 canParse: subject="${input.subject}"`,
    );
    return true;
  }

  parse(input: CardEmailInput): ParsedCardTransaction {
    const tx: ParsedCardTransaction = {
      amount: 1500,
      usedDate: todayJST(),
      merchant: "モック店舗",
      cardLabel: input.subject.includes("家族") ? "家族" : "本会員",
    };
    console.log(
      `[MockRakutenCardEmailParser] 💳 parse → ¥${tx.amount} ${tx.merchant} (${tx.cardLabel}) ${tx.usedDate}`,
    );
    return tx;
  }
}

function todayJST(): string {
  const now = new Date();
  now.setUTCHours(now.getUTCHours() + 9);
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
