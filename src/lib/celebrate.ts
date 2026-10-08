/** Short confetti burst when points are earned. Respects "reduce motion". */
import confetti from 'canvas-confetti';
import { tokenValue } from './cities';

export function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function celebrate() {
  if (prefersReducedMotion()) return;
  confetti({
    particleCount: 60,
    spread: 70,
    startVelocity: 35,
    ticks: 120,
    origin: { y: 0.7 },
    colors: ['--primary', '--accent', '--wet', '--dry'].map(tokenValue),
    disableForReducedMotion: true,
  });
}
