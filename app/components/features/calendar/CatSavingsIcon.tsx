type Variant = 1 | 2 | 3 | 4 | 5;

type Props = {
  variant: Variant;
  className?: string;
  size?: number;
};

// ---- Face variants -------------------------------------------------------

// にっこり: filled dot eyes + inverted-V nose + gentle U-smile
function Happy() {
  return (
    <>
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M 11.2 14.8 L 12 14 L 12.8 14.8" />
      <path d="M 9.5 16.5 Q 12 18.5 14.5 16.5" />
    </>
  );
}

// えへへ: closed-crescent eyes (squinting from happiness) + wide smile + blush
function Laughing() {
  return (
    <>
      <path d="M 8 12.5 Q 9 11 10 12.5" />
      <path d="M 14 12.5 Q 15 11 16 12.5" />
      <path d="M 9 16.5 Q 12 19.5 15 16.5" />
      <path d="M 6.5 15 L 8 15" strokeWidth={1} />
      <path d="M 16 15 L 17.5 15" strokeWidth={1} />
    </>
  );
}

// きらっ: plus-sign sparkle eyes + excited wide smile
function Sparkle() {
  return (
    <>
      <path d="M 9 10 L 9 14 M 7 12 L 11 12" />
      <path d="M 15 10 L 15 14 M 13 12 L 17 12" />
      <path d="M 8.5 17 Q 12 20 15.5 17" />
    </>
  );
}

// ほわほわ: tilde/wavy eyes + blush dots + small content smile
function Blissful() {
  return (
    <>
      <path d="M 7.5 12.5 Q 8.5 11 9.5 12.5 Q 10.5 14 11.5 12.5" />
      <path d="M 12.5 12.5 Q 13.5 11 14.5 12.5 Q 15.5 14 16.5 12.5" />
      <circle cx="7" cy="15.5" r="0.8" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="8.5" cy="16.2" r="0.8" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="17" cy="15.5" r="0.8" fill="currentColor" stroke="none" opacity={0.4} />
      <circle cx="15.5" cy="16.2" r="0.8" fill="currentColor" stroke="none" opacity={0.4} />
      <path d="M 10.5 17.5 Q 12 18.5 13.5 17.5" />
    </>
  );
}

// にこっ: one dot eye + one arch wink + nose + smile
function Wink() {
  return (
    <>
      <circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <path d="M 13 12 Q 14.5 10.5 16 12" />
      <path d="M 11.2 14.8 L 12 14 L 12.8 14.8" />
      <path d="M 9.5 16.5 Q 12 18.5 14.5 16.5" />
    </>
  );
}

// ---- Main component -------------------------------------------------------

const FACES = {
  1: Happy,
  2: Laughing,
  3: Sparkle,
  4: Blissful,
  5: Wink,
} as const;

export function CatSavingsIcon({ variant, className, size = 14 }: Props) {
  const Face = FACES[variant];
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
      {/* Head */}
      <circle cx="12" cy="13.5" r="8" />
      {/* Ears — base points lie on the head circle */}
      <path d="M 5.1 9.5 L 3 2 L 8 6.6" />
      <path d="M 16 6.6 L 21 2 L 18.9 9.5" />
      {/* Expression */}
      <Face />
    </svg>
  );
}
