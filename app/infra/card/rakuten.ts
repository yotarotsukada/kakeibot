/**
 * 楽天カード利用速報メールの決定論パーサ（本会員カード / 家族カードの 2 種）。
 *
 * 速報メールは HTML。タグを落としてプレーンテキスト化し、ラベル（ご利用日 / ご利用先 /
 * ご利用金額）から金額・利用日・店名を抽出する。名義区分（本会員 / 家族）は件名・本文の
 * 「家族ご利用分」表記で判定する。
 *
 * 注意: 抽出に使う正規表現は楽天カード速報メールの一般的な書式を前提にしている。
 * 実メールの書式が変わった場合はここと test/fixtures/card/ を更新する。
 */

import type {
  CardEmailInput,
  CardEmailParser,
} from "~/domain/card/email-parser";
import type {
  CardLabel,
  ParsedCardTransaction,
} from "~/domain/card/transaction";
import { ValidationError } from "~/domain/errors";

const RAKUTEN_FROM = /rakuten-card\.co\.jp/i;

export class RakutenCardEmailParser implements CardEmailParser {
  canParse(input: CardEmailInput): boolean {
    if (RAKUTEN_FROM.test(input.from)) return true;
    return (
      input.subject.includes("楽天カード") &&
      /(カード利用|ご利用のお知らせ|ご利用内容)/.test(input.subject)
    );
  }

  parse(input: CardEmailInput): ParsedCardTransaction {
    const text = htmlToText(input.html);
    const haystack = `${input.subject}\n${text}`;

    const amount = extractAmount(text);
    const usedDate = extractUsedDate(text);
    const merchant = extractMerchant(text);

    if (amount === null || usedDate === null || merchant === null) {
      throw new ValidationError({
        message: `楽天カード速報メールの解析に失敗しました (amount=${amount}, usedDate=${usedDate}, merchant=${merchant})`,
      });
    }

    return {
      amount,
      usedDate,
      merchant,
      cardLabel: detectCardLabel(haystack),
    };
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*(?:br|\/p|\/div|\/tr|\/td|\/th|\/li|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/[ \t　]+/g, " ");
}

function toIso(year: string, month: string, day: string): string {
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractUsedDate(text: string): string | null {
  const slash = text.match(
    /(?:ご?利用日時?|利用日)[^0-9]{0,8}(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/,
  );
  if (slash) return toIso(slash[1], slash[2], slash[3]);

  const jp = text.match(
    /(?:ご?利用日時?|利用日)[^0-9]{0,8}(\d{4})年(\d{1,2})月(\d{1,2})日/,
  );
  if (jp) return toIso(jp[1], jp[2], jp[3]);

  return null;
}

function extractAmount(text: string): number | null {
  const m = text.match(
    /(?:ご?利用金額|利用金額|ご請求金額)[^0-9]{0,8}([0-9,]+)\s*円/,
  );
  if (!m) return null;
  const n = Number.parseInt(m[1].replace(/,/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function extractMerchant(text: string): string | null {
  const m = text.match(/(?:ご?利用先|ご?利用店[名舗]?)[\s：:]*([^\n]+)/);
  if (!m) return null;
  const merchant = m[1].replace(/^[■・\s]+/, "").trim();
  return merchant.length > 0 ? merchant : null;
}

function detectCardLabel(haystack: string): CardLabel {
  return /家族(?:ご利用分|カード|会員)/.test(haystack) ? "家族" : "本会員";
}
