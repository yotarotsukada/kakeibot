import type { Storage } from "~/domain/storage";
import { GoogleSheetsStorage } from "~/infra/google/sheets-storage";
import { MockStorage } from "~/infra/google/sheets-storage.mock";

// モックはViteプロセス内でシングルトンとして扱い、リクエスト間でデータを保持する
let _mockStorage: MockStorage | null = null;

export function createStorage(env: Env): Storage {
  if (env.USE_MOCK_STORAGE === "true") {
    _mockStorage ??= new MockStorage();
    return _mockStorage;
  }
  return new GoogleSheetsStorage(
    env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    env.GOOGLE_PRIVATE_KEY,
    env.SPREADSHEET_ID,
  );
}
