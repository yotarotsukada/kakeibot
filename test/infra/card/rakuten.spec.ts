import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CardEmailInput } from "~/domain/card/email-parser";
import { ValidationError } from "~/domain/errors";
import { RakutenCardEmailParser } from "~/infra/card/rakuten";

function loadFixture(name: string): string {
  return readFileSync(join(process.cwd(), "test/fixtures/card", name), "utf-8");
}

function makeInput(overrides: Partial<CardEmailInput> = {}): CardEmailInput {
  return {
    from: "service@rakuten-card.co.jp",
    subject: "【楽天カード】カード利用のお知らせ(本人ご利用分)",
    html: "",
    ...overrides,
  };
}

describe("RakutenCardEmailParser", () => {
  const parser = new RakutenCardEmailParser();

  describe("canParse", () => {
    it("楽天カードの送信元なら true", () => {
      expect(parser.canParse(makeInput())).toBe(true);
    });

    it("件名が楽天カードの利用通知なら true", () => {
      expect(
        parser.canParse(
          makeInput({
            from: "noreply@example.com",
            subject: "【楽天カード】カード利用のお知らせ(本人ご利用分)",
          }),
        ),
      ).toBe(true);
    });

    it("無関係なメールなら false", () => {
      expect(
        parser.canParse(
          makeInput({ from: "noreply@example.com", subject: "ニュースレター" }),
        ),
      ).toBe(false);
    });
  });

  describe("parse", () => {
    it("本会員カードの速報メールを解析する", () => {
      const tx = parser.parse(
        makeInput({ html: loadFixture("rakuten-honnin.html") }),
      );
      expect(tx).toEqual({
        amount: 1500,
        usedDate: "2026-05-25",
        merchant: "ＡＭＡＺＯＮ．ＣＯ．ＪＰ",
        cardLabel: "本会員",
      });
    });

    it("家族カードの速報メールを解析し、cardLabel を家族にする", () => {
      const tx = parser.parse(
        makeInput({
          subject: "【楽天カード】カード利用のお知らせ(家族ご利用分)",
          html: loadFixture("rakuten-kazoku.html"),
        }),
      );
      expect(tx).toEqual({
        amount: 680,
        usedDate: "2026-05-24",
        merchant: "ＳＴＡＲＢＵＣＫＳ",
        cardLabel: "家族",
      });
    });

    it("解析できない HTML なら ValidationError を throw する", () => {
      expect(() =>
        parser.parse(makeInput({ html: "<p>関係のない本文</p>" })),
      ).toThrow(ValidationError);
    });
  });
});
