/**
 * Map marker icons drawn as small SVGs (no image files needed):
 *  Open = filled amber circle, Verified = orange circle with a tick,
 *  Cleaned = green circle with a sparkle (PRD Section 3).
 */
import L from 'leaflet';
import type { ReportStatus } from '../../lib/types';

const SYMBOL: Record<ReportStatus, string> = {
  open: '',
  verified: '<path d="M9 14.5l3.5 3.5L19 11" stroke="white" stroke-width="2.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
  cleaned: '<path d="M14 8l1.6 4.4L20 14l-4.4 1.6L14 20l-1.6-4.4L8 14l4.4-1.6z" fill="white"/>',
};

export function statusIcon(status: ReportStatus): L.DivIcon {
  return L.divIcon({
    className: 'ss-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `<svg width="28" height="28" viewBox="0 0 28 28" role="img" aria-label="${status}">
      <circle cx="14" cy="14" r="12" fill="var(--status-${status})" stroke="var(--surface)" stroke-width="3"/>${SYMBOL[status]}</svg>`,
  });
}

/** The draggable / preview pin for a new report. */
export const pinIcon = L.divIcon({
  className: 'ss-marker',
  iconSize: [36, 46],
  iconAnchor: [18, 44],
  html: `<svg width="36" height="46" viewBox="0 0 36 46" aria-hidden="true">
    <path d="M18 44s16-15 16-27A16 16 0 0 0 2 17c0 12 16 27 16 27z" fill="var(--accent)" stroke="var(--surface)" stroke-width="3"/>
    <circle cx="18" cy="17" r="6" fill="white"/></svg>`,
});

/** Blue dot for "my location" (shown only on screen, never stored). */
export const meIcon = L.divIcon({
  className: 'ss-marker',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: '<svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" fill="var(--dry)" stroke="white" stroke-width="3"/></svg>',
});

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
