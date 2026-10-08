/**
 * Display info for categories, report types, statuses and Houses:
 * colour token + icon + translation key. Category and status are never
 * shown by colour alone; they always come with an icon and a word.
 */
import {
  Ban,
  BadgeCheck,
  CircleDot,
  Droplets,
  Leaf,
  MapPin,
  Package,
  Sparkles,
  Trash2,
  TriangleAlert,
  Wind,
  type LucideIcon,
} from 'lucide-react';
import type { ReportStatus, ReportType, Severity, WasteLabel } from '../lib/types';

export const CATEGORY_META: Record<WasteLabel, { color: string; soft: string; Icon: LucideIcon; key: string }> = {
  wet: { color: 'var(--wet)', soft: 'var(--wet-soft)', Icon: Leaf, key: 'category.wet' },
  dry: { color: 'var(--dry)', soft: 'var(--dry-soft)', Icon: Package, key: 'category.dry' },
  hazardous: { color: 'var(--hazardous)', soft: 'var(--hazardous-soft)', Icon: TriangleAlert, key: 'category.hazardous' },
  notwaste: { color: 'var(--notwaste)', soft: 'var(--notwaste-soft)', Icon: Ban, key: 'category.notwaste' },
};

export const REPORT_TYPE_META: Record<ReportType, { Icon: LucideIcon; key: string }> = {
  dump: { Icon: Trash2, key: 'reportType.dump' },
  bin: { Icon: Package, key: 'reportType.bin' },
  drain: { Icon: Droplets, key: 'reportType.drain' },
  littering: { Icon: Wind, key: 'reportType.littering' },
  other: { Icon: MapPin, key: 'reportType.other' },
};

export const STATUS_META: Record<ReportStatus, { color: string; Icon: LucideIcon; key: string }> = {
  open: { color: 'var(--status-open)', Icon: CircleDot, key: 'status.open' },
  verified: { color: 'var(--status-verified)', Icon: BadgeCheck, key: 'status.verified' },
  cleaned: { color: 'var(--status-cleaned)', Icon: Sparkles, key: 'status.cleaned' },
};

export const SEVERITY_META: Record<Severity, { color: string; key: string }> = {
  low: { color: 'var(--success)', key: 'severity.low' },
  medium: { color: 'var(--warning)', key: 'severity.medium' },
  high: { color: 'var(--error)', key: 'severity.high' },
};

/** A soft tint of any colour that also works in dark mode. */
export function softOf(color: string, pct = 16): string {
  return `color-mix(in srgb, ${color} ${pct}%, var(--surface))`;
}
