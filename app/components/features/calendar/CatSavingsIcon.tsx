type Variant = 1 | 2 | 3 | 4 | 5;

type Props = {
  variant: Variant;
  className?: string;
  size?: number;
};

// ---- Shared parts --------------------------------------------------------
// Head: chubby circle (cx=12 cy=13 r=9). Ear base points lie exactly on it.
// Left ear base: (5.5, 6.8) and (9.5, 4.3) — both ~r=9 from center.
// Right ear base: mirror at (14.5, 4.3) and (18.5, 6.8).

function CatBase() {
  return (
    <>
      {/* Chubby round head */}
      <circle cx="12" cy="13" r="9" />
      {/* Ears */}
      <path d="M 5.5 6.8 L 4 1.5 L 9.5 4.3" />
      <path d="M 14.5 4.3 L 20 1.5 L 18.5 6.8" />
      {/* Nose: small filled oval */}
      <ellipse
        cx="12"
        cy="14.5"
        rx="1.3"
        ry="0.9"
        fill="currentColor"
        stroke="none"
      />
      {/* Mouth: ω-shape (W = cat lip) */}
      <path d="M 9.5 16.5 Q 11 19 12 17 Q 13 19 14.5 16.5" />
      {/* Whiskers — thinner strokes */}
      <path
        d="M 7.5 14.2 L 2.5 13.2 M 7.5 15.8 L 2.5 16.8"
        strokeWidth={0.9}
      />
      <path
        d="M 16.5 14.2 L 21.5 13.2 M 16.5 15.8 L 21.5 16.8"
        strokeWidth={0.9}
      />
    </>
  );
}

// ---- Face variants (eyes only) -------------------------------------------

// 1. (= ω =)  横線目 — 最もシンプルな顔文字にゃんこ
function EyesFlat() {
  return <path d="M 7 12 L 10.5 12 M 13.5 12 L 17 12" />;
}

// 2. (^ ω ^)  アーチ目 + ほっぺ — うれしそう
function EyesArch() {
  return (
    <>
      <path d="M 7.5 13 Q 9 10.5 10.5 13" />
      <path d="M 13.5 13 Q 15 10.5 16.5 13" />
      <circle cx="7" cy="16" r="1.1" fill="currentColor" stroke="none" opacity={0.35} />
      <circle cx="17" cy="16" r="1.1" fill="currentColor" stroke="none" opacity={0.35} />
    </>
  );
}

// 3. (> ω <)  とんがり目 — テンション高め
function EyesAngle() {
  return (
    <>
      <path d="M 7 11.5 L 10 12.5 L 7 13.5" />
      <path d="M 17 11.5 L 14 12.5 L 17 13.5" />
    </>
  );
}

// 4. (• ω •)  まるまる目 + たっぷりほっぺ — ふくふく感MAX
function EyesDot() {
  return (
    <>
      <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="7"   cy="16.5" r="1.1" fill="currentColor" stroke="none" opacity={0.35} />
      <circle cx="8.3" cy="17.5" r="0.8" fill="currentColor" stroke="none" opacity={0.25} />
      <circle cx="17"  cy="16.5" r="1.1" fill="currentColor" stroke="none" opacity={0.35} />
      <circle cx="15.7" cy="17.5" r="0.8" fill="currentColor" stroke="none" opacity={0.25} />
    </>
  );
}

// 5. (≧ ω ≦)  大アーチ目 — 感激・大喜び
function EyesBigArch() {
  return (
    <>
      <path d="M 7 14 Q 9 8.5 11 14" />
      <path d="M 13 14 Q 15 8.5 17 14" />
    </>
  );
}

// ---- Main component -------------------------------------------------------

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
