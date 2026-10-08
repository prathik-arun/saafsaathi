/**
 * Loads a Google Teachable Machine image model from /public/models/<name>/
 * and runs it in the browser with TensorFlow.js. Photos never leave the phone.
 *
 * A Teachable Machine export has three files:
 *   model.json   - the network layout
 *   weights.bin  - the learned numbers
 *   metadata.json - the class labels, in the same order as the outputs
 *
 * We call TensorFlow.js directly (instead of the @teachablemachine/image
 * helper, which only works with a 2019 version of TensorFlow.js). The
 * pre-processing below is exactly what Teachable Machine does when training.
 */
import * as tf from '@tensorflow/tfjs';

export type ModelName = 'waste-sorter' | 'spot-detector';

export interface LoadedModel {
  model: tf.LayersModel;
  labels: string[];
  imageSize: number;
  /** True for the colour-only placeholder models made by scripts/make-placeholder-models.mjs */
  placeholder: boolean;
}

export interface Prediction {
  label: string;
  probability: number;
}

// Each model is loaded once and then reused (cached promise).
const cache = new Map<ModelName, Promise<LoadedModel>>();

export function loadModel(name: ModelName, onProgress?: (fraction: number) => void): Promise<LoadedModel> {
  let p = cache.get(name);
  if (!p) {
    p = (async () => {
      const base = `/models/${name}/`;
      const [model, metadata] = await Promise.all([
        tf.loadLayersModel(base + 'model.json', { onProgress }),
        fetch(base + 'metadata.json').then((r) => {
          if (!r.ok) throw new Error(`metadata.json missing for ${name}`);
          return r.json();
        }),
      ]);
      const imageSize: number = metadata.imageSize ?? 224;
      // Warm up once so the first real prediction is fast.
      tf.tidy(() => model.predict(tf.zeros([1, imageSize, imageSize, 3])));
      return { model, labels: metadata.labels as string[], imageSize, placeholder: !!metadata.placeholder };
    })();
    p.catch(() => cache.delete(name)); // allow a retry after a failure
    cache.set(name, p);
  }
  return p;
}

type Source = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

/**
 * Run the model on one image or video frame.
 * Steps (same as Teachable Machine): crop the centre square, resize to
 * 224x224, scale pixels from 0..255 to -1..1, then predict.
 */
export function predict(m: LoadedModel, source: Source): Prediction[] {
  const probs = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(source).toFloat();
    const [h, w] = pixels.shape;
    const side = Math.min(h, w);
    const top = (h - side) / 2 / h;
    const left = (w - side) / 2 / w;
    const box = [[top, left, top + side / h, left + side / w]];
    const square = tf.image.cropAndResize(pixels.expandDims(0) as tf.Tensor4D, box, [0], [m.imageSize, m.imageSize]);
    const input = square.div(127.5).sub(1);
    return (m.model.predict(input) as tf.Tensor).dataSync();
  });
  return m.labels.map((label, i) => ({ label, probability: probs[i] ?? 0 }));
}
