type Variant = 1 | 2 | 3 | 4 | 5;

type Props = {
  variant: Variant;
  className?: string;
  size?: number;
};

// ---- Shared body ---------------------------------------------------------
//
// Head: wide flat ellipse (cx=12 cy=14 rx=10.5 ry=7.5)
//   → よこつぶれた輪郭
// Ears: cubic-bezier arches — 鈍角のゆるい丸み耳
//   Left : M 6 7.8 C 5 1 11 1 10 6.6
//   Right: M 14 6.6 C 13 1 19 1 18 7.8
//   Both base-points lie ≈ on the ellipse edge.

function CatBase() {
  return (
    <>
      {/* 横つぶれ楕円の頭 */}
      <ellipse cx="12" cy="14" rx="10.5" ry="7.5" />

      {/* 鈍角・丸み耳（cubic bezier で滑らかなアーチ） */}
      <path d="M 6 7.8 C 5 1 11 1 10 6.6" />
      <path d="M 14 6.6 C 13 1 19 1 18 7.8" />

      {/* 鼻：小さな塗りつぶし楕円 */}
      <ellipse cx="12" cy="14.5" rx="1.5" ry="1" fill="currentColor" stroke="none" />

      {/* 口：ω 形（W字カーブ = 猫の口） */}
      <path d="M 9.5 17 Q 11 19.5 12 17.5 Q 13 19.5 14.5 17" />

      {/* ひげ：細い線 */}
      <path d="M 7.5 14.5 L 2.5 13.5 M 7.5 16 L 2.5 17" strokeWidth={0.9} />
      <path d="M 16.5 14.5 L 21.5 13.5 M 16.5 16 L 21.5 17" strokeWidth={0.9} />
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
