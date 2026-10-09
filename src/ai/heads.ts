/**
 * Trained classifiers ("heads") that sit on top of MobileNet v2.
 *
 * scripts/training/train.mjs trains them on openly licensed photos and saves
 * them to /public/models/waste-head and /public/models/spot-head. Each head is
 * tiny (~20 KB) because it reuses the MobileNet model the app already has:
 * MobileNet turns a photo into 1,280 numbers ("features") and the head turns
 * those into a class (e.g. Wet / Dry / Hazardous / Not waste).
 */
import * as tf from '@tensorflow/tfjs';
import type { Prediction } from './loadModel';

export type HeadName = 'waste-head' | 'spot-head';

export interface Head {
  model: tf.LayersModel;
  labels: string[];
  /** Accuracy on held-out test photos, from training. */
  testAccuracy?: number;
}

const cache = new Map<HeadName, Promise<Head | null>>();

/** Load a head, or null if it hasn't been trained/installed. */
export function loadHead(name: HeadName): Promise<Head | null> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const meta = await fetch(`/models/${name}/metadata.json`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null);
      if (!meta?.labels) return null;
      const model = await tf.loadLayersModel(`/models/${name}/model.json`);
      return { model, labels: meta.labels as string[], testAccuracy: meta.testAccuracy };
    })();
    p.catch(() => cache.delete(name));
    cache.set(name, p);
  }
  return p;
}

/** Run a head on MobileNet features (shape [1, 1280]). */
export function runHead(head: Head, features: tf.Tensor): Prediction[] {
  const probs = tf.tidy(() => (head.model.predict(features) as tf.Tensor).dataSync());
  return head.labels.map((label, i) => ({ label, probability: probs[i] ?? 0 }));
}
