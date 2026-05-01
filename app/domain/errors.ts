/**
 * アプリケーションエラー基底クラスとサブクラス。
 * 外部ライブラリへの依存禁止。
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }
}

/** LINE API 呼び出しの失敗。 */
export class LineApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "LINE_API_ERROR", cause);
    this.name = "LineApiError";
  }
}

/** Gemini API 呼び出しまたはレスポンスパースの失敗。 */
export class GeminiApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "GEMINI_API_ERROR", cause);
    this.name = "GeminiApiError";
  }
}

/** Google Sheets API 呼び出しの失敗。 */
export class GoogleSheetsError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "GOOGLE_SHEETS_ERROR", cause);
    this.name = "GoogleSheetsError";
  }
}

/** 外部入力のスキーマバリデーション失敗。 */
export class ValidationError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "VALIDATION_ERROR", cause);
    this.name = "ValidationError";
  }
}

/** ユーザーマスタに未登録のユーザー。 */
export class UnknownUserError extends AppError {
  constructor(userId: string) {
    super(`未登録のユーザー: ${userId}`, "UNKNOWN_USER");
    this.name = "UnknownUserError";
  }
}
