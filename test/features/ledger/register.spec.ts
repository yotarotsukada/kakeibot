import { describe, expect, it } from "vitest";
import { registerLedgerEntries } from "~/features/ledger/register";
import { MockReceiptParser } from "~/infra/gemini/receipt-parser.mock";
import { MockLineClient } from "~/infra/line/client.mock";
import { createTestStorage } from "../../helpers/storage";

const USERS = { U_USER_A: "A" };

function makeTextMessage(text: string, userId = "U_USER_A") {
  return {
    userId,
    replyToken: "reply-token-001",
    text,
    imageMessageId: undefined,
  };
}

describe("registerLedgerEntries", () => {
  it("支出メッセージ → SpendingEntry として元帳に登録される", async () => {
    const storage = createTestStorage({ users: USERS });
    const parser = new MockReceiptParser();
    const lineClient = new MockLineClient();

    await registerLedgerEntries([makeTextMessage("スーパーで3000円")], {
      storage,
      parser,
      lineClient,
      appBaseUrl: "https://example.com",
    });

    const entries = await storage.getAllLedgerEntries();
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.type).toBe("支出");
    if (entry.type !== "支出") return;

    expect(entry.amount).toBe(3000);
    expect(entry.actor).toBe("共同");
    expect(entry.wallet).toMatch(/^\d{4}-\d{2}通常$/);
    expect(entry.category).toBeTruthy();
    expect(entry.shouldSettle).toBe(true);
  });

  it("入金メッセージ → IncomeEntry（wallet/category/shouldSettle なし）として登録される", async () => {
    const storage = createTestStorage({ users: USERS });
    const parser = new MockReceiptParser();
    const lineClient = new MockLineClient();

    await registerLedgerEntries([makeTextMessage("入金 200000円")], {
      storage,
      parser,
      lineClient,
      appBaseUrl: "https://example.com",
    });

    const entries = await storage.getAllLedgerEntries();
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.type).toBe("入金");
    if (entry.type !== "入金") return;

    expect(entry.amount).toBe(200000);
    expect(entry.actor).toBe("A"); // 入金は送信者のユーザー名を記録
    // IncomeEntry には wallet / category / shouldSettle が存在しない
    expect("wallet" in entry).toBe(false);
    expect("category" in entry).toBe(false);
    expect("shouldSettle" in entry).toBe(false);
  });

  it("未登録ユーザー → 元帳に登録されない", async () => {
    const storage = createTestStorage({ users: USERS });
    const parser = new MockReceiptParser();
    const lineClient = new MockLineClient();

    await registerLedgerEntries(
      [makeTextMessage("スーパーで3000円", "U_UNKNOWN")],
      { storage, parser, lineClient, appBaseUrl: "https://example.com" },
    );

    const entries = await storage.getAllLedgerEntries();
    expect(entries).toHaveLength(0);
  });

  it("テキストもimageも空 → 何も登録されない", async () => {
    const storage = createTestStorage({ users: USERS });
    const parser = new MockReceiptParser();
    const lineClient = new MockLineClient();

    await registerLedgerEntries(
      [{ userId: "U_USER_A", replyToken: "token", text: undefined, imageMessageId: undefined }],
      { storage, parser, lineClient, appBaseUrl: "https://example.com" },
    );

    const entries = await storage.getAllLedgerEntries();
    expect(entries).toHaveLength(0);
  });

  it("メッセージが空配列 → 何も処理しない", async () => {
    const storage = createTestStorage({ users: USERS });
    const parser = new MockReceiptParser();
    const lineClient = new MockLineClient();

    await registerLedgerEntries([], {
      storage,
      parser,
      lineClient,
      appBaseUrl: "https://example.com",
    });

    const entries = await storage.getAllLedgerEntries();
    expect(entries).toHaveLength(0);
  });
});
