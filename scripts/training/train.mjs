/**
 * Step 3 of training: teach two small classifiers on top of MobileNet v2.
 *
 *   node scripts/training/train.mjs            (from the repo root)
 *
 * How it works (transfer learning, the same idea as Teachable Machine):
 *   1. Every photo goes through MobileNet v2 (public/models/imagenet), which
 *      turns it into 1,280 numbers describing what's in it ("features").
 *   2. Cleaning: web photos include junk (charts, posters, unrelated scenes).
 *      Charts are dropped by file type/title; then each photo is scored by a
 *      model that never saw it (5-fold cross-validation) and photos that
 *      clearly don't look like their label are dropped (listed in
 *      training-data/dropped-<task>.json).
 *   3. Accuracy is measured with 5-fold cross-validation: every photo is
 *      tested once by a model that was trained without it. For the scanner we
 *      also measure the app's full logic (trained model + ImageNet, see
 *      src/ai/combine.ts): how often a shown answer is right, and how often it asks.
 *   4. The final classifier (a single linear layer, which compared best in
 *      scripts/training/compare.mjs) is trained on all cleaned photos.
 *
 * Output (loaded by the app, see src/ai/heads.ts):
 *   public/models/waste-head/   Wet, Dry, Hazardous, Not waste   (scanner)
 *   public/models/spot-head/    Garbage dump, Overflowing bin, Blocked drain, Clean area   (reports)
 *   docs/training-data-credits.md   every photo used, its author and licence
 */
import * as tf from '@tensorflow/tfjs-node';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { indexLabels, mapImagenet, FEATURE_NODE } from '../../src/ai/imagenetWaste.ts';
import { combineOpinions, CONFIDENCE_THRESHOLD } from '../../src/ai/combine.ts';

/** Class folder -> label the app understands (see labelToCategory / labelToKind). */
const TASKS = {
  waste: {
    out: 'public/models/waste-head',
    labels: { wet: 'Wet', dry: 'Dry', hazardous: 'Hazardous', notwaste: 'Not waste' },
  },
  spot: {
    out: 'public/models/spot-head',
    labels: { dump: 'Garbage dump', bin: 'Overflowing bin', drain: 'Blocked drain', clean: 'Clean area' },
  },
};
const WASTE_CATEGORY = { Wet: 'wet', Dry: 'dry', Hazardous: 'hazardous', 'Not waste': 'notwaste' };
const EPOCHS = 60;
const FOLDS = 5;

/** Commons charts, maps, logos and posters are not photos of waste. */
const JUNK_TITLE = /chart|graph|statistic|infographic|diagram|\bmap\b|logo|icon|poster|owid|\.svg|\.png$|\.gif$/i;

// Fixed random seed, so folds are the same every run.
let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const base = await tf.loadGraphModel('file://public/models/imagenet/model.json');
const imagenetIndex = indexLabels(readFileSync('public/models/imagenet/labels.txt', 'utf8').trim().split('\n'));
// MobileNet's own last layer, so ImageNet's opinion can be computed from cached features.
const W = base.weights['module/MobilenetV2/Logits/Conv2d_1c_1x1/weights'][0].reshape([1280, 1001]);
const B = base.weights['module/MobilenetV2/Logits/Conv2d_1c_1x1/biases'][0];
const manifest = JSON.parse(readFileSync('training-data/manifest.json', 'utf8'));

/** Same pre-processing as the app: centre square, 224x224, pixels 0..1. Returns [original, mirrored] features. */
function features(file) {
  return tf.tidy(() => {
    const img = tf.node.decodeImage(readFileSync(file), 3).toFloat();
    const [h, w] = img.shape;
    const side = Math.min(h, w);
    const box = [[(h - side) / 2 / h, (w - side) / 2 / w, (h + side) / 2 / h, (w + side) / 2 / w]];
    const square = tf.image.cropAndResize(img.expandDims(0), box, [0], [224, 224]).div(255);
    const both = tf.concat([square, tf.image.flipLeftRight(square)]);
    return base.execute(both, FEATURE_NODE).reshape([2, 1280]).arraySync();
  });
}

