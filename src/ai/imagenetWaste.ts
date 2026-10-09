/**
 * Built-in waste recogniser, used until the student's own Teachable Machine
 * model is added to /public/models/waste-sorter/.
 *
 * It runs Google's MobileNet v2 (trained on ImageNet: 1,000 everyday objects
 * like bottles, bananas and phones) in the browser, then maps what it sees to
 * Wet / Dry / Hazardous. Model files: /public/models/imagenet/ (from TF Hub,
 * Apache 2.0). Photos never leave the phone.
 */
import * as tf from '@tensorflow/tfjs';
import type { Category, WasteLabel } from '../lib/types';
import type { WasteResult } from './classifyWaste';

/** ImageNet labels (exactly as in labels.txt) for each waste category. */
const CATEGORY_LABELS: Record<Category, string[]> = {
  // Food, fruit, vegetables, flowers and plants: they rot, so they compost.
  wet: [
    'guacamole', 'consomme', 'hot pot', 'trifle', 'ice cream', 'ice lolly', 'French loaf', 'bagel', 'pretzel',
    'cheeseburger', 'hotdog', 'mashed potato', 'head cabbage', 'broccoli', 'cauliflower', 'zucchini',
    'spaghetti squash', 'acorn squash', 'butternut squash', 'cucumber', 'artichoke', 'bell pepper', 'cardoon',
    'mushroom', 'Granny Smith', 'strawberry', 'orange', 'lemon', 'fig', 'pineapple', 'banana', 'jackfruit',
    'custard apple', 'pomegranate', 'hay', 'carbonara', 'chocolate sauce', 'dough', 'meat loaf', 'pizza', 'potpie',
    'burrito', 'espresso', 'eggnog', 'daisy', "yellow lady's slipper", 'corn', 'acorn', 'hip', 'buckeye',
    'coral fungus', 'agaric', 'gyromitra', 'stinkhorn', 'earthstar', 'hen-of-the-woods', 'bolete', 'ear',
  ],
  // Packaging, paper, plastic, glass, metal and cloth: keep clean and recycle.
  dry: [
    'water bottle', 'pop bottle', 'beer bottle', 'wine bottle', 'water jug', 'whiskey jug',
    'bottlecap', 'plastic bag', 'packet', 'carton', 'crate', 'envelope', 'paper towel', 'toilet tissue',
    'cup', 'coffee mug', 'beer glass', 'goblet', 'measuring cup', 'mixing bowl', 'soup bowl', 'plate', 'tray',
    'pitcher', 'vase', 'beaker', 'bucket', 'menu', 'comic book', 'book jacket', 'binder', 'pencil box',
    'ballpoint', 'fountain pen', 'rubber eraser', 'pencil sharpener', 'jersey', 'sweatshirt', 'sock',
    'running shoe', 'Loafer', 'bath towel', 'mitten', 'purse', 'wallet', 'backpack', 'umbrella', 'tennis ball',
    'ping-pong ball', 'balloon', 'milk can', 'oil filter',
  ],
  // Medicines, sanitary waste, aerosols, lighters and e-waste (anything with a battery or circuit).
  hazardous: [
    'pill bottle', 'syringe', 'Band Aid', 'diaper', 'hair spray', 'lighter', 'cellular telephone', 'dial telephone', 'iPod',
    'laptop', 'notebook', 'hand-held computer', 'desktop computer', 'computer keyboard', 'mouse', 'monitor',
    'screen', 'television', 'remote control', 'modem', 'joystick', 'printer', 'projector', 'radio', 'loudspeaker',
    'tape player', 'cassette', 'cassette player', 'CD player', 'hard disc', 'microphone', 'digital watch',
    'digital clock', 'stopwatch', 'torch', 'electric fan', 'table lamp', 'spotlight', 'switch', 'iron', 'toaster',
    'hair drier', 'Polaroid camera', 'reflex camera', 'power drill',
  ],
};

