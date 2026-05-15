/**
 * Google Sheets ストレージ実装。
 * エラーは GoogleSheetsError でラップする。
 */

import { importPKCS8, SignJWT } from "jose";
import type { BudgetRecord, Wallet } from "~/domain/budget/budget";
import { GoogleSheetsError } from "~/domain/errors";
import type { LedgerEntry } from "~/domain/ledger/entry";
import type { LedgerEntryWithId, Storage, User } from "~/domain/storage";
import { SHEET_NAMES } from "~/domain/storage";

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

export class GoogleSheetsStorage implements Storage {
  private _cachedToken: { token: string; expiresAt: number } | null = null;

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

  async getBudgetRecords(walletName: string): Promise<BudgetRecord[]> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.BUDGET}!A:C`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return [];
      return data.values
        .slice(1)
        .filter((row) => row[0] === walletName)
        .map((row) => ({
          walletName: row[0],
          categoryName: row[1],
          amount: Number(row[2]) || 0,
        }));
    } catch (err) {
      throw new GoogleSheetsError("予算記録の取得に失敗しました", err);
    }
  }

  async upsertBudgetRecord(record: BudgetRecord): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.BUDGET}!A:C`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex(
        (row) => row[0] === record.walletName && row[1] === record.categoryName,
      );

      const cellValues = [
        record.walletName,
        record.categoryName,
        record.amount,
      ];

      if (rowIdx === -1) {
        const appendRange = `${SHEET_NAMES.BUDGET}!A1`;
        const appendUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        const appendRes = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: appendRange,
            majorDimension: "ROWS",
            values: [cellValues],
          }),
        });
        if (!appendRes.ok)
          throw new Error(
            `Sheets append failed: ${appendRes.status} ${await appendRes.text()}`,
          );
      } else {
        const updateRange = `${SHEET_NAMES.BUDGET}!A${rowIdx + 1}:C${rowIdx + 1}`;
        const updateUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: updateRange,
            majorDimension: "ROWS",
            values: [cellValues],
          }),
        });
        if (!updateRes.ok)
          throw new Error(
            `Sheets update failed: ${updateRes.status} ${await updateRes.text()}`,
          );
      }
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("予算記録の更新に失敗しました", err);
    }
  }

  async deleteBudgetRecord(
    walletName: string,
    categoryName: string,
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();

      const range = `${SHEET_NAMES.BUDGET}!A:C`;
      const readUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const readRes = await fetch(readUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!readRes.ok) throw new Error(`Sheets read failed: ${readRes.status}`);
      const data = (await readRes.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex(
        (row) => row[0] === walletName && row[1] === categoryName,
      );
      if (rowIdx === -1) return;

      const metaUrl = `${SHEETS_BASE}/${this.spreadsheetId}?fields=sheets.properties`;
      const metaRes = await fetch(metaUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!metaRes.ok)
        throw new Error(`Sheets metadata failed: ${metaRes.status}`);
      const meta = (await metaRes.json()) as {
        sheets: { properties: { sheetId: number; title: string } }[];
      };
      const sheet = meta.sheets.find(
        (s) => s.properties.title === SHEET_NAMES.BUDGET,
      );
      if (!sheet)
        throw new Error(`シート "${SHEET_NAMES.BUDGET}" が見つかりません`);

      const batchUrl = `${SHEETS_BASE}/${this.spreadsheetId}:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: "ROWS",
                  startIndex: rowIdx,
                  endIndex: rowIdx + 1,
                },
              },
            },
          ],
        }),
      });
      if (!batchRes.ok)
        throw new Error(
          `Sheets delete failed: ${batchRes.status} ${await batchRes.text()}`,
        );
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("予算記録の削除に失敗しました", err);
    }
  }

  async getWallets(): Promise<Wallet[]> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.WALLET_MASTER}!A:C`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return [];
      return data.values
        .slice(1)
        .filter((row) => row[0] && (row[1] === "月次" || row[1] === "特別"))
        .map((row) => ({
          name: row[0],
          type: row[1] as "月次" | "特別",
          settled: row[1] === "特別" ? row[2] === "TRUE" : false,
        }));
    } catch (err) {
      throw new GoogleSheetsError("財布マスタの取得に失敗しました", err);
    }
  }

  async upsertWallet(wallet: Wallet): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.WALLET_MASTER}!A:C`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex((row) => row[0] === wallet.name);

      const cellValues = [
        wallet.name,
        wallet.type,
        wallet.settled ? "TRUE" : "FALSE",
      ];

      if (rowIdx === -1) {
        const appendRange = `${SHEET_NAMES.WALLET_MASTER}!A1`;
        const appendUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(appendRange)}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;
        const appendRes = await fetch(appendUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: appendRange,
            majorDimension: "ROWS",
            values: [cellValues],
          }),
        });
        if (!appendRes.ok)
          throw new Error(
            `Sheets append failed: ${appendRes.status} ${await appendRes.text()}`,
          );
      } else {
        const updateRange = `${SHEET_NAMES.WALLET_MASTER}!A${rowIdx + 1}:C${rowIdx + 1}`;
        const updateUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(updateRange)}?valueInputOption=USER_ENTERED`;
        const updateRes = await fetch(updateUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            range: updateRange,
            majorDimension: "ROWS",
            values: [cellValues],
          }),
        });
        if (!updateRes.ok)
          throw new Error(
            `Sheets update failed: ${updateRes.status} ${await updateRes.text()}`,
          );
      }
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("財布マスタの更新に失敗しました", err);
    }
  }

  async setWalletSettled(walletName: string, settled: boolean): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.WALLET_MASTER}!A:A`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex((row) => row[0] === walletName);
      if (rowIdx === -1) throw new Error(`財布が見つかりません: ${walletName}`);

      const cellRange = `${SHEET_NAMES.WALLET_MASTER}!C${rowIdx + 1}`;
      const updateUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
      const updateRes = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: cellRange,
          majorDimension: "ROWS",
          values: [[settled ? "TRUE" : "FALSE"]],
        }),
      });
      if (!updateRes.ok)
        throw new Error(
          `Sheets update failed: ${updateRes.status} ${await updateRes.text()}`,
        );
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("精算フラグの更新に失敗しました", err);
    }
  }

  async renameWallet(oldName: string, newName: string): Promise<void> {
    try {
      const token = await this.getAccessToken();

      const [walletData, budgetData, ledgerData] = await Promise.all([
        fetch(
          `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAMES.WALLET_MASTER}!A:A`)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ).then((r) => r.json() as Promise<{ values?: string[][] }>),
        fetch(
          `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAMES.BUDGET}!A:A`)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ).then((r) => r.json() as Promise<{ values?: string[][] }>),
        fetch(
          `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(`${SHEET_NAMES.LEDGER}!G:G`)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        ).then((r) => r.json() as Promise<{ values?: string[][] }>),
      ]);

      const updates: { range: string; values: string[][] }[] = [];

      for (let i = 1; i < (walletData.values?.length ?? 0); i++) {
        if (walletData.values?.[i]?.[0] === oldName) {
          updates.push({
            range: `${SHEET_NAMES.WALLET_MASTER}!A${i + 1}`,
            values: [[newName]],
          });
          break;
        }
      }

      for (let i = 1; i < (budgetData.values?.length ?? 0); i++) {
        if (budgetData.values?.[i]?.[0] === oldName) {
          updates.push({
            range: `${SHEET_NAMES.BUDGET}!A${i + 1}`,
            values: [[newName]],
          });
        }
      }

      for (let i = 1; i < (ledgerData.values?.length ?? 0); i++) {
        if (ledgerData.values?.[i]?.[0] === oldName) {
          updates.push({
            range: `${SHEET_NAMES.LEDGER}!G${i + 1}`,
            values: [[newName]],
          });
        }
      }

      if (updates.length === 0) return;

      const batchUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: updates.map((u) => ({
            range: u.range,
            majorDimension: "ROWS",
            values: u.values,
          })),
        }),
      });
      if (!batchRes.ok)
        throw new Error(
          `Sheets batch update failed: ${batchRes.status} ${await batchRes.text()}`,
        );
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("財布名の変更に失敗しました", err);
    }
  }

  async getLedgerEntriesByWallet(walletName: string): Promise<LedgerEntry[]> {
    const entries = await this.getLedgerEntriesForCalendar(walletName);
    return entries.map(({ id: _id, ...entry }) => entry);
  }

  async getLatestLedgerEntry(): Promise<{
    walletName: string;
    date: string;
  } | null> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.LEDGER}!B:G`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values || data.values.length <= 1) return null;
      const rows = data.values.slice(1).filter((row) => row[0] && row[5]);
      if (rows.length === 0) return null;
      const latest = rows.reduce((prev, cur) =>
        cur[0] > prev[0] ? cur : prev,
      );
      return { walletName: latest[5], date: latest[0] };
    } catch (err) {
      throw new GoogleSheetsError("最新明細の取得に失敗しました", err);
    }
  }

  async getLedgerEntriesForCalendar(
    walletName: string,
  ): Promise<LedgerEntryWithId[]> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.LEDGER}!A:I`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return [];
      return data.values
        .slice(1)
        .filter((row) => row[6] === walletName)
        .map((row) => ({
          id: row[0],
          date: row[1],
          type: row[2] as "入金" | "支出",
          amount: Number(row[3]) || 0,
          actor: row[4],
          category: row[5],
          wallet: row[6],
          shouldSettle: row[7] === "TRUE",
          memo: row[8] ?? "",
        }));
    } catch (err) {
      throw new GoogleSheetsError("元帳の取得に失敗しました", err);
    }
  }

  async updateLedgerEntryCategory(
    entryId: string,
    categoryName: string,
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const idsRange = `${SHEET_NAMES.LEDGER}!A:A`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(idsRange)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex((row) => row[0] === entryId);
      if (rowIdx === -1)
        throw new Error(`元帳エントリが見つかりません: ${entryId}`);

      const cellRange = `${SHEET_NAMES.LEDGER}!F${rowIdx + 1}`;
      const updateUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(cellRange)}?valueInputOption=USER_ENTERED`;
      const updateRes = await fetch(updateUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          range: cellRange,
          majorDimension: "ROWS",
          values: [[categoryName]],
        }),
      });
      if (!updateRes.ok)
        throw new Error(
          `Sheets update failed: ${updateRes.status} ${await updateRes.text()}`,
        );
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("カテゴリの更新に失敗しました", err);
    }
  }

  async getLedgerEntriesByMonth(
    yearMonth: string,
  ): Promise<LedgerEntryWithId[]> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.LEDGER}!A:I`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return [];
      return data.values
        .slice(1)
        .filter((row) => row[1]?.startsWith(yearMonth))
        .map((row) => ({
          id: row[0],
          date: row[1],
          type: row[2] as "入金" | "支出",
          amount: Number(row[3]) || 0,
          actor: row[4],
          category: row[5],
          wallet: row[6],
          shouldSettle: row[7] === "TRUE",
          memo: row[8] ?? "",
        }));
    } catch (err) {
      throw new GoogleSheetsError("元帳の取得に失敗しました", err);
    }
  }

  async updateLedgerEntryAttribution(
    entryId: string,
    walletName: string,
    categoryName: string,
  ): Promise<void> {
    try {
      const token = await this.getAccessToken();
      const idsRange = `${SHEET_NAMES.LEDGER}!A:A`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(idsRange)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Sheets read failed: ${res.status}`);
      const data = (await res.json()) as { values?: string[][] };
      const rows = data.values ?? [];
      const rowIdx = rows.findIndex((row) => row[0] === entryId);
      if (rowIdx === -1)
        throw new Error(`元帳エントリが見つかりません: ${entryId}`);

      const n = rowIdx + 1;
      const batchUrl = `${SHEETS_BASE}/${this.spreadsheetId}/values:batchUpdate`;
      const batchRes = await fetch(batchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          valueInputOption: "USER_ENTERED",
          data: [
            {
              range: `${SHEET_NAMES.LEDGER}!F${n}`,
              majorDimension: "ROWS",
              values: [[categoryName]],
            },
            {
              range: `${SHEET_NAMES.LEDGER}!G${n}`,
              majorDimension: "ROWS",
              values: [[walletName]],
            },
          ],
        }),
      });
      if (!batchRes.ok)
        throw new Error(
          `Sheets batch update failed: ${batchRes.status} ${await batchRes.text()}`,
        );
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("アトリビューションの更新に失敗しました", err);
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

  async getUsers(): Promise<User[]> {
    try {
      const token = await this.getAccessToken();
      const range = `${SHEET_NAMES.USER_MASTER}!A:B`;
      const url = `${SHEETS_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      const data = (await res.json()) as { values?: string[][] };
      if (!data.values) return [];
      return data.values
        .slice(1)
        .filter((row) => row[0] && row[1])
        .map((row) => ({ lineUserId: row[0], name: row[1] }));
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("ユーザーマスタの取得に失敗しました", err);
    }
  }

  private async getAccessToken(): Promise<string> {
    try {
      const now = Math.floor(Date.now() / 1000);
      if (this._cachedToken && this._cachedToken.expiresAt > now + 60) {
        return this._cachedToken.token;
      }

      const key = await importPKCS8(this.privateKey, "RS256");
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
      const token = ((await res.json()) as { access_token: string })
        .access_token;
      this._cachedToken = { token, expiresAt: now + 3600 };
      return token;
    } catch (err) {
      if (err instanceof GoogleSheetsError) throw err;
      throw new GoogleSheetsError("Google 認証に失敗しました", err);
    }
  }
}

function generateTransactionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