/** The classifier on top of MobileNet: one linear layer with softmax. */
async function trainHead(samples, nClasses, epochs = EPOCHS) {
  const x = tf.tensor2d(samples.flatMap((s) => s.feats)); // original + mirrored photo
  const y = tf.oneHot(tf.tensor1d(samples.flatMap((s) => [s.cls, s.cls]), 'int32'), nClasses);
  const counts = Array.from({ length: nClasses }, (_, ci) => samples.filter((s) => s.cls === ci).length);
  const classWeight = Object.fromEntries(counts.map((c, ci) => [ci, Math.max(...counts) / Math.max(1, c)]));
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [1280], units: nClasses, activation: 'softmax', kernelRegularizer: tf.regularizers.l2({ l2: 1e-3 }) }));
  model.compile({ optimizer: tf.train.adam(1e-3), loss: 'categoricalCrossentropy' });
  await model.fit(x, y, { epochs, batchSize: 32, classWeight, verbose: 0, shuffle: true });
  tf.dispose([x, y]);
  return model;
}

/** Split sample indexes into folds (stratified by class). */
function folds(samples, k) {
  const out = Array.from({ length: k }, () => []);
  const byClass = {};
  samples.forEach((s, i) => (byClass[s.cls] ??= []).push(i));
  for (const idx of Object.values(byClass)) shuffle(idx).forEach((i, n) => out[n % k].push(i));
  return out;
}

const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const sd = (a) => Math.sqrt(mean(a.map((x) => (x - mean(a)) ** 2)));
const pct = (x) => `${(x * 100).toFixed(1)}%`;

const credits = [];

