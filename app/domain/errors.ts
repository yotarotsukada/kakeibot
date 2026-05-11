/**
 * アプリケーションエラー基底クラスとサブクラス。
 * 外部ライブラリへの依存禁止。
 *
 * - `message`: 開発者向けの内部文言（ログ出力前提）
 * - `userMessage`: エンドユーザー向けの優しい文言（トーストや画面に直接表示してよい）
 * - `code`: ハンドリング・分岐用の安定した識別子（i18n 鍵としても使える）
 */

export class AppError extends Error {
  /** ユーザーに見せるメッセージ。常にやさしい言い回しで。 */
  readonly userMessage: string;
  /** ハンドリング用識別子。 */
  readonly code: string;
  /** 元の例外（あれば）。 */
  readonly cause?: unknown;

  constructor(args: {
    message: string;
    userMessage: string;
    code: string;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = "AppError";
    this.code = args.code;
    this.userMessage = args.userMessage;
    this.cause = args.cause;
  }
}

/** LINE API 呼び出しの失敗。 */
export class LineApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({
      message,
      userMessage:
        "LINE への通信でエラーが発生しました。少し時間をおいてお試しください。",
      code: "LINE_API_ERROR",
      cause,
    });
    this.name = "LineApiError";
  }
}

/** Gemini API 呼び出しまたはレスポンスパースの失敗。 */
export class GeminiApiError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({
      message,
      userMessage: "レシート解析に失敗しました。もう一度お試しください。",
      code: "GEMINI_API_ERROR",
      cause,
    });
    this.name = "GeminiApiError";
  }
}

/** Google Sheets API 呼び出しの失敗。 */
export class GoogleSheetsError extends AppError {
  constructor(message: string, cause?: unknown) {
    super({
      message,
      userMessage:
        "データの保存・取得に失敗しました。少し時間をおいてお試しください。",
      code: "GOOGLE_SHEETS_ERROR",
      cause,
    });
    this.name = "GoogleSheetsError";
  }
}

/** 外部入力のスキーマバリデーション失敗。 */
export class ValidationError extends AppError {
  constructor(args: {
    message: string;
    userMessage?: string;
    cause?: unknown;
  }) {
    super({
      message: args.message,
      userMessage: args.userMessage ?? "入力内容に誤りがあります。",
      code: "VALIDATION_ERROR",
      cause: args.cause,
    });
    this.name = "ValidationError";
  }
}

/** ユーザーマスタに未登録のユーザー。 */
export class UnknownUserError extends AppError {
  constructor(userId: string) {
    super({
      message: `未登録のユーザー: ${userId}`,
      userMessage: "未登録のユーザーです。管理者に連絡してください。",
      code: "UNKNOWN_USER",
    });
    this.name = "UnknownUserError";
  }
}

/** ビジネスルール違反（ユーザー操作で回復可能）。 */
export class BusinessRuleError extends AppError {
  constructor(args: { message: string; userMessage: string; code?: string }) {
    super({
      message: args.message,
      userMessage: args.userMessage,
      code: args.code ?? "BUSINESS_RULE_VIOLATION",
    });
    this.name = "BusinessRuleError";
  }
}

/**
 * 不明なエラーを AppError でラップする。
 * features/ で「想定外のエラーをResultで返したい」場面で使う。
 */
export function wrapUnknownError(cause: unknown): AppError {
  if (cause instanceof AppError) return cause;
  return new AppError({
    message: cause instanceof Error ? cause.message : String(cause),
    userMessage:
      "予期しないエラーが発生しました。少し時間をおいてお試しください。",
    code: "UNKNOWN_ERROR",
    cause,
  });
}
