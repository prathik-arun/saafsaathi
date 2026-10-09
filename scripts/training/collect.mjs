/**
 * Step 1 of training: collect a list of openly licensed photos for each class.
 *
 *   node scripts/training/collect.mjs           -> training-data/manifest.json
 *
 * Sources (every photo keeps its licence + author for the credits file):
 *   - Wikimedia Commons categories and searches (free licences only)
 *   - garbage-image-classification-detection (CC BY 4.0), Hugging Face (scanner: dry)
 *   - Street-garbage (MIT), Hugging Face                          (spots: dump)
 *   - Garbage_Bin_overflow_images (CC BY 4.0), Hugging Face        (spots: bin)
 *   - random_streetview_images_pano (MIT), Hugging Face, India only (spots: clean)
 * The photos themselves are not committed to the repo (training-data/ is ignored).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const UA = { 'User-Agent': 'SaafSaathi-dataset/1.0 (student hackathon project; github.com/prathik-arun/saafsaathi)' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** What to collect: task -> class -> sources. Numbers are the max photos per source. */
const PLAN = {
  waste: {
    wet: [
      ['commons-cat', 'Food waste', 2, 160],
      ['commons-cat', 'Banana peel', 1, 50],
      ['commons-cat', 'Leftovers', 1, 40],
      ['commons-cat', 'Orange peels', 1, 40],
      ['commons-search', 'vegetable peels waste', 40],
      ['commons-search', 'kitchen waste compost bin', 40],
    ],
    dry: [
      ['hf-dmedhi', ['Cardboard', 'Glass', 'Metal', 'Paper', 'Plastic'], 50],
      ['commons-cat', 'Plastic waste', 1, 50],
    ],
    hazardous: [
      ['commons-cat', 'AA batteries', 2, 60],
      ['commons-search', 'used batteries', 40],
      ['commons-cat', 'Pills', 2, 60],
      ['commons-cat', 'Syringes', 1, 50],
      ['commons-cat', 'Electronic waste', 1, 60],
      ['commons-search', 'compact fluorescent lamp', 30],
    ],
    notwaste: [
      ['commons-cat', 'Living rooms', 1, 70],
      ['commons-cat', 'Bedrooms', 1, 60],
      ['commons-cat', 'Hands', 1, 60],
      ['commons-search', 'person portrait indoor', 30],
    ],
  },
  spot: {
    dump: [
      ['hf-rows', 'Shynuaa/Street-garbage', 'train', 140],
      ['commons-cat', 'Garbage dumps in India', 1, 40],
      ['commons-cat', 'Litter in India', 1, 30],
      ['commons-cat', 'Garbage dumps', 1, 60],
      ['commons-cat', 'Litter', 2, 90],
      ['commons-search', 'garbage pile street', 50],
    ],
    bin: [
      ['hf-rows', 'Akhila-9849/Garbage_Bin_overflow_images', 'train', 160],
      ['commons-cat', 'Overflowing waste containers', 2, 60],
    ],
    drain: [
      ['commons-cat', 'Storm drains', 1, 120],
      ['commons-cat', 'Open sewers', 1, 30],
      ['commons-cat', 'Water pollution in India', 2, 70],
    ],
    clean: [
      ['hf-streetview-in', 140],
      ['commons-cat', 'Sidewalks in India', 1, 40],
      ['commons-cat', 'Streets in India', 2, 90],
      ['commons-search', 'clean street India', 40],
      ['commons-search', 'road Bangalore', 40],
    ],
  },
};

const FREE = /^(cc0|cc[- ]by(-sa)?|public domain|pd|attribution)/i;

async function commonsApi(params) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const url = `https://commons.wikimedia.org/w/api.php?format=json&maxlag=5&${new URLSearchParams(params)}`;
    const res = await fetch(url, { headers: UA });
    const text = await res.text();
    await sleep(1200); // one request at a time, gently
    if (text.startsWith('{')) return JSON.parse(text);
    await sleep(5000 * (attempt + 1)); // rate-limited: back off
  }
  throw new Error('Commons API kept refusing');
}

function fromImageinfo(page, source) {
  const ii = page.imageinfo?.[0];
  if (!ii?.thumburl || !/image\/(jpeg|png)/.test(ii.mime ?? '')) return null;
  const meta = ii.extmetadata ?? {};
  const license = meta.LicenseShortName?.value ?? '';
  if (!FREE.test(license)) return null;
  const author = (meta.Artist?.value ?? '').replace(/<[^>]+>/g, '').trim().slice(0, 80) || 'unknown';
  return { url: ii.thumburl, source, title: page.title, license, author, link: ii.descriptionurl };
}

const IMAGE_PROPS = { prop: 'imageinfo', iiprop: 'url|mime|extmetadata', iiurlwidth: '400', iiextmetadatafilter: 'LicenseShortName|Artist' };

async function commonsCategory(cat, depth, max, seen = new Set()) {
  if (seen.has(cat)) return [];
  seen.add(cat);
  const out = [];
  let cont = {};
  do {
    const j = await commonsApi({ action: 'query', generator: 'categorymembers', gcmtitle: `Category:${cat}`, gcmtype: 'file', gcmlimit: '50', ...IMAGE_PROPS, ...cont });
    for (const p of Object.values(j.query?.pages ?? {})) {
      const item = fromImageinfo(p, `Wikimedia Commons: Category:${cat}`);
      if (item) out.push(item);
    }
    cont = j.continue ?? null;
  } while (cont && out.length < max);
  if (depth > 1 && out.length < max) {
    const sub = await commonsApi({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'subcat', cmlimit: '30' });
    for (const s of sub.query?.categorymembers ?? []) {
      if (out.length >= max) break;
      out.push(...(await commonsCategory(s.title.slice(9), depth - 1, max - out.length, seen)));
    }
  }
  return out.slice(0, max);
}

