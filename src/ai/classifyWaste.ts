/**
 * Model A: Waste Sorter (PRD Section 5).
 * Turns a model's label scores into Wet / Dry / Hazardous / Not waste.
 *
 * Engines, picked automatically by loadWasteModel(), best first:
 *  - "teachable": the student's Teachable Machine model in /public/models/waste-sorter/
 *  - "pretrained": MobileNet + the waste head trained by scripts/training (src/ai/heads.ts)
 *  - "builtin": MobileNet with a hand-made ImageNet-to-waste mapping (src/ai/imagenetWaste.ts)
 *
 * Labels can be just the category ("Wet") or category + item
 * ("Wet - Banana peel"). Item-level labels are grouped by category, and the
 * best item becomes the "item guess" shown in the result sheet.
 */
import type { WasteLabel } from '../lib/types';
import { loadModel, predict, type LoadedModel, type Prediction } from './loadModel';
import { classifyBuiltin, loadBuiltinModel, mapImagenet, runBase } from './imagenetWaste';
import { CONFIDENCE_THRESHOLD, combineOpinions } from './combine';

export { CONFIDENCE_THRESHOLD };
import { loadHead, runHead } from './heads';


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

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

export interface WasteModel {
  kind: 'teachable' | 'pretrained' | 'builtin';
  /** Classify one image or video frame. Fast enough to call ~5 times a second. */
  classify: (source: Source) => WasteResult;
}

let wasteModel: Promise<WasteModel> | null = null;

/** Load the best waste model that is installed (see the engines above). */
export function loadWasteModel(onProgress?: (f: number) => void): Promise<WasteModel> {
  if (!wasteModel) {
    wasteModel = (async (): Promise<WasteModel> => {
      const meta = await fetch('/models/waste-sorter/metadata.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (meta && !meta.placeholder) {
        const m = await loadModel('waste-sorter', onProgress);
        return { kind: 'teachable', classify: (src) => classifyTrained(m, src) };
      }
      const [b, head] = await Promise.all([loadBuiltinModel(onProgress), loadHead('waste-head').catch(() => null)]);
      if (!head) return { kind: 'builtin', classify: (src) => classifyBuiltin(b, src) };
      return {
        kind: 'pretrained',
        classify: (src) => {
          // One MobileNet pass gives two opinions (see combineOpinions).
          const { features, probs } = runBase(b, src);
          const trained = scoresToResult(runHead(head, features));
          features.dispose();
          return combineOpinions(trained, mapImagenet(b, probs));
        },
      };
    })();
    wasteModel.catch(() => (wasteModel = null));
  }
  return wasteModel;
}

/** Teachable Machine model: add up the label scores per category. */
function classifyTrained(m: LoadedModel, source: Source): WasteResult {
  return scoresToResult(predict(m, source));
}

/** Turn per-label scores into a category, its confidence and (for "Wet - Banana peel" labels) an item. */
function scoresToResult(predictions: Prediction[]): WasteResult {
  const scores: Record<WasteLabel, number> = { wet: 0, dry: 0, hazardous: 0, notwaste: 0 };
  const bestItem: Partial<Record<WasteLabel, { name: string; p: number }>> = {};

  for (const { label, probability } of predictions) {
    const cat = labelToCategory(label);
    if (!cat) continue;
    scores[cat] += probability;
    const item = label.split(/\s+-\s+/)[1];
    if (item && probability > (bestItem[cat]?.p ?? 0)) bestItem[cat] = { name: item, p: probability };
  }

  const category = (Object.keys(scores) as WasteLabel[]).reduce((a, b) => (scores[b] > scores[a] ? b : a));
  return { category, confidence: scores[category], item: bestItem[category]?.name, scores };
}
