/**
 * Compare a few classifier set-ups with 5-fold cross-validation on the cached
 * features (run train.mjs first). Prints mean accuracy +/- spread per set-up.
 *
 *   node scripts/training/compare.mjs
 */
import * as tf from '@tensorflow/tfjs-node';
import { readFileSync } from 'node:fs';

const TASKS = { waste: ['wet', 'dry', 'hazardous', 'notwaste'], spot: ['dump', 'bin', 'drain', 'clean'] };
const SETUPS = {
  'linear (no hidden layer)': { hidden: 0, epochs: 60, dropout: 0, l2: 1e-3 },
  'hidden 128, dropout 0.4': { hidden: 128, epochs: 40, dropout: 0.4, l2: 1e-3 },
  'hidden 256, dropout 0.5': { hidden: 256, epochs: 50, dropout: 0.5, l2: 1e-3 },
  'hidden 64, dropout 0.3': { hidden: 64, epochs: 40, dropout: 0.3, l2: 1e-2 },
};

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

function build(nIn, nOut, s) {
  const m = tf.sequential();
  if (s.hidden) {
    m.add(tf.layers.dense({ inputShape: [nIn], units: s.hidden, activation: 'relu', kernelRegularizer: tf.regularizers.l2({ l2: s.l2 }) }));
    if (s.dropout) m.add(tf.layers.dropout({ rate: s.dropout }));
    m.add(tf.layers.dense({ units: nOut, activation: 'softmax' }));
  } else {
    m.add(tf.layers.dense({ inputShape: [nIn], units: nOut, activation: 'softmax', kernelRegularizer: tf.regularizers.l2({ l2: s.l2 }) }));
  }
  m.compile({ optimizer: tf.train.adam(1e-3), loss: 'categoricalCrossentropy' });
  return m;
}

const manifest = JSON.parse(readFileSync('training-data/manifest.json', 'utf8'));
for (const [task, classes] of Object.entries(TASKS)) {
  const cache = JSON.parse(readFileSync(`training-data/features-${task}.json`, 'utf8'));
  const dropped = new Set(JSON.parse(readFileSync(`training-data/dropped-${task}.json`, 'utf8')).map((d) => d.file));
  const samples = [];
  classes.forEach((cls, ci) => {
    for (const it of manifest[task][cls]) if (cache[it.file] && !dropped.has(it.file)) samples.push({ cls: ci, feats: cache[it.file] });
  });
  const order = shuffle(samples.map((_, i) => i));
  console.log(`\n${task} (${samples.length} cleaned photos)`);
  for (const [name, s] of Object.entries(SETUPS)) {
    const accs = [];
    for (let f = 0; f < 5; f++) {
      const te = order.filter((_, k) => k % 5 === f).map((i) => samples[i]);
      const tr = order.filter((_, k) => k % 5 !== f).map((i) => samples[i]);
      const x = tf.tensor2d(tr.flatMap((t) => t.feats));
      const y = tf.oneHot(tf.tensor1d(tr.flatMap((t) => [t.cls, t.cls]), 'int32'), classes.length);
      const counts = classes.map((_, ci) => tr.filter((t) => t.cls === ci).length);
      const classWeight = Object.fromEntries(counts.map((c, ci) => [ci, Math.max(...counts) / c]));
      const m = build(1280, classes.length, s);
      await m.fit(x, y, { epochs: s.epochs, batchSize: 32, classWeight, verbose: 0, shuffle: true });
      const pred = m.predict(tf.tensor2d(te.map((t) => t.feats[0]))).argMax(-1).arraySync();
      accs.push(pred.filter((p, i) => p === te[i].cls).length / te.length);
      tf.dispose([x, y]);
      m.dispose();
    }
    const mean = accs.reduce((a, b) => a + b, 0) / accs.length;
    const sd = Math.sqrt(accs.reduce((a, b) => a + (b - mean) ** 2, 0) / accs.length);
    console.log(`  ${name.padEnd(26)} ${(mean * 100).toFixed(1)}% +/- ${(sd * 100).toFixed(1)}  [${accs.map((a) => (a * 100).toFixed(0)).join(' ')}]`);
  }
}
