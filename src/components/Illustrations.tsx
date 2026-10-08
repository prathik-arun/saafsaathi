/**
 * Simple line illustrations for onboarding and empty states.
 * Drawn with SVG strokes in the theme colours so they work in dark mode.
 */
const stroke = { fill: 'none', strokeWidth: 3, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** Three bins: wet (green), dry (blue), hazardous (red). */
export function BinsIllustration() {
  const bin = (x: number, color: string) => (
    <g stroke={color} {...stroke}>
      <rect x={x} y="60" width="56" height="80" rx="8" />
      <path d={`M${x - 6} 52h68`} />
      <path d={`M${x + 20} 52v-8h16v8`} />
    </g>
  );
  return (
    <svg viewBox="0 0 240 170" className="h-44 w-auto" aria-hidden>
      {bin(16, 'var(--wet)')}
      {bin(92, 'var(--dry)')}
      {bin(168, 'var(--hazardous)')}
      <path d="M36 92c8-14 20-14 16 4" stroke="var(--wet)" {...stroke} />
      <rect x="108" y="84" width="24" height="28" rx="3" stroke="var(--dry)" {...stroke} />
      <path d="M196 84l12 22h-24z" stroke="var(--hazardous)" {...stroke} />
    </svg>
  );
}

/** A map with a pin. */
export function MapIllustration() {
  return (
    <svg viewBox="0 0 240 170" className="h-44 w-auto" aria-hidden>
      <path d="M20 40l60-20 80 20 60-20v120l-60 20-80-20-60 20z" stroke="var(--primary)" {...stroke} />
      <path d="M80 20v120M160 40v120" stroke="var(--border)" {...stroke} />
      <path d="M120 112s-28-26-28-46a28 28 0 0 1 56 0c0 20-28 46-28 46z" stroke="var(--accent)" {...stroke} />
      <circle cx="120" cy="66" r="9" stroke="var(--accent)" {...stroke} />
    </svg>
  );
}

/** A podium with a trophy. */
export function LeaderboardIllustration() {
  return (
    <svg viewBox="0 0 240 170" className="h-44 w-auto" aria-hidden>
      <rect x="30" y="100" width="56" height="50" rx="6" stroke="var(--city-2)" {...stroke} />
      <rect x="92" y="70" width="56" height="80" rx="6" stroke="var(--city-1)" {...stroke} />
      <rect x="154" y="116" width="56" height="34" rx="6" stroke="var(--city-4)" {...stroke} />
      <path d="M106 30h28v14a14 14 0 0 1-28 0zM106 36h-8a8 8 0 0 0 8 10M134 36h8a8 8 0 0 1-8 10M120 58v8" stroke="var(--accent)" {...stroke} />
    </svg>
  );
}

/** Generic empty box for empty lists. */
export function EmptyIllustration() {
  return (
    <svg viewBox="0 0 160 120" className="h-28 w-auto" aria-hidden>
      <path d="M30 50l50-22 50 22v44l-50 22-50-22z" stroke="var(--text-muted)" {...stroke} />
      <path d="M30 50l50 22 50-22M80 72v44" stroke="var(--text-muted)" {...stroke} />
      <path d="M58 20l-6-10M80 16V4M102 20l6-10" stroke="var(--primary)" {...stroke} />
    </svg>
  );
}