/** Nicer item names, matched to the disposal tips in src/data/tips.json where possible. */
const ITEM_ALIAS: Record<string, string> = {
  banana: 'Banana peel',
  'water bottle': 'Plastic bottle',
  'pop bottle': 'Plastic bottle',
  'pill bottle': 'Medicine',
  syringe: 'Medicine',
  envelope: 'Paper',
  'paper towel': 'Paper',
  'toilet tissue': 'Paper',
  menu: 'Paper',
  'comic book': 'Paper',
  espresso: 'Coffee',
  'table lamp': 'Bulb',
  spotlight: 'Bulb',
  notebook: 'Laptop',
  'cellular telephone': 'Mobile phone',
  'Granny Smith': 'Apple',
};

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export interface BuiltinModel {
  model: tf.GraphModel;
  labels: string[];
  /** For each output index: the waste category it maps to, if any. */
  categoryOf: (Category | undefined)[];
}

let loading: Promise<BuiltinModel> | null = null;

export function loadBuiltinModel(onProgress?: (fraction: number) => void): Promise<BuiltinModel> {
  if (!loading) {
    loading = (async () => {
      const [model, labelsText] = await Promise.all([
        tf.loadGraphModel('/models/imagenet/model.json', { onProgress }),
        fetch('/models/imagenet/labels.txt').then((r) => r.text()),
      ]);
      const labels = labelsText.trim().split('\n');
      const lookup = new Map<string, Category>();
      for (const [cat, names] of Object.entries(CATEGORY_LABELS) as [Category, string[]][]) names.forEach((n) => lookup.set(n, cat));
      const categoryOf = labels.map((l) => lookup.get(l));
      tf.tidy(() => model.predict(tf.zeros([1, 224, 224, 3]))); // warm up
      return { model, labels, categoryOf };
    })();
    loading.catch(() => (loading = null));
  }
  return loading;
}

/**
 * How sure we are:
 *  - "share": how much of what the model sees is one category vs the others;
 *  - "coverage": how much of the model's belief is on waste items at all.
 * Both must be high for a confident answer; otherwise the user is asked.
 */
export function classifyBuiltin(m: BuiltinModel, source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): WasteResult {
  const probs = tf.tidy(() => {
    const pixels = tf.browser.fromPixels(source).toFloat();
    const [h, w] = pixels.shape;
    const side = Math.min(h, w);
    const top = (h - side) / 2 / h;
    const left = (w - side) / 2 / w;
    const square = tf.image.cropAndResize(pixels.expandDims(0) as tf.Tensor4D, [[top, left, top + side / h, left + side / w]], [0], [224, 224]);
    const logits = m.model.predict(square.div(255)) as tf.Tensor;
    return tf.softmax(logits).dataSync();
  });

  const mass: Record<Category, number> = { wet: 0, dry: 0, hazardous: 0 };
  const bestItem: Partial<Record<Category, { label: string; p: number }>> = {};
  let top = { label: '', p: 0 };
  probs.forEach((p, i) => {
    if (p > top.p) top = { label: m.labels[i], p };
    const cat = m.categoryOf[i];
    if (!cat) return;
    mass[cat] += p;
    if (p > (bestItem[cat]?.p ?? 0)) bestItem[cat] = { label: m.labels[i], p };
  });

  const coverage = mass.wet + mass.dry + mass.hazardous;
  const best = (Object.keys(mass) as Category[]).reduce((a, b) => (mass[b] > mass[a] ? b : a));
  const scores: Record<WasteLabel, number> = { ...mass, notwaste: Math.max(0, 1 - coverage) };

  // Nothing waste-like in view. The model can't be sure something isn't waste (it
  // may just not know the item, like a battery), so this stays below the 70%
  // threshold and the user is asked, with "Not waste" as one of the choices.
  if (coverage < 0.1) {
    return { category: 'notwaste', confidence: Math.min(0.6, top.p), scores };
  }

  const share = coverage > 0 ? mass[best] / coverage : 0;
  const confidence = Math.min(0.99, share * Math.min(1, coverage / 0.4));
  // Only name the item when the model is fairly sure of that exact object.
  const item = bestItem[best] && bestItem[best].p >= 0.35 ? bestItem[best].label : undefined;
  return { category: best, confidence, item: item ? (ITEM_ALIAS[item] ?? titleCase(item)) : undefined, scores };
}
