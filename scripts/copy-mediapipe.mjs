/**
 * Copies MediaPipe's WebAssembly runtime (used by the face check) from
 * node_modules into public/mediapipe so it is served by our own site
 * instead of a CDN. Runs automatically after `npm install`.
 */
import { copyFileSync, mkdirSync } from 'node:fs';

const from = 'node_modules/@mediapipe/tasks-vision/wasm';
const to = 'public/mediapipe';
mkdirSync(to, { recursive: true });
for (const f of ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm']) {
  copyFileSync(`${from}/${f}`, `${to}/${f}`);
}
console.log('Copied MediaPipe wasm to public/mediapipe');
