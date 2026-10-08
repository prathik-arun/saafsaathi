/** Formatting helpers: "2 days ago", short dates, numbers. */
import type { Timestamp } from 'firebase/firestore';
import { currentLanguage } from './i18n';

const LOCALES = { en: 'en-IN', hi: 'hi-IN', kn: 'kn-IN' } as const;

export function locale(): string {
  return LOCALES[currentLanguage()] ?? 'en-IN';
}

export function toDate(ts: Timestamp | Date | null | undefined): Date | null {
  if (!ts) return null;
  return ts instanceof Date ? ts : ts.toDate();
}

/** "2 days ago", "5 minutes ago", ... in the user's language. */
export function timeAgo(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts);
  if (!d) return '';
  const rtf = new Intl.RelativeTimeFormat(locale(), { numeric: 'auto' });
  const sec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(sec, 'second');
  if (abs < 3600) return rtf.format(Math.round(sec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(sec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(sec / 86400), 'day');
  return rtf.format(Math.round(sec / (86400 * 30)), 'month');
}

export function shortDate(ts: Timestamp | Date | null | undefined): string {
  const d = toDate(ts);
  return d ? d.toLocaleDateString(locale(), { day: 'numeric', month: 'short' }) : '';
}

export function num(n: number): string {
  return n.toLocaleString('en-IN');
}
