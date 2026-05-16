/**
 * 貯金・残高推移ドメインの型定義。
 *
 * 「貯金」= 月次財布の 予算合計 − 支出合計（節約できた金額）。
 * 「累計残高」= 全期間の 入金合計 − 支出合計 の累計。
 */

export type MonthlyBalanceData = {
  yearMonth: string;
  /** その月の全入金合計（全財布）。累計残高の計算に使う。 */
  totalIncome: number;
  /** その月の全支出合計（全財布）。累計残高の計算に使う。 */
  totalSpending: number;
  /** その月の通常財布の支出合計。貯金額の基準。 */
  normalWalletSpending: number;
  /** その月の通常財布の予算合計。 */
  totalBudget: number;
  /** 予算 − 通常財布支出。負のときは予算超過。 */
  savedAmount: number;
  /** この月までの累計純収支（全入金 − 全支出 の累積）。 */
  cumulativeBalance: number;
};

export type SavingsData = {
  months: MonthlyBalanceData[];
  /** 表示期間内の貯金額（savedAmount > 0 の月のみ）の合計。 */
  totalSavedAmount: number;
};
