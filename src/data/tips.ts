/**
 * Disposal tips lookup (PRD Section 5): category -> tip, common items -> tip,
 * in English, Hindi and Kannada. Data lives in tips.json.
 */
import data from './tips.json';
import type { Lang, WasteLabel } from '../lib/types';
import { istDate } from '../lib/time';

type L = Record<Lang, string>;
const categories = data.categories as Record<WasteLabel, L>;
const items = data.items as Record<string, L & { tip: L }>;

/** Tip for an item if we know it, otherwise for its category. */
export function disposalTip(category: WasteLabel, item: string | undefined, lang: Lang): string {
  const known = item ? items[item.toLowerCase()] : undefined;
  return (known?.tip ?? categories[category])[lang];
}

/** Translated item name, e.g. "Banana peel" -> "केले का छिलका". */
export function itemName(item: string, lang: Lang): string {
  return items[item.toLowerCase()]?.[lang] ?? item;
}

/** The same tip for everyone on a given day. */
export function tipOfTheDay(lang: Lang): string {
  const day = Math.floor(Date.parse(istDate()) / 86400000);
  return (data.daily as L[])[day % data.daily.length][lang];
}
