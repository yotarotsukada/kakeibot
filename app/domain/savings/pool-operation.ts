/**
 * 貯金プール操作ドメイン型。
 * 元帳（入金/支出）とは別の専用シートで管理する。
 *
 * 設計: docs/spec/savings.md §pool
 */

/**
 * 貯金プールへの操作。
 * - 積立: プールへの追加（積立・初期残高・精算返却）
 * - 配分: プールからの使用（特別財布への割当）
 * amount は常に正。方向（追加 or 使用）は type で表現する。
 */
export interface PoolOperation {
  date: string;
  type: "積立" | "配分";
  amount: number;
  actor: string;
  memo: string;
}

export type PoolOperationWithId = PoolOperation & { id: string };
