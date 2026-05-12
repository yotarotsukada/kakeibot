/**
 * Action 失敗を JSON で返すための最小ヘルパ。
 *
 * 規約:
 *   - Action は失敗時のみ `actionError(appError)` を返す。成功時は以下の2パターン：
 *     A. ページ遷移を伴う操作（フォーム送信→別状態へ移動）: `redirect(...)` を返す
 *     B. ページ内インタラクション（useFetcher 経由）: `null` を返す
 *   - 成功トーストは出さない。視覚的変化（リダイレクトやローダー再実行）を feedback とする。
 *   - 画面側は `useActionErrorToast(actionData)` を呼ぶだけで自動でトーストが出る。
 */

import { useEffect, useRef } from "react";

import type { AppError } from "~/domain/errors";
import { toast } from "~/lib/toast-store";

export type ActionError = { error: string; code: string };

export function actionError(error: AppError): ActionError {
  return { error: error.userMessage, code: error.code };
}

/**
 * useActionData の戻り値を購読し、失敗したらトーストを出す。
 * 同じ送信に対して二重発火しないよう参照同一性で重複検知する。
 */
export function useActionErrorToast(
  actionData: ActionError | null | undefined,
) {
  const seen = useRef<ActionError | null | undefined>(undefined);

  useEffect(() => {
    if (actionData === seen.current) return;
    seen.current = actionData;
    if (actionData) toast.error(actionData.error);
  }, [actionData]);
}
