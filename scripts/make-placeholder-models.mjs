/**
 * Creates tiny PLACEHOLDER models in public/models/ so the app runs before the
 * real Teachable Machine models are trained.
 *
 * They are NOT real AI: each one only looks at the average colour of the photo
 * (greenish -> Wet, reddish -> Hazardous, ...). Replace them with your own
 * Teachable Machine exports (see README "Retrain and swap models").
 *
 * Run: node scripts/make-placeholder-models.mjs
 */
import * as tf from '@tensorflow/tfjs';
import { mkdirSync, writeFileSync } from 'node:fs';

/**
 * Build a model with the same input shape as a Teachable Machine image model
 * (224 x 224 x 3, pixels scaled to -1..1) and save it in TF.js format.
 * weights: one row per input colour channel [r, g, b], one column per class.
 */
async function makeModel(dir, labels, weights, bias) {
  const model = tf.sequential();
  model.add(tf.layers.globalAveragePooling2d({ inputShape: [224, 224, 3] }));
  model.add(tf.layers.dense({ units: labels.length, activation: 'softmax' }));
  model.layers[1].setWeights([tf.tensor2d(weights), tf.tensor1d(bias)]);

  mkdirSync(dir, { recursive: true });
  await model.save(
    tf.io.withSaveHandler(async (artifacts) => {
      writeFileSync(`${dir}/weights.bin`, Buffer.from(artifacts.weightData));
      writeFileSync(
        `${dir}/model.json`,
        JSON.stringify({
          modelTopology: artifacts.modelTopology,
          format: 'layers-model',
          generatedBy: 'SaafSaathi placeholder',
          convertedBy: null,
          weightsManifest: [{ paths: ['weights.bin'], weights: artifacts.weightSpecs }],
        }),
      );
      return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: 'JSON' } };
    }),
  );
  // Same shape as the metadata.json that Teachable Machine exports.
  writeFileSync(
    `${dir}/metadata.json`,
    JSON.stringify(
      { modelName: 'placeholder', placeholder: true, labels, imageSize: 224, timeStamp: new Date().toISOString() },
      null,
      2,
    ),
  );
  console.log('wrote', dir);
}

// Waste Sorter: Wet, Dry, Hazardous, Not waste
await makeModel(
  'public/models/waste-sorter',
  ['Wet', 'Dry', 'Hazardous', 'Not waste'],
  [
    //  Wet  Dry  Haz  Not
    [-2, 1, 6, -1], // red
    [6, 1, -4, -1], // green
    [-3, 4, -3, 1], // blue
  ],
  [0.5, 1, 0, 0],
);

// Spot Detector: Garbage dump, Overflowing bin, Blocked drain, Clean area
await makeModel(
  'public/models/spot-detector',
  ['Garbage dump', 'Overflowing bin', 'Blocked drain', 'Clean area'],
  [
    //  Dump  Bin  Drain  Clean
    [3, 1, -2, -2], // red
    [0, 1, 1, 4], // green
    [-3, 0, 2, 3], // blue
  ],
  [1, 0.5, 0, 0],
);
