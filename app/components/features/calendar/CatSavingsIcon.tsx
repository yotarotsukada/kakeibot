type Variant = 1 | 2 | 3 | 4 | 5;

type Props = {
  variant: Variant;
  className?: string;
  size?: number;
};

// ---- Shared body ---------------------------------------------------------
//
// Head : wide flat ellipse (cx=12 cy=14 rx=10.5 ry=7.5)
// Ears : obtuse triangle (tip angle ≈102°); base-points sit on the ellipse edge.
//   Left  — M 5.5 8.2 L 8.5 5 L 11 6.5
//   Right — M 13 6.5 L 15.5 5 L 18.5 8.2
//   strokeLinejoin="round" (on the parent svg) gives the slight natural rounding.
// Whiskers: extended to x=1 / x=23 so they clearly poke out past the face.

function CatBase() {
  return (
    <>
      {/* 横つぶれ楕円の頭 */}
      <ellipse cx="12" cy="14" rx="10.5" ry="7.5" />

      {/* 鈍角三角形の耳（頂角≈102°、strokeLinejoin=round で頂点ほんのり丸め） */}
      <path d="M 5.5 8.2 L 8.5 5 L 11 6.5" />
      <path d="M 13 6.5 L 15.5 5 L 18.5 8.2" />

      {/* 鼻：小さな塗りつぶし楕円 */}
      <ellipse cx="12" cy="14.5" rx="1.5" ry="1" fill="currentColor" stroke="none" />

      {/* 口：ω 形（W字カーブ = 猫の口） */}
      <path d="M 9.5 17 Q 11 19.5 12 17.5 Q 13 19.5 14.5 17" />

      {/* ひげ：顔の外まで伸ばして猫らしさを強調 */}
      <path d="M 8 14.2 L 1 13 M 8 16 L 1 17" strokeWidth={0.9} />
      <path d="M 16 14.2 L 23 13 M 16 16 L 23 17" strokeWidth={0.9} />
    </>
  );
}

// ---- 5種の目 (目だけ差し替え) -------------------------------------------

// 1. (= ω =)  横線目 ─ いちばんシンプルな顔文字にゃんこ
function EyesFlat() {
  return <path d="M 6.5 12 L 10 12 M 14 12 L 17.5 12" />;
}

// 2. (^ ω ^)  アーチ目 + ほっぺ ─ うれしそう
function EyesArch() {
  return (
    <>
      <path d="M 6.5 13 Q 8.5 10.5 10.5 13" />
      <path d="M 13.5 13 Q 15.5 10.5 17.5 13" />
      <circle cx="6.2"  cy="16.8" r="1.3" fill="currentColor" stroke="none" opacity={0.28} />
      <circle cx="17.8" cy="16.8" r="1.3" fill="currentColor" stroke="none" opacity={0.28} />
    </>
  );
}

// 3. (> ω <)  とんがり目 ─ テンション高め・元気いっぱい
function EyesAngle() {
  return (
    <>
      <path d="M 6.5 11.5 L 10 12.5 L 6.5 13.5" />
      <path d="M 17.5 11.5 L 14 12.5 L 17.5 13.5" />
    </>
  );
}

// 4. (• ω •)  まるまる目 + たっぷりほっぺ ─ ふくふく感 MAX
function EyesDot() {
  return (
    <>
      <circle cx="9"  cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
      {/* ほっぺ（2重の薄いドット） */}
      <circle cx="6.2"  cy="16.5" r="1.3" fill="currentColor" stroke="none" opacity={0.28} />
      <circle cx="7.5"  cy="17.6" r="0.9" fill="currentColor" stroke="none" opacity={0.18} />
      <circle cx="17.8" cy="16.5" r="1.3" fill="currentColor" stroke="none" opacity={0.28} />
      <circle cx="16.5" cy="17.6" r="0.9" fill="currentColor" stroke="none" opacity={0.18} />
    </>
  );
}

// 5. (≧ω≦)  大アーチ目 ─ 感激・大喜び
function EyesBigArch() {
  return (
    <>
      <path d="M 6.5 14 Q 8.5 8.5 10.5 14" />
      <path d="M 13.5 14 Q 15.5 8.5 17.5 14" />
    </>
  );
}

// ---- Main ----------------------------------------------------------------

const EYES = {
  1: EyesFlat,
  2: EyesArch,
  3: EyesAngle,
  4: EyesDot,
  5: EyesBigArch,
} as const;

export function CatSavingsIcon({ variant, className, size = 16 }: Props) {
  const Eyes = EYES[variant];
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <CatBase />
      <Eyes />
    </svg>
  );
}
