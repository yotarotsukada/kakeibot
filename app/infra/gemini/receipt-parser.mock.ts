/**
 * モックレシートパーサー（開発用）。
 * 1 メッセージ = 1 エントリを返す。
 */

import type { ParsedEntry, ParserInput } from "~/domain/ledger/entry";
import type { ReceiptParser } from "~/domain/ledger/receipt-parser";

export class MockReceiptParser implements ReceiptParser {
  async parse(input: ParserInput): Promise<ParsedEntry> {
    await new Promise((r) => setTimeout(r, 300));

    const now = new Date();
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 入金と明示されている場合は ParsedIncome を返す
    if (
      input.text?.includes("入金") ||
      input.text?.includes("チャージ") ||
      input.text?.includes("振り込み")
    ) {
      const m = input.text.match(/(\d+)円/);
      const amount = m ? Number.parseInt(m[1], 10) : 50000;
      const memo = `モック: ${input.text.slice(0, 30)}`;
      console.log(`[MockReceiptParser] 📊 入金 ¥${amount}`);
      return { date, type: "入金", amount, memo };
    }

    let amount = 1500;
    let category = "食費";
    let memo = "モック: テスト店舗";

    if (input.imageBase64) {
      amount = 2980;
      memo = "モック: レシート画像（プレースホルダー）";
    } else if (input.text) {
      const m = input.text.match(/(\d+)円/);
      if (m) amount = Number.parseInt(m[1], 10);
      if (input.text.includes("ランチ") || input.text.includes("ディナー"))
        category = "外食費";
      else if (input.text.includes("電車") || input.text.includes("バス"))
        category = "交通費";
      else if (input.text.includes("薬") || input.text.includes("病院"))
        category = "医療費";
      memo = `モック: ${input.text.slice(0, 30)}`;
    }

    console.log(
      `[MockReceiptParser] 📊 actor=${input.actor}, ${category} ¥${amount}`,
    );
    return { date, type: "支出", amount, category, memo };
  }
}
