/**
 * Points badge: accent-soft pill with a Sparkles icon and "+20".
 * With `animate`, the number rolls up from 0 (skipped for "reduce motion").
 */
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { prefersReducedMotion } from '../lib/celebrate';

export function PointsBadge({ points, animate, prefix = '+' }: { points: number; animate?: boolean; prefix?: string }) {
  const value = useRollUp(points, animate);
  return (
    <span className="inline-flex h-8 items-center gap-1 rounded-full bg-accent-soft px-3 t-small font-semibold text-accent-text">
      <Sparkles className="h-4 w-4" aria-hidden />
      {prefix}
      {value.toLocaleString('en-IN')}
    </span>
  );
}

/** Count up from 0 to `target` over ~600 ms. */
export function useRollUp(target: number, animate = true): number {
  const [value, setValue] = useState(animate && !prefersReducedMotion() ? 0 : target);
  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setValue(target);
      return;
    }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 600);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, animate]);
  return value;
}
