/**
 * Hotspots (PRD Section 5): group reports from the last 30 days into
 * ~150 m grid cells (geohash precision 7). A cell with 3 or more reports
 * is a hotspot.
 */
import { geohashCenter } from '../../lib/geo';
import { toDate } from '../../lib/format';
import { daysAgo } from '../../lib/time';
import type { ReportDoc } from '../../lib/types';

export const HOTSPOT_MIN_REPORTS = 3;

export interface Hotspot {
  geohash: string;
  lat: number;
  lng: number;
  count: number;
}

export function findHotspots(reports: ReportDoc[]): Hotspot[] {
  const since = daysAgo(30).getTime();
  const counts = new Map<string, number>();
  for (const r of reports) {
    const at = toDate(r.createdAt)?.getTime() ?? Date.now(); // pending writes have no time yet
    if (at < since || !r.geohash) continue;
    const cell = r.geohash.slice(0, 7);
    counts.set(cell, (counts.get(cell) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, n]) => n >= HOTSPOT_MIN_REPORTS)
    .map(([geohash, count]) => ({ geohash, count, ...geohashCenter(geohash) }));
}
