/**
 * "ふんわりパステル" カテゴリパレット。
 * 家族で楽しむ貯金のコンセプトに合わせ、明度高め・彩度ほどよくの柔らかい色味を採用。
 * 並べたときに調和し、淡くなりすぎず識別可能な範囲に収めている。
 */
export const CATEGORY_COLORS = [
  "oklch(0.72 0.10 230)", // sora 空
  "oklch(0.74 0.10 165)", // mint 若葉
  "oklch(0.74 0.10 295)", // lavender 藤
  "oklch(0.85 0.11 95)", // butter 卵
  "oklch(0.74 0.13 25)", // coral 珊瑚
  "oklch(0.78 0.10 200)", // aqua 水
  "oklch(0.78 0.11 60)", // apricot 杏
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

export function getCategoryColor(index: number): string {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
}

/** 予算超過時の警告色（やわらかいレッド、不必要に煽らない） */
export const OVER_BUDGET_COLOR = "oklch(0.66 0.15 25)";

/** 特別財布（旅行・家具など月をまたぐ目標予算）のアクセントカラー */
export const SPECIAL_WALLET_ACCENT_COLOR = CATEGORY_COLORS[2];
