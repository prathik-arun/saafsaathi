/**
 * Badges (PRD 4.11). Each badge unlocks when a lifetime counter reaches a target.
 */
import type { UserDoc } from './types';

export interface BadgeDef {
  id: string;
  /** Lucide icon name, mapped in src/features/learn/BadgesGrid.tsx */
  icon: 'ScanLine' | 'Recycle' | 'MapPin' | 'Sparkles' | 'Flame' | 'Brain';
  progress: (u: Pick<UserDoc, 'stats' | 'streakDays'>) => number;
  target: number;
}

export const BADGES: BadgeDef[] = [
  { id: 'firstScan', icon: 'ScanLine', progress: (u) => u.stats.scans, target: 1 },
  { id: 'sortingPro', icon: 'Recycle', progress: (u) => u.stats.scans, target: 100 },
  { id: 'streetHero', icon: 'MapPin', progress: (u) => u.stats.reports, target: 10 },
  { id: 'cleanupChampion', icon: 'Sparkles', progress: (u) => u.stats.cleaned, target: 5 },
  { id: 'streak7', icon: 'Flame', progress: (u) => u.streakDays, target: 7 },
  { id: 'quizWhiz', icon: 'Brain', progress: (u) => u.stats.quizCorrect, target: 25 },
];

/** All badge ids this user has earned. */
export function earnedBadges(u: Pick<UserDoc, 'stats' | 'streakDays' | 'badges'>): string[] {
  const set = new Set(u.badges ?? []);
  for (const b of BADGES) if (b.progress(u) >= b.target) set.add(b.id);
  return [...set];
}
