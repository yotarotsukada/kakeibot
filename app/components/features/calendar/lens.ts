import type { LedgerEntryWithId } from "~/domain/storage";

/**
 * カテゴリレンズ上の「未分類」を表すキー。
 * ダッシュボードの未分類行（予算カテゴリに紐付かない支出）と同じ集合を指す。
 */
export const UNCATEGORIZED_KEY = "";

/**
 * 元帳エントリをカテゴリレンズのキーに射影する。
 * - 月次財布の支出で予算カテゴリに属する → カテゴリ名
 * - それ以外の支出（予算外カテゴリ・不明財布）→ 未分類
 * - 特別財布の支出・入金 → null（カテゴリレンズの対象外）
 *
 * 特別財布をレンズ対象外にすることで、ダッシュボードの「未分類」（月次財布のみ集計）と
 * 集合を揃え、明細ドット（EntryRow）の色分けとも整合させる。
 */
export function spendingLensKey(
  entry: LedgerEntryWithId,
  monthlyWalletName: string,
  specialWalletNames: string[],
  categories: string[],
): string | null {
  if (entry.type !== "支出") return null;
  if (specialWalletNames.includes(entry.wallet)) return null;
  if (
    entry.wallet === monthlyWalletName &&
    categories.includes(entry.category)
  ) {
    return entry.category;
  }
  return UNCATEGORIZED_KEY;
}
