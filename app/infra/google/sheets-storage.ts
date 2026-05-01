/**
 * Google Sheets ストレージ実装。
 * エラーは GoogleSheetsError でラップする。
 */

import { importPKCS8, SignJWT } from "jose";
import { GoogleSheetsError } from "~/domain/errors";
import type { LedgerEntry } from "~/domain/ledger/entry";
import type { Storage } from "~/domain/storage";
import { SHEET_NAMES } from "~/domain/storage";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleSheetsStorage implements Storage {
  constructor(
    private readonly serviceAccountEmail: string,
    private readonly privateKey: string,
    private readonly spreadsheetId: string,
  ) {}

  async initialize(): Promise<void> {}

  async appendLedgerEntries(entries: LedgerEntry[]): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.LEDGER}!A1`;
      const rows = entries.map((e) => [
        generateTransactionId(),
        e.date,
        e.type,
        e.amount,
        e.actor,
        e.category,
        e.wallet,
        e.shouldSettle ? "TRUE" : "FALSE",
        e.memo,
      ]);

      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ range, majorDimension: "ROWS", values: rows }),
      });
      if (!res.ok) {
        throw new Error(
          `Sheets append failed: ${res.status} ${await res.text()}`,
        );
      }
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("元帳への追記に失敗しました", err);
    }
  }

  async findActorByLineUserId(lineUserId: string): Promise<string | null> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.USER_MASTER}!A:B`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;

      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return null;
      for (let i = 1; i < data.values.length; i++) {
        if (data.values[i][0] === lineUserId) return data.values[i][1] ?? null;
      }
      return null;
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("ユーザーマスタの検索に失敗しました", err);
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const key = await importPKCS8(this.privateKey, "RS256");
      const now = Math.floor(Date.now() / 1000);
      const jwt = await new SignJWT({ scope: SHEETS_SCOPE })
        .setProtectedHeader({ alg: "RS256", typ: "JWT" })
        .setIssuer(this.serviceAccountEmail)
        .setAudience(TOKEN_ENDPOINT)
        .setIssuedAt(now)
        .setExpirationTime(now + 3600)
        .sign(key);

      const res = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });
      if (!res.ok) {
        throw new Error(
          `Google auth failed: ${res.status} ${await res.text()}`,
        );
      }
      return ((await res.json()) as { access_token: string }).access_token;
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("Google 認証に失敗しました", err);
    }
  }
}

function generateTransactionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
