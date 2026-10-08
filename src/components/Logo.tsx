/** SaafSaathi logo: a leaf inside a speech bubble. */
export function Logo({ size = 64, bubble = 'var(--surface)', leaf = 'var(--primary)' }: { size?: number; bubble?: string; leaf?: string }) {
  return (
    <svg width={size} height={size} viewBox="96 80 320 360" aria-hidden>
      <path d="M116 136a40 40 0 0 1 40-40h200a40 40 0 0 1 40 40v176a40 40 0 0 1-40 40H236l-72 64v-64h-8a40 40 0 0 1-40-40z" fill={bubble} />
      <path d="M196 300c-6-70 34-130 130-142-4 90-50 140-118 142" fill={leaf} />
      <path d="M200 300c22-40 52-72 92-96" stroke={bubble} strokeWidth="12" strokeLinecap="round" fill="none" />
    </svg>
  );
}
