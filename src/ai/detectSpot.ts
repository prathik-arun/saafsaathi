/**
 * Model B: Spot Detector (PRD Section 5).
 * Classes: Garbage dump, Overflowing bin, Blocked drain, Clean area.
 * Used to suggest a report's type and severity, and to check that an
 * "after" photo really looks clean before a spot is marked cleaned.
 */
import type { ReportType, Severity } from '../lib/types';
import { loadModel, predict, type LoadedModel } from './loadModel';

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

export function loadSpotModel(): Promise<LoadedModel> {
  return loadModel('spot-detector');
}

export function detectSpot(m: LoadedModel, source: HTMLImageElement | HTMLCanvasElement): SpotResult {
  let cleanScore = 0;
  let best: { type: ReportType; p: number } = { type: 'other', p: 0 };
  for (const { label, probability } of predict(m, source)) {
    const kind = labelToKind(label);
    if (kind === 'clean') cleanScore += probability;
    else if (kind && probability > best.p) best = { type: kind, p: probability };
  }
  return { type: best.type, confidence: best.p, severity: severityFromConfidence(best.p), cleanScore };
}
