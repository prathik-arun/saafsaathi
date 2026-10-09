/**
 * Step 2 of training: download the photos listed in training-data/manifest.json
 * into training-data/<task>/<class>/<n>.jpg (small 400 px versions).
 * Already-downloaded photos are skipped, so it can be re-run safely.
 *
 *   node scripts/training/download.mjs
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const UA = { 'User-Agent': 'SaafSaathi-dataset/1.0 (student hackathon project; github.com/prathik-arun/saafsaathi)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const manifest = JSON.parse(readFileSync('training-data/manifest.json', 'utf8'));

const jobs = [];
for (const [task, classes] of Object.entries(manifest)) {
  for (const [cls, items] of Object.entries(classes)) {
    mkdirSync(`training-data/${task}/${cls}`, { recursive: true });
    items.forEach((it, i) => {
      it.file = `training-data/${task}/${cls}/${String(i).padStart(4, '0')}.jpg`;
      if (!existsSync(it.file)) jobs.push(it);
    });
  }
}

let done = 0;
let failed = 0;
async function worker() {
  while (jobs.length) {
    const it = jobs.shift();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(it.url, { headers: UA });
        if (res.status === 429) {
          await sleep(4000 * (attempt + 1));
          continue;
        }
        if (!res.ok) throw new Error(String(res.status));
        writeFileSync(it.file, Buffer.from(await res.arrayBuffer()));
        done++;
        break;
      } catch {
        if (attempt === 2) {
          failed++;
          it.failed = true;
        }
      }
    }
    await sleep(150);
    if ((done + failed) % 100 === 0) console.log(`  ${done} downloaded, ${failed} failed, ${jobs.length} left`);
  }
}
await Promise.all([worker(), worker(), worker()]);
writeFileSync('training-data/manifest.json', JSON.stringify(manifest, null, 1));
console.log(`Done: ${done} downloaded, ${failed} failed.`);
