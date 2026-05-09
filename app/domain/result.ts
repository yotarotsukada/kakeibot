/**
 * Result 型: 成功・失敗を値として表現する。
 *
 * 規約:
 *   - features/ レイヤの mutation/query は throw せずに Result を返す。
 *   - infra/ レイヤは引き続き AppError を throw する。features 内で catch して Result 化する。
 *   - 想定外のエラー（プログラミングエラー）は throw のまま素通しする。
 */

import type { AppError } from "./errors";

export type Result<T, E = AppError> = Success<T> | Failure<E>;

export type Success<T> = { readonly ok: true; readonly value: T };
export type Failure<E> = { readonly ok: false; readonly error: E };

export const ok = <T>(value: T): Success<T> => ({ ok: true, value });
export const err = <E>(error: E): Failure<E> => ({ ok: false, error });

/**
 * Result を「成功なら値、失敗なら throw」で剥がす。
 *
 * loader での利用を想定:
 *   const data = unwrap(await getBudgetPageData(...));
 *   → 失敗時は AppError が throw され、ErrorBoundary に到達する。
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}
