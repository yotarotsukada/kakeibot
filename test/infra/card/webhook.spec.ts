import { describe, expect, it } from "vitest";
import { ValidationError } from "~/domain/errors";
import {
  parseCardEmailPayload,
  verifyWebhookToken,
} from "~/infra/card/webhook";

describe("verifyWebhookToken", () => {
  it("正しい Bearer トークンなら true", () => {
    expect(verifyWebhookToken("Bearer secret-token", "secret-token")).toBe(
      true,
    );
  });

  it("トークンが一致しなければ false", () => {
    expect(verifyWebhookToken("Bearer wrong", "secret-token")).toBe(false);
  });

  it("Bearer プレフィックスがなければ false", () => {
    expect(verifyWebhookToken("secret-token", "secret-token")).toBe(false);
  });

  it("ヘッダが null なら false", () => {
    expect(verifyWebhookToken(null, "secret-token")).toBe(false);
  });
});

describe("parseCardEmailPayload", () => {
  it("妥当なペイロードを CardEmailInput に変換する", () => {
    const raw = JSON.stringify({
      from: "service@rakuten-card.co.jp",
      subject: "カード利用のお知らせ",
      html: "<p>本文</p>",
      gmailMessageId: "abc",
    });
    expect(parseCardEmailPayload(raw)).toEqual({
      from: "service@rakuten-card.co.jp",
      subject: "カード利用のお知らせ",
      html: "<p>本文</p>",
      gmailMessageId: "abc",
    });
  });

  it("gmailMessageId は省略可能", () => {
    const raw = JSON.stringify({
      from: "a@example.com",
      subject: "s",
      html: "h",
    });
    expect(parseCardEmailPayload(raw).gmailMessageId).toBeUndefined();
  });

  it("不正な JSON なら ValidationError", () => {
    expect(() => parseCardEmailPayload("not json")).toThrow(ValidationError);
  });

  it("必須フィールド欠落なら ValidationError", () => {
    expect(() => parseCardEmailPayload(JSON.stringify({ from: "a" }))).toThrow(
      ValidationError,
    );
  });
});