async function commonsSearch(q, max) {
  const j = await commonsApi({ action: 'query', generator: 'search', gsrsearch: `${q} filetype:bitmap`, gsrnamespace: '6', gsrlimit: String(Math.min(50, max)), ...IMAGE_PROPS });
  return Object.values(j.query?.pages ?? {})
    .map((p) => fromImageinfo(p, `Wikimedia Commons search: "${q}"`))
    .filter(Boolean)
    .slice(0, max);
}

async function hfRows(dataset, split, max, filter = () => true, label, maxOffset = 4000) {
  const out = [];
  for (let offset = 0; out.length < max && offset < maxOffset; offset += 100) {
    const url = `https://datasets-server.huggingface.co/rows?dataset=${encodeURIComponent(dataset)}&config=default&split=${split}&offset=${offset}&length=100`;
    const j = await fetch(url).then((r) => r.json());
    if (j.error) throw new Error(`${dataset}: ${String(j.error).slice(0, 120)}`);
    if (!j.rows?.length) break;
    for (const { row } of j.rows) {
      if (out.length >= max || !filter(row)) continue;
      out.push({ url: row.image.src, source: `Hugging Face: ${dataset}`, title: label ? label(row) : `${dataset} #${out.length}`, license: LICENSES[dataset], author: AUTHORS[dataset], link: `https://huggingface.co/datasets/${dataset}` });
    }
    await sleep(300);
  }
  return out;
}

const LICENSES = {
  'garythung/trashnet': 'MIT',
  'Shynuaa/Street-garbage': 'MIT',
  'Akhila-9849/Garbage_Bin_overflow_images': 'CC BY 4.0',
  'stochastic/random_streetview_images_pano_v0.0.2': 'MIT',
  'dmedhi/garbage-image-classification-detection': 'CC BY 4.0',
};
const AUTHORS = {
  'garythung/trashnet': 'Gary Thung & Mindy Yang (TrashNet)',
  'Shynuaa/Street-garbage': 'Shynuaa (Hugging Face)',
  'Akhila-9849/Garbage_Bin_overflow_images': 'Akhila-9849 (Hugging Face)',
  'stochastic/random_streetview_images_pano_v0.0.2': 'stochastic (Hugging Face)',
  'dmedhi/garbage-image-classification-detection': 'dmedhi (Hugging Face)',
};

async function collect(source) {
  const [kind, ...args] = source;
  if (kind === 'commons-cat') return commonsCategory(args[0], args[1], args[2]);
  if (kind === 'commons-search') return commonsSearch(args[0], args[1]);
  if (kind === 'hf-rows') return hfRows(args[0], args[1], args[2]);
  if (kind === 'hf-dmedhi') {
    const [wanted, perClass] = args;
    const per = {};
    const keep = (row) => {
      if (!wanted.includes(row.class_name) || (per[row.class_name] ?? 0) >= perClass) return false;
      per[row.class_name] = (per[row.class_name] ?? 0) + 1;
      return true;
    };
    return hfRows('dmedhi/garbage-image-classification-detection', 'train', wanted.length * perClass, keep, (row) => `dmedhi ${row.class_name} #${row.image?.src?.length ?? ''}`, 3100);
  }
  if (kind === 'hf-trashnet') {
    const names = ['cardboard', 'glass', 'metal', 'paper', 'plastic', 'trash'];
    const per = {};
    const [wanted, perClass] = args;
    // Take up to `perClass` photos of each wanted TrashNet class.
    const keep = (row) => {
      const n = names[row.label];
      if (!wanted.includes(n) || (per[n] ?? 0) >= perClass) return false;
      per[n] = (per[n] ?? 0) + 1;
      return true;
    };
    return hfRows('garythung/trashnet', 'train', wanted.length * perClass, keep, (row) => `TrashNet ${names[row.label]}`, 5100);
  }
  if (kind === 'hf-streetview-in') {
    return hfRows('stochastic/random_streetview_images_pano_v0.0.2', 'train', args[0], (row) => row.country_iso_alpha2 === 'IN', (row) => `Street View, ${row.address ?? 'India'}`, 11100);
  }
  throw new Error(`unknown source ${kind}`);
}

// `node collect.mjs spot/dump` re-collects one class and keeps the rest of the manifest.
const only = process.argv[2];
const manifest = only && existsSync('training-data/manifest.json') ? JSON.parse(readFileSync('training-data/manifest.json', 'utf8')) : {};
for (const [task, classes] of Object.entries(PLAN)) {
  manifest[task] ??= {};
  for (const [cls, sources] of Object.entries(classes)) {
    if (only && only !== `${task}/${cls}`) continue;
    const seen = new Set();
    const items = [];
    for (const s of sources) {
      try {
        for (const it of await collect(s)) {
          const key = it.source.startsWith('Hugging Face') ? it.url : it.title;
          if (seen.has(key)) continue;
          seen.add(key);
          items.push(it);
        }
      } catch (e) {
        console.warn(`  ! ${task}/${cls} ${s[1]}: ${e.message}`);
      }
    }
    manifest[task][cls] = items;
    console.log(`${task}/${cls}: ${items.length} photos`);
  }
}
mkdirSync('training-data', { recursive: true });
writeFileSync('training-data/manifest.json', JSON.stringify(manifest, null, 1));
console.log('Wrote training-data/manifest.json');
