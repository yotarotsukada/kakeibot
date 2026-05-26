import { describe, expect, it } from "vitest";
import type {
  CardEmailInput,
  CardEmailParser,
} from "~/domain/card/email-parser";
import type { ParsedCardTransaction } from "~/domain/card/transaction";
import type { SpendingEntry } from "~/domain/ledger/entry";
import type { LineClient } from "~/domain/line/client";
import { notifyUnregisteredCardCharge } from "~/features/card/notify-unregistered";
import { createTestStorage } from "../../helpers/storage";

const INPUT: CardEmailInput = {
  from: "service@rakuten-card.co.jp",
  subject: "【楽天カード】カード利用のお知らせ(本人ご利用分)",
  html: "<html></html>",
};

function makeSpending(
  overrides: Partial<SpendingEntry> & { id: string },
): SpendingEntry & { id: string } {
  return {
    type: "支出",
    date: "2026-05-10",
    amount: 1500,
    actor: "共同",
    memo: "テスト",
    wallet: "2026-05通常",
    category: "食費",
    shouldSettle: true,
    ...overrides,
  };
}

function fakeParser(opts: {
  canParse?: boolean;
  tx?: ParsedCardTransaction;
}): CardEmailParser {
  return {
    canParse: () => opts.canParse ?? true,
    parse: () =>
      opts.tx ?? {
        amount: 1500,
        usedDate: "2026-05-10",
        merchant: "テスト店舗",
        cardLabel: "本会員",
      },
  };
}

function fakeLineClient() {
  const pushes: { to: string; message: string }[] = [];
  const client: LineClient = {
    async fetchImage() {
      return "";
    },
    async reply() {},
    async push(to, message) {
      pushes.push({ to, message });
    },
  };
  return { client, pushes };
}

describe("notifyUnregisteredCardCharge", () => {
  it("範囲内に同額の支出があれば matched で、push しない", async () => {
    const storage = createTestStorage({
      ledger: [makeSpending({ id: "e1", amount: 1500, date: "2026-05-10" })],
    });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({}),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("matched");
    expect(pushes).toHaveLength(0);
  });

  it("該当する支出がなければ notified で、通知グループへ push する", async () => {
    const storage = createTestStorage({ ledger: [] });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({
        tx: {
          amount: 1500,
          usedDate: "2026-05-10",
          merchant: "ＡＭＡＺＯＮ",
          cardLabel: "本会員",
        },
      }),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("notified");
    expect(pushes).toHaveLength(1);
    expect(pushes[0].to).toBe("G1");
    expect(pushes[0].message).toContain("ＡＭＡＺＯＮ");
    expect(pushes[0].message).toContain("1,500");
  });

  it("canParse が false なら ignored で、何もしない", async () => {
    const storage = createTestStorage({
      ledger: [makeSpending({ id: "e1" })],
    });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({ canParse: false }),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("ignored");
    expect(pushes).toHaveLength(0);
  });

  it("利用日 ±1 日の境界内の支出は matched", async () => {
    const storage = createTestStorage({
      ledger: [makeSpending({ id: "e1", amount: 1500, date: "2026-05-11" })],
    });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({
        tx: {
          amount: 1500,
          usedDate: "2026-05-10",
          merchant: "X",
          cardLabel: "本会員",
        },
      }),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    if (result.ok) expect(result.value).toBe("matched");
    expect(pushes).toHaveLength(0);
  });

  it("利用日 ±1 日の境界外の支出は notified", async () => {
    const storage = createTestStorage({
      ledger: [makeSpending({ id: "e1", amount: 1500, date: "2026-05-12" })],
    });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({
        tx: {
          amount: 1500,
          usedDate: "2026-05-10",
          merchant: "X",
          cardLabel: "本会員",
        },
      }),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    if (result.ok) expect(result.value).toBe("notified");
    expect(pushes).toHaveLength(1);
  });

  it("金額が一致しない支出は notified", async () => {
    const storage = createTestStorage({
      ledger: [makeSpending({ id: "e1", amount: 1499, date: "2026-05-10" })],
    });
    const { client, pushes } = fakeLineClient();

    const result = await notifyUnregisteredCardCharge(INPUT, {
      parser: fakeParser({}),
      storage,
      lineClient: client,
      notifyGroupId: "G1",
    });

    if (result.ok) expect(result.value).toBe("notified");
    expect(pushes).toHaveLength(1);
  });
});
