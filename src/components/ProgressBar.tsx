/** Horizontal progress bar (challenges, model loading, city bars). */
export function ProgressBar({ value, color = 'var(--primary)', label }: { value: number; color?: string; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="h-full rounded-full transition-[width] duration-250 ease-out" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}
