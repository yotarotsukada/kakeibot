type Props = {
  className?: string;
  size?: number;
};

export function CatSavingsIcon({ className, size = 16 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
    >
      {/* シルエット：耳を先に描き、頭の楕円が耳のベースを自然に覆う */}
      <path d="M 3 10 L 5 2 L 9 6.8" fill="currentColor" />
      <path d="M 15 6.8 L 19 2 L 21 10" fill="currentColor" />
      <ellipse cx="12" cy="14" rx="10.5" ry="7.5" fill="currentColor" />

      {/* 顔パーツ（白抜き） */}
      <circle cx="9"  cy="12" r="1.6" fill="white" />
      <circle cx="15" cy="12" r="1.6" fill="white" />
      <ellipse cx="12" cy="14.5" rx="1.2" ry="0.8" fill="white" />
      <path
        d="M 9.5 17 Q 11 19.5 12 17.5 Q 13 19.5 14.5 17"
        fill="none"
        stroke="white"
        strokeWidth={1.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ひげ（白抜き） */}
      <path
        d="M 7 14.2 L 0 12.8 M 7 15.8 L 0 17.2"
        fill="none"
        stroke="white"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
      <path
        d="M 17 14.2 L 24 12.8 M 17 15.8 L 24 17.2"
        fill="none"
        stroke="white"
        strokeWidth={0.9}
        strokeLinecap="round"
      />
    </svg>
  );
}
