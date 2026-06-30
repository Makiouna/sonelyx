interface EquipmentIconProps {
  cat: string;
  size?: number;
  style?: React.CSSProperties;
  className?: string;
}

// Diffusion / Son — loudspeaker
function IconDiffusion() {
  return (
    <>
      <defs>
        <linearGradient id="gDiff" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#1e40af" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <radialGradient id="cDiff" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gDiff)" />
      <rect width="64" height="64" rx="16" fill="url(#cDiff)" />
      {/* Cabinet */}
      <rect x="14" y="10" width="36" height="44" rx="5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Woofer cone */}
      <circle cx="32" cy="32" r="12" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
      <circle cx="32" cy="32" r="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <circle cx="32" cy="32" r="1.5" fill="rgba(255,255,255,0.8)" />
      {/* Tweeter */}
      <circle cx="32" cy="14" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
      <circle cx="32" cy="14" r="1.2" fill="rgba(255,255,255,0.6)" />
      {/* Port */}
      <rect x="22" y="48" width="20" height="3" rx="1.5" fill="rgba(255,255,255,0.25)" />
    </>
  );
}

// Éclairage — PAR/spotlight
function IconEclairage() {
  return (
    <>
      <defs>
        <linearGradient id="gEcl" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <radialGradient id="beam" cx="50%" cy="90%" r="70%">
          <stop offset="0%" stopColor="rgba(255,230,80,0.35)" />
          <stop offset="100%" stopColor="rgba(255,230,80,0)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gEcl)" />
      <rect width="64" height="64" rx="16" fill="url(#beam)" />
      {/* Yoke arm */}
      <rect x="28" y="6" width="8" height="6" rx="2" fill="rgba(255,255,255,0.4)" />
      {/* PAR can body */}
      <path d="M18 16 L46 16 L42 46 L22 46 Z" fill="rgba(255,255,255,0.14)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Lens */}
      <ellipse cx="32" cy="16" rx="14" ry="4" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.4" />
      {/* Fresnel rings */}
      <ellipse cx="32" cy="16" rx="10" ry="2.8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <ellipse cx="32" cy="16" rx="6" ry="1.8" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      {/* Beam rays */}
      <path d="M22 46 L14 62" stroke="rgba(255,230,80,0.45)" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 46 L32 62" stroke="rgba(255,230,80,0.45)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M42 46 L50 62" stroke="rgba(255,230,80,0.45)" strokeWidth="2" strokeLinecap="round" />
    </>
  );
}

// Régie — mixer console
function IconRegie() {
  return (
    <>
      <defs>
        <linearGradient id="gReg" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f766e" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gReg)" />
      {/* Console body */}
      <rect x="8" y="16" width="48" height="34" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" />
      {/* Channel strips — 5 faders */}
      {[16, 24, 32, 40, 48].map((x) => (
        <g key={x}>
          {/* Fader track */}
          <rect x={x - 1.5} y="22" width="3" height="18" rx="1.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
          {/* Fader cap at varying heights */}
          <rect x={x - 4} y={22 + ((x - 16) / 32) * 12} width="8" height="5" rx="2" fill="rgba(255,255,255,0.7)" />
          {/* Knob above */}
          <circle cx={x} cy="44" r="2.5" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.4)" strokeWidth="0.8" />
        </g>
      ))}
      {/* LED strip */}
      {[12, 20, 28, 36, 44, 52].map((x) => (
        <circle key={x} cx={x} cy="19" r="1.2" fill={x === 44 ? 'rgba(255,80,80,0.9)' : 'rgba(80,255,140,0.7)'} />
      ))}
      {/* Screen */}
      <rect x="10" y="20" width="10" height="6" rx="1.5" fill="rgba(0,255,150,0.2)" stroke="rgba(0,255,150,0.4)" strokeWidth="0.8" />
    </>
  );
}

// Structure — truss
function IconStructure() {
  return (
    <>
      <defs>
        <linearGradient id="gStr" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#374151" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gStr)" />
      {/* Top rail */}
      <rect x="8" y="16" width="48" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* Bottom rail */}
      <rect x="8" y="44" width="48" height="4" rx="2" fill="rgba(255,255,255,0.5)" />
      {/* Verticals */}
      <rect x="8" y="16" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.4)" />
      <rect x="53" y="16" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.4)" />
      {/* Diagonal braces */}
      <line x1="11" y1="20" x2="25" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="20" x2="11" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="25" y1="20" x2="39" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="39" y1="20" x2="25" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="39" y1="20" x2="53" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="53" y1="20" x2="39" y2="44" stroke="rgba(255,255,255,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      {/* Mid verticals */}
      <rect x="23.5" y="16" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.25)" />
      <rect x="37.5" y="16" width="3" height="32" rx="1.5" fill="rgba(255,255,255,0.25)" />
    </>
  );
}

// Énergie — generator / lightning
function IconEnergie() {
  return (
    <>
      <defs>
        <linearGradient id="gEne" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#713f12" />
          <stop offset="100%" stopColor="#a16207" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(253,224,71,0.3)" />
          <stop offset="100%" stopColor="rgba(253,224,71,0)" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gEne)" />
      <rect width="64" height="64" rx="16" fill="url(#glow)" />
      {/* Generator box */}
      <rect x="10" y="28" width="44" height="26" rx="5" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.4" />
      {/* Panel details */}
      <circle cx="20" cy="38" r="4" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
      <circle cx="20" cy="38" r="1.5" fill="rgba(255,200,0,0.7)" />
      <rect x="28" y="34" width="20" height="8" rx="2" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" />
      <rect x="30" y="36" width="6" height="4" rx="1" fill="rgba(80,255,120,0.5)" />
      {/* Exhaust */}
      <rect x="48" y="32" width="4" height="3" rx="1" fill="rgba(255,255,255,0.3)" />
      {/* Wheels */}
      <circle cx="18" cy="55" r="3.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      <circle cx="46" cy="55" r="3.5" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
      {/* Lightning bolt */}
      <path d="M34 8 L28 22 L33 22 L29 36 L40 18 L34.5 18 Z" fill="rgba(253,224,71,0.9)" stroke="rgba(253,224,71,0.5)" strokeWidth="0.5" />
    </>
  );
}

// Generic fallback — gear/equipment
function IconGeneric() {
  return (
    <>
      <defs>
        <linearGradient id="gGen" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6b7280" />
          <stop offset="100%" stopColor="#4b5563" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#gGen)" />
      {/* Gear teeth */}
      <circle cx="32" cy="32" r="14" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2.5" strokeDasharray="4 3" />
      <circle cx="32" cy="32" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" />
      <circle cx="32" cy="32" r="3" fill="rgba(255,255,255,0.7)" />
      {/* Bolts/details */}
      {[0, 60, 120, 180, 240, 300].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const bx = 32 + 18 * Math.cos(rad);
        const by = 32 + 18 * Math.sin(rad);
        return <circle key={deg} cx={bx} cy={by} r="2.2" fill="rgba(255,255,255,0.4)" />;
      })}
    </>
  );
}

const CAT_MAP: Record<string, () => JSX.Element> = {
  diffusion: IconDiffusion,
  eclairage: IconEclairage,
  regie: IconRegie,
  structure: IconStructure,
  energie: IconEnergie,
};

export default function EquipmentIcon({ cat, size = 64, style, className }: EquipmentIconProps) {
  const Icon = CAT_MAP[cat?.toLowerCase()] ?? IconGeneric;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <Icon />
    </svg>
  );
}
