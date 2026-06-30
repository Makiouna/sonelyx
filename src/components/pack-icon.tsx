interface PackIconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export default function PackIcon({ size = 64, className, style }: PackIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <defs>
        <linearGradient id="packBg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
        <linearGradient id="packShine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width="64" height="64" rx="16" fill="url(#packBg)" />
      <rect width="64" height="32" rx="0" fill="url(#packShine)" />
      <rect width="64" height="16" rx="0" fill="url(#packShine)" />
      <rect width="64" height="16" rx="16" ry="0" fill="url(#packShine)" />

      {/* Back-left box */}
      <rect
        x="7" y="31" width="22" height="22" rx="5"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      {/* Lid line for back-left */}
      <line x1="7" y1="38" x2="29" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <line x1="18" y1="31" x2="18" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

      {/* Back-right box */}
      <rect
        x="35" y="31" width="22" height="22" rx="5"
        fill="rgba(255,255,255,0.08)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      {/* Lid line for back-right */}
      <line x1="35" y1="38" x2="57" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />
      <line x1="46" y1="31" x2="46" y2="38" stroke="rgba(255,255,255,0.25)" strokeWidth="1.2" />

      {/* Front center box */}
      <rect
        x="16" y="19" width="32" height="30" rx="6"
        fill="rgba(255,255,255,0.18)"
        stroke="rgba(255,255,255,0.75)"
        strokeWidth="1.8"
      />
      {/* Lid line for front box */}
      <line x1="16" y1="28" x2="48" y2="28" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" />
      {/* Ribbon vertical */}
      <line x1="32" y1="19" x2="32" y2="28" stroke="rgba(255,255,255,0.75)" strokeWidth="1.8" />

      {/* Bow / knot on ribbon */}
      {/* Left wing */}
      <path
        d="M32 16 C28 13 24 14 25 17 C26 19 30 18 32 16Z"
        fill="white"
        opacity="0.9"
      />
      {/* Right wing */}
      <path
        d="M32 16 C36 13 40 14 39 17 C38 19 34 18 32 16Z"
        fill="white"
        opacity="0.9"
      />
      {/* Center knot */}
      <circle cx="32" cy="16" r="2.2" fill="white" />

      {/* "KIT" label at the bottom of front box */}
      <text
        x="32" y="44"
        textAnchor="middle"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
        fill="rgba(255,255,255,0.9)"
        letterSpacing="1.2"
      >
        PACK
      </text>
    </svg>
  );
}
