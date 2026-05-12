type Variant = 1 | 2 | 3 | 4 | 5;

type Props = {
  variant: Variant;
  className?: string;
  size?: number;
};

// ---- Shared body ---------------------------------------------------------
//
// Head : wide flat ellipse (cx=12 cy=14 rx=10.5 ry=7.5)
// Ears : obtuse-ish triangles (tip angle ≈89° — just under a right angle,
//        giving "slightly sharp" feel). Base points sit on the ellipse edge.
//          Left  — M 4.5 8.8 L 7 4.5 L 10.5 6.6
//          Right — M 13.5 6.6 L 17 4.5 L 19.5 8.8
//        The tip leans slightly outward (x=7/17 vs base-center x=7.5/16.5),
//        which adds that kawaii forward-tilt. strokeLinejoin="round" on the
//        parent gives the faint, natural corner rounding requested.
// Whiskers: start at the cheek sides (x=7/17) and fan out to the viewBox
//           edge (x=0/24) — clearly poking past the face silhouette.

function CatBase() {
  return (
    <>
      {/* 横つぶれ楕円の頭 */}
      <ellipse cx="12" cy="14" rx="10.5" ry="7.5" />

      {/* 耳: 大胆な外側配置 + 高さアップ
           Left  base (3,10)→(9,6.8)  tip (5,2)  — outer base x=3, just 1.5u from face edge
           Right base (15,6.8)→(21,10) tip (19,2) — mirror */}
      <path d="M 3 10 L 5 2 L 9 6.8" />
      <path d="M 15 6.8 L 19 2 L 21 10" />

      {/* 鼻：小さな塗りつぶし楕円 */}
      <ellipse cx="12" cy="14.5" rx="1.5" ry="1" fill="currentColor" stroke="none" />

      {/* 口：ω 形（W字カーブ = 猫の口） */}
      <path d="M 9.5 17 Q 11 19.5 12 17.5 Q 13 19.5 14.5 17" />

      {/* ひげ：viewBox端まで扇形に広げ、顔の外へはっきり飛び出す */}
      <path d="M 7 14.2 L 0 12.8 M 7 15.8 L 0 17.2" strokeWidth={0.9} />
      <path d="M 17 14.2 L 24 12.8 M 17 15.8 L 24 17.2" strokeWidth={0.9} />
    </>
  );
}

// ---- 5種の目 (目だけ差し替え) -------------------------------------------

// 1. (= ω =)  横線目 ─ いちばんシンプルな顔文字にゃんこ
function EyesFlat() {
  return <path d="M 6.5 12 L 10 12 M 14 12 L 17.5 12" />;
}

// 2. (^ ω ^)  アーチ目 ─ うれしそう
function EyesArch() {
  return (
    <>
      <path d="M 6.5 12.5 Q 8.5 10.5 10.5 12.5" />
      <path d="M 13.5 12.5 Q 15.5 10.5 17.5 12.5" />
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

// 4. (• ω •)  まるまる目 ─ ふくふく感 MAX
function EyesDot() {
  return (
    <>
      <circle cx="9"  cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </>
  );
}

// 5. (• ω ˘)  ウィンク ─ 片目まるまる + 片目アーチで茶目っ気
function EyesWink() {
  return (
    <>
      <circle cx="9" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M 13.5 12.5 Q 15.5 10.5 17.5 12.5" />
    </>
  );
}

// ---- Main ----------------------------------------------------------------

const EYES = {
  1: EyesFlat,
  2: EyesArch,
  3: EyesAngle,
  4: EyesDot,
  5: EyesWink,
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