for (const [task, cfg] of Object.entries(TASKS)) {
  const classes = Object.keys(cfg.labels);
  const labels = classes.map((c) => cfg.labels[c]);
  console.log(`\n=== ${task}: ${labels.join(', ')}`);

  // 1. Features for every usable photo (cached, so re-training is quick).
  const cacheFile = `training-data/features-${task}.json`;
  const cache = existsSync(cacheFile) ? JSON.parse(readFileSync(cacheFile, 'utf8')) : {};
  let samples = [];
  for (const [ci, cls] of classes.entries()) {
    for (const it of manifest[task][cls]) {
      if (!it.file || it.failed || !existsSync(it.file)) continue;
      if (it.source.startsWith('Wikimedia') && JUNK_TITLE.test(it.title)) continue;
      try {
        cache[it.file] ??= features(it.file);
        samples.push({ cls: ci, feats: cache[it.file], item: it });
      } catch {
        // not a decodable image; skip it
      }
    }
  }
  writeFileSync(cacheFile, JSON.stringify(cache));

  // 2. Cleaning: drop photos that a model trained without them says clearly aren't their label.
  const fit = new Array(samples.length).fill(0);
  for (const testIdx of folds(samples, FOLDS)) {
    const testSet = new Set(testIdx);
    const model = await trainHead(samples.filter((_, i) => !testSet.has(i)), classes.length, 30);
    const probs = model.predict(tf.tensor2d(testIdx.map((i) => samples[i].feats[0]))).arraySync();
    testIdx.forEach((i, k) => (fit[i] = probs[k][samples[i].cls]));
    model.dispose();
  }
  const dropped = samples.filter((_, i) => fit[i] < 0.2);
  writeFileSync(`training-data/dropped-${task}.json`, JSON.stringify(dropped.map((s) => ({ cls: classes[s.cls], file: s.item.file, title: s.item.title })), null, 1));
  samples = samples.filter((_, i) => fit[i] >= 0.2);
  const perClass = Object.fromEntries(classes.map((c, ci) => [cfg.labels[c], samples.filter((s) => s.cls === ci).length]));
  console.log(`  photos after cleaning (dropped ${dropped.length}):`, perClass);

  // 3. Accuracy with 5-fold cross-validation.
  const accs = [];
  const app = { right: 0, wrong: 0, asked: 0 };
  const confusion = labels.map(() => labels.map(() => 0));
  for (const testIdx of folds(samples, FOLDS)) {
    const testSet = new Set(testIdx);
    const model = await trainHead(samples.filter((_, i) => !testSet.has(i)), classes.length);
    const feats = tf.tensor2d(testIdx.map((i) => samples[i].feats[0]));
    const probs = model.predict(feats).arraySync();
    const imagenetProbs = tf.tidy(() => tf.softmax(feats.matMul(W).add(B)).arraySync());
    let correct = 0;
    testIdx.forEach((i, k) => {
      const truth = samples[i].cls;
      const pred = probs[k].indexOf(Math.max(...probs[k]));
      confusion[truth][pred]++;
      if (pred === truth) correct++;
      if (task === 'waste') {
        // The app's full logic: trained head + ImageNet (src/ai/combine.ts).
        const scores = Object.fromEntries(labels.map((l, li) => [WASTE_CATEGORY[l], probs[k][li]]));
        const trained = { category: WASTE_CATEGORY[labels[pred]], confidence: probs[k][pred], scores };
        const final = combineOpinions(trained, mapImagenet(imagenetIndex, imagenetProbs[k]));
        if (final.confidence < CONFIDENCE_THRESHOLD) app.asked++;
        else if (final.category === WASTE_CATEGORY[labels[truth]]) app.right++;
        else app.wrong++;
      }
    });
    accs.push(correct / testIdx.length);
    feats.dispose();
    model.dispose();
  }
  console.log(`  cross-validated accuracy: ${pct(mean(accs))} +/- ${pct(sd(accs))}  [${accs.map((a) => (a * 100).toFixed(0)).join(' ')}]`);
  console.log(`  confusion (rows = true, cols = predicted: ${labels.join(', ')})`);
  confusion.forEach((row, i) => console.log(`    ${labels[i].padEnd(16)}${row.map((n) => String(n).padStart(5)).join('')}`));
  let appSummary;
  if (task === 'waste') {
    const shown = app.right + app.wrong;
    appSummary = { shownCorrect: app.right / shown, askedRate: app.asked / samples.length, wrongRate: app.wrong / samples.length };
    console.log(
      `  app logic (trained + ImageNet): answers shown are right ${pct(appSummary.shownCorrect)} of the time; ` +
        `asks the user for ${pct(appSummary.askedRate)} of photos; wrong answers on ${pct(appSummary.wrongRate)}`,
    );
  }

  // 4. Final classifier on all cleaned photos.
  const model = await trainHead(samples, classes.length);
  mkdirSync(cfg.out, { recursive: true });
  await model.save(`file://${cfg.out}`);
  writeFileSync(
    `${cfg.out}/metadata.json`,
    JSON.stringify(
      {
        labels,
        base: 'imagenet/mobilenet_v2_100_224',
        featureNode: FEATURE_NODE,
        cvAccuracy: Math.round(mean(accs) * 1000) / 1000,
        cvAccuracySpread: Math.round(sd(accs) * 1000) / 1000,
        ...(appSummary ? { appLogic: Object.fromEntries(Object.entries(appSummary).map(([k, v]) => [k, Math.round(v * 1000) / 1000])) } : {}),
        photos: perClass,
        trainedAt: new Date().toISOString(),
        trainedWith: 'scripts/training/train.mjs',
      },
      null,
      2,
    ),
  );
  console.log(`  saved ${cfg.out}`);
  for (const s of samples) credits.push({ task, cls: cfg.labels[classes[s.cls]], ...s.item });
}

// Credits for every photo used.
const rows = credits
  .sort((a, b) => (a.task + a.cls).localeCompare(b.task + b.cls))
  .map((c) => `| ${c.task} | ${c.cls} | [${c.title.replace(/[|[\]]/g, ' ').slice(0, 70)}](${c.link}) | ${c.author.replace(/\|/g, '/')} | ${c.license} |`);
mkdirSync('docs', { recursive: true });
writeFileSync(
  'docs/training-data-credits.md',
  `# Training data credits\n\nThe waste and spot classifiers in \`public/models/waste-head\` and \`public/models/spot-head\` were trained and tested (\`scripts/training/train.mjs\`) on these openly licensed photos. The photos themselves are not included in this repository.\n\n| Model | Class | Photo | Author | Licence |\n|---|---|---|---|---|\n${rows.join('\n')}\n`,
);
console.log(`\nWrote docs/training-data-credits.md (${credits.length} photos)`);
