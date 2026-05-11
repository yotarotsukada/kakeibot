/**
 * 全ページ共通のラッパー。
 *
 * デザイン意図:
 *   - max-w-md（448px）でモバイル最適化、左右 px-5 で少しゆとりのある余白
 *   - pt-7 / pb-8 で上下にしっかり呼吸を作る → 余白で家計簿らしい静けさを演出
 *   - space-y-5 で各セクション間に一定のリズムを与える
 */
export function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto px-5 pt-7 pb-8 space-y-5">{children}</div>
  );
}
