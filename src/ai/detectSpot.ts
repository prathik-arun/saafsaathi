/**
 * Model B: Spot Detector (PRD Section 5).
 * Classes: Garbage dump, Overflowing bin, Blocked drain, Clean area.
 * Engines, best first: the student's Teachable Machine model in
 * /public/models/spot-detector/, then MobileNet + the spot head trained by
 * scripts/training, then the colour-only placeholder.
 * Used to suggest a report's type and severity, and to check that an
 * "after" photo really looks clean before a spot is marked cleaned.
 */
import type { ReportType, Severity } from '../lib/types';
import { loadModel, predict, type Prediction } from './loadModel';
import { loadBuiltinModel, runBase } from './imagenetWaste';
import { loadHead, runHead } from './heads';

/** An "after" photo must score Clean area at least this high. */
export const CLEAN_THRESHOLD = 0.6;

export interface SpotResult {
  /** Best guess among the messy classes (never "clean"). */
  type: ReportType;
  /** Confidence of that guess, 0..1. */
  confidence: number;
  severity: Severity;
  /** Score of the "Clean area" class, 0..1. */
  cleanScore: number;
}

function labelToKind(label: string): ReportType | 'clean' | null {
  const l = label.toLowerCase();
  if (l.includes('clean')) return 'clean';
  if (l.includes('dump')) return 'dump';
  if (l.includes('bin')) return 'bin';
  if (l.includes('drain')) return 'drain';
  if (l.includes('litter')) return 'littering';
  return null;
}

/** Severity rule: over 85% = High, 65-85% = Medium, under 65% = Low. */
export function severityFromConfidence(c: number): Severity {
  if (c > 0.85) return 'high';
  if (c >= 0.65) return 'medium';
  return 'low';
}

type Source = HTMLImageElement | HTMLCanvasElement;

export interface SpotModel {
  kind: 'teachable' | 'pretrained' | 'placeholder';
  detect: (source: Source) => SpotResult;
}

let spotModel: Promise<SpotModel> | null = null;

/** Load the best spot model that is installed (see the engines above). */
export function loadSpotModel(): Promise<SpotModel> {
  if (!spotModel) {
    spotModel = (async (): Promise<SpotModel> => {
      const meta = await fetch('/models/spot-detector/metadata.json')
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (meta && !meta.placeholder) {
        const m = await loadModel('spot-detector');
        return { kind: 'teachable', detect: (src) => scoresToSpot(predict(m, src)) };
      }
      const head = await loadHead('spot-head').catch(() => null);
      if (head) {
        const base = await loadBuiltinModel();
        return {
          kind: 'pretrained',
          detect: (src) => {
            const { features } = runBase(base, src);
            const result = scoresToSpot(runHead(head, features));
            features.dispose();
            return result;
          },
        };
      }
      const m = await loadModel('spot-detector');
      return { kind: 'placeholder', detect: (src) => scoresToSpot(predict(m, src)) };
    })();
    spotModel.catch(() => (spotModel = null));
  }
  return spotModel;
}

export function detectSpot(m: SpotModel, source: Source): SpotResult {
  return m.detect(source);
}

function scoresToSpot(predictions: Prediction[]): SpotResult {
  let cleanScore = 0;
  let best: { type: ReportType; p: number } = { type: 'other', p: 0 };
  for (const { label, probability } of predictions) {
    const kind = labelToKind(label);
    if (kind === 'clean') cleanScore += probability;
    else if (kind && probability > best.p) best = { type: kind, p: probability };
  }
  return { type: best.type, confidence: best.p, severity: severityFromConfidence(best.p), cleanScore };
}
