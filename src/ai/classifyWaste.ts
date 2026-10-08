/**
 * Model A: Waste Sorter (PRD Section 5).
 * Turns the model's raw label scores into Wet / Dry / Hazardous / Not waste.
 *
 * Labels can be just the category ("Wet") or category + item
 * ("Wet - Banana peel"). Item-level labels are grouped by category, and the
 * best item becomes the "item guess" shown in the result sheet.
 */
import type { WasteLabel } from '../lib/types';
import { loadModel, predict, type LoadedModel } from './loadModel';

/** At or above this confidence we show the result; below it, the user picks. */
export const CONFIDENCE_THRESHOLD = 0.7;

export interface WasteResult {
  category: WasteLabel;
  confidence: number;
  /** e.g. "Banana peel" when the model has item-level labels. */
  item?: string;
  scores: Record<WasteLabel, number>;
}

/** Map a model label to our category, e.g. "Hazardous - Battery" -> hazardous. */
export function labelToCategory(label: string): WasteLabel | null {
  const l = label.toLowerCase().trim();
  if (l.startsWith('wet')) return 'wet';
  if (l.startsWith('dry')) return 'dry';
  if (l.startsWith('haz')) return 'hazardous';
  if (l.startsWith('not')) return 'notwaste';
  return null;
}

export function loadWasteModel(onProgress?: (f: number) => void): Promise<LoadedModel> {
  return loadModel('waste-sorter', onProgress);
}

/** Classify one image or video frame. Fast enough to call ~5 times a second. */
export function classifyWaste(m: LoadedModel, source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): WasteResult {
  const scores: Record<WasteLabel, number> = { wet: 0, dry: 0, hazardous: 0, notwaste: 0 };
  const bestItem: Partial<Record<WasteLabel, { name: string; p: number }>> = {};

  for (const { label, probability } of predict(m, source)) {
    const cat = labelToCategory(label);
    if (!cat) continue;
    scores[cat] += probability;
    const item = label.split(/\s+-\s+/)[1];
    if (item && probability > (bestItem[cat]?.p ?? 0)) bestItem[cat] = { name: item, p: probability };
  }

  const category = (Object.keys(scores) as WasteLabel[]).reduce((a, b) => (scores[b] > scores[a] ? b : a));
  return { category, confidence: scores[category], item: bestItem[category]?.name, scores };
}
