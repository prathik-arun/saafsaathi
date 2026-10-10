# SaafSaathi 🍃

**Sort it. Report it. Clean it.**

SaafSaathi ("clean companion") is a mobile-first web app (PWA) that helps Indian families
sort household waste correctly, report garbage spots and blocked drains, and help their
city climb a weekly cleanliness leaderboard.

Built for the College.dev *Hackathon to Solve India's Garbage Problem* (High School division).

**Live app:** https://saafsaathi.web.app (Firebase project `ecoclash-208a9`)

- **Scan & Sort**: point the camera at an item; an AI model on the phone says Wet, Dry or Hazardous and how to dispose of it.
- **Report a Spot**: photograph a garbage spot; the AI suggests its type and severity, a face check blocks photos with people, and the pin appears on a public map.
- **Community**: cities compete on a weekly leaderboard. Reporting and cleaning a spot earns points for the city it's in; the map shows hotspots and cleaned spots.

---

## Tech stack

Everything runs on free tiers, and the AI runs **in the browser**, so photos used for sorting never leave the phone.

| Layer | Choice |
|---|---|
| App | React 18 + Vite + TypeScript (strict) |
| Styling | Tailwind CSS v4, design tokens as CSS variables in `src/styles/tokens.css` |
| PWA | vite-plugin-pwa (installable, offline cache, service worker) |
| Routing | React Router 6 |
| Backend | Firebase Auth, Cloud Firestore, Hosting: all on the free Spark plan, no billing card |
| AI runtime | TensorFlow.js (loads Google Teachable Machine exports) |
| Face check | MediaPipe Face Detector (`@mediapipe/tasks-vision`) |
| Map | Leaflet + react-leaflet + OpenStreetMap, leaflet.markercluster, leaflet.heat |
| Images | browser-image-compression (max 1280 px, ~300 KB) |
| Icons / charts | lucide-react, Recharts |
| Translations | i18next (English, Hindi, Kannada) |

> **One change from the PRD:** the PRD lists `@teachablemachine/image`. That package only
> works with TensorFlow.js 1.3.1 (from 2019), which conflicts with current TensorFlow.js. A
> Teachable Machine export is a normal TensorFlow.js model, so `src/ai/loadModel.ts` loads it
> directly with `tf.loadLayersModel` and does the same pre-processing Teachable Machine
> does (centre-crop, 224×224, pixels scaled to −1…1). Same models, fewer moving parts.

## Getting started (local, no Firebase account needed)

You need Node 20+ and Java 11+ (for the Firebase emulators).

```bash
npm install
npm install -g firebase-tools   # if you don't have it
```

1. **Start everything** (the Firebase emulators for Auth + Firestore, and the app) with one command:
   ```bash
   npm run dev
   ```
   Open http://localhost:5173. The Emulator UI is at http://localhost:4000.
   Press Ctrl+C to stop; your local data is saved to `emulator-data/` and loaded next time.
2. **Add demo data** (optional, while `npm run dev` is running, in a second terminal): about 50 users
   across all 18 cities, three weeks of activity, 100+ reports all over India, the quiz and this week's
   challenges. **It wipes the emulators' existing users and data first.**
   ```bash
   npm run seed
   ```
   Demo logins are listed at the top of `scripts/seed.mjs` (one of them is an admin).

On a phone on the same Wi-Fi, use your computer's IP (camera access needs HTTPS or localhost, so for
real phone testing use the deployed site).

The included `.env.development` points `npm run dev` at the emulators (`VITE_USE_EMULATORS=true`).

### Useful scripts

| Script | What it does |
|---|---|
| `npm run dev` | **Start here.** Emulators + app together in one terminal; saves the emulator data when you press Ctrl+C |
| `npm run dev:app` | Only the app (Vite), if the emulators are already running elsewhere |
| `npm run emulators` | Firebase emulators (fresh data each time) |
| `npm run emulators:persist` | Emulators that save data to `./emulator-data` on exit |
| `npm run seed` | Demo data for the emulators |
| `npm run seed:live` | Same demo data in the **live** project (fake profiles only, no logins) |
| `npm run seed:clear-live` | Remove all live demo data and recompute city totals from real activity |
| `npm run test:rules` | Security-rules tests (anti-cheat, rubric, privacy), 28 cases |
| `npm run lint` | ESLint |
| `npm run build` | Type-check + production build |
| `npm run deploy` | Build and `firebase deploy` |
| `npm run models` | Re-create the placeholder AI models |

## Environment variables

Copy `.env.example` to `.env.production` and fill in the values from
*Firebase console → Project settings → Your apps → Web app*. These are public web-config
values, not secrets; security comes from `firestore.rules`.

| Variable | Meaning |
|---|---|
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | Firebase web config |
| `VITE_USE_EMULATORS` | `true` = use local emulators, `false` = real project |

## Deploying to Firebase (for the judges' link)

1. Create a project at https://console.firebase.google.com.
2. **Authentication** → enable *Email/Password* and *Google*.
3. **Firestore** → create database (production mode).
4. Put the web config in `.env.production` (copy `.env.example`), with `VITE_USE_EMULATORS=false`.
5. `firebase login`, then `firebase use --add` and pick the project.
6. `npm run deploy` (deploys Hosting, and Firestore rules + indexes).
7. **Make yourself admin:** sign up in the app, then in Firestore open `users/<your uid>` and set `role` to `admin`.
8. In the app: *Profile → Admin → Challenges & quiz → Load starter quiz & this week's challenges*.


## Where photos are stored

Report and correction photos are saved **in Firestore**, not Cloud Storage: Cloud Storage now
requires Firebase's paid Blaze plan (a billing card), which the PRD rules out. Each photo is
compressed to ~300 KB and saved as one document (`photos/<reportId>_before`, `_after`), and each
report carries a ~5 KB thumbnail for lists and the map. The free tier's 1 GB holds roughly
2,500 photos. See `src/lib/photos.ts`.

## The AI models

| Model | Folder | Classes |
|---|---|---|
| A: Waste Sorter (Teachable Machine slot) | `public/models/waste-sorter/` | Wet, Dry, Hazardous, Not waste |
| B: Spot Detector (Teachable Machine slot) | `public/models/spot-detector/` | Garbage dump, Overflowing bin, Blocked drain, Clean area |
| Face check | `public/models/face/` | MediaPipe BlazeFace (ready-made, Apache 2.0) |

### Pre-trained models (what the app uses today)

Both AIs run on top of **MobileNet v2** (Google, ImageNet; `public/models/imagenet/`, ~14 MB,
cached after first use). MobileNet turns a photo into 1,280 numbers describing what's in it, and a
small trained classifier ("head", ~20 KB each) turns those into our classes:

| Model | Folder | Classes | Photos | Accuracy (5-fold cross-validation) |
|---|---|---|---|---|
| Waste Sorter head | `public/models/waste-head/` | Wet, Dry, Hazardous, Not waste | 911 | **92.5%** (± 1.6) |
| Spot Detector head | `public/models/spot-head/` | Garbage dump, Overflowing bin, Blocked drain, Clean area | 736 | **90.1%** (± 3.0) |

The scanner also asks MobileNet for its own opinion (it knows 1,000 everyday objects, so it can
name the item, e.g. "Banana peel"). If MobileNet is sure the object belongs to a *different*
category, the app asks the user instead of guessing (`src/ai/combine.ts`). Measured the same way,
this full logic shows an answer that is right **96.6%** of the time, asks the user for
16% of photos and is wrong on 2.9%.

**How they were trained** (`scripts/training/`, see its README section below):
1. `collect.mjs` gathers openly licensed photos: Wikimedia Commons (food waste, peels, batteries,
   pills, syringes, e-waste, bulbs, rooms, garbage dumps in India, overflowing bins, storm drains,
   polluted nallahs, Indian streets) and Hugging Face datasets (household recyclables CC BY 4.0,
   overflowing bins CC BY 4.0).
2. `download.mjs` saves small copies (not committed; `training-data/` is ignored).
3. `train.mjs` drops charts/posters and photos that clearly don't fit their label (checked by a
   model that never saw them), measures accuracy with 5-fold cross-validation, then trains the final
   classifier on all cleaned photos. Every photo used is credited in
   [`docs/training-data-credits.md`](docs/training-data-credits.md).

To retrain (e.g. after adding photos):
```bash
cd scripts/training && npm install && cd ../..
node scripts/training/collect.mjs && node scripts/training/download.mjs && node scripts/training/train.mjs
```

**Limits to know:** web photos are not Indian homes. MobileNet has no "battery" class of its own, a
newspaper can be mistaken for wet waste, and the street model has fewer drain photos than other
classes. The best improvement is still the PRD's plan: the student photographs real local items and
trains in Teachable Machine (below). A trained Teachable Machine model in `public/models/waste-sorter/`
or `public/models/spot-detector/` automatically takes priority over these heads.

### Retrain and swap a model

1. Go to https://teachablemachine.withgoogle.com → *Image project* → *Standard image model*.
2. Make one class per label. **Class names matter:**
   - Waste Sorter: names starting with `Wet`, `Dry`, `Hazardous`, `Not waste`.
     You may also train item-level classes like `Wet - Banana peel` or `Hazardous - Battery`;
     the app groups them by category and shows the item as the "item guess".
   - Spot Detector: names containing `dump`, `bin`, `drain`, `clean` (e.g. `Garbage dump`, `Clean area`).
3. Upload at least 150 photos per class (Waste Sorter) / 100 per class (Spot Detector), on
   varied backgrounds and lighting. Keep a separate test set (15 per class) that is **never** used for training.
4. *Train* → *Export Model* → *TensorFlow.js* → *Download*.
5. Unzip and copy `model.json`, `weights.bin` and `metadata.json` into the model's folder,
   replacing the placeholder files. Each model should be under 5 MB.
6. Reload the app. It now uses your model instead of the pre-trained heads.

**Using corrections:** when users tap *Wrong? Fix it* and agree to share, the photo and the right
label are saved. *Admin → Stats → Corrections (ZIP)* downloads them in one folder per label,
ready to upload into the matching Teachable Machine class.

### Thresholds (from the PRD)

- Waste Sorter: ≥ 70% confidence shows the result; below that the user picks (`src/ai/classifyWaste.ts`).
- Spot severity: > 85% High, 65–85% Medium, < 65% Low (`src/ai/detectSpot.ts`).
- "After" photo must score Clean area ≥ 60% (`src/ai/detectSpot.ts`).
- Any face over 50% confidence blocks the upload (`src/ai/faceCheck.ts`).

## How cities score (the rubric)

Every point a user earns also counts for one city:

| For the city **where the spot is** | Points |
|---|---|
| Report a spot (first 5 a day) | +20 |
| Confirm someone else's report ("I see it too") | +5 |
| Clean a spot (AI-checked "after" photo) | +30 |
| Severity bonus on a cleanup (medium / high) | +10 / +20 |
| Fast-cleanup bonus (cleaned within 72 h of the report) | +15 |
| Reporter bonus when their spot is cleaned | +10 |

| For the user's **home city** | Points |
|---|---|
| Scan and sort an item (first 20 a day) | +5 |
| Correct quiz answer (first 5 a day) | +2 |
| Daily streak | +10 |
| Weekly challenge | +50 (set per challenge) |

So the best possible cleanup is worth 65 points, and cleaning is always worth more than reporting:
the goal is clean streets, not just reported ones. The leaderboard also shows each city's
**cleanup rate** (reported spots from the last 30 days that are now cleaned) so a city can't
look good just by reporting a lot. Users see this rubric in the app under *Cities → How cities score*.

- A spot's city is the nearest listed city within 40 km of its pin (`src/lib/geo.ts`); outside all of them it counts for the reporter's home city.
- Users pick a home city and locality at sign-up (or detect it once from GPS; the location itself isn't saved). They can change city once a month.
- A city appears on the leaderboard when its first member joins or it earns its first points.
- **To add a city:** add it with its centre and localities to `src/lib/cities.ts`, and add its id to `cityIds()` in `firestore.rules`.

## How points and anti-cheat work

There are no paid Cloud Functions, so all checks live in **`firestore.rules`**:

- Every point is a document in `pointsLog`, written in the **same transaction** that adds the points to the user and the city (`src/lib/points.ts`).
- The rules check that the log entry's points match the rubric (including the cleanup bonuses, recomputed from the report's severity and age), that spot points go to the spot's city and other points to the user's home city, and that the user's and city's totals go up by **exactly** that amount.
- Log ids are `<uid>_<action>_<refId>` and can only be created once, so nothing can be earned twice. For scans, `refId` is a perceptual hash of the photo (`src/lib/phash.ts`), so the same photo can't earn twice.
- Report and confirm points need proof: the report must belong to you; the confirmation must exist; you can't confirm your own report.
- Admins can reverse any entry (*Admin → Reports → Remove → reverse points*); this writes a negative entry, so the audit trail stays complete.
- Weekly totals reset on Monday 00:00 IST without a server: each total carries a `weekId`, and the first point of a new week starts it at zero and archives last week's total (used for the winner banner).
- Daily limits (20 scans, 5 reports, 5 quiz answers) are enforced in the app.

`tests/rules.test.mjs` proves the main rules (`npm run test:rules`).

## Privacy and safety

- No photos of people: the face check runs on the phone before any upload, and every report needs the "no people" checkbox.
- Public profiles show nickname, city and points only. Email stays in Firebase Auth and is never stored in Firestore.
- The user's own location is never stored, only the pin of a submitted report.
- Scan photos stay on the phone unless the user chooses to share a correction.
- Any user can flag a photo; flagged photos are hidden until an admin reviews them.
- *Delete my account* removes the profile, reports, photos, scans, corrections and points log.
- The app never claims any link to BBMP or any government body.

## Project structure

```
src/
  app/            routes, layout, top bar, bottom nav, offline bar, install prompt, sync
  components/     Button, Card, Chip, Sheet, Toast, Avatar, EmptyState, Camera, ...
  features/
    auth/ onboarding/ home/ scan/ report/ map/ leaderboard/ learn/ profile/ admin/ legal/
  ai/             loadModel.ts, classifyWaste.ts, detectSpot.ts, faceCheck.ts
  lib/            firebase.ts, points.ts, geo.ts, i18n.ts, outbox.ts (offline queue), phash.ts, ...
  data/           tips.json, quiz.ts, learn.ts (all in 3 languages)
  i18n/           en.ts, hi.ts, kn.ts (all UI text)
  styles/         tokens.css (the only place colours are defined)
public/models/    waste-sorter/, spot-detector/, face/
public/mediapipe/ MediaPipe WebAssembly runtime (served locally, no outside calls)
scripts/          seed.mjs, make-placeholder-models.mjs
tests/            rules.test.mjs
firestore.rules  firestore.indexes.json  firebase.json
```

## Phase 2: Smart Bin

Not built yet. Per the PRD it starts only after the Phase 1 acceptance criteria pass. The
scan pipeline (`src/ai/classifyWaste.ts`) and the `scans.source` field (`phone` / `bin`) are
ready for a `/bin` Bin Station page that talks to the ESP32 over Web Serial.

## Third-party libraries, data and models

| Library | Licence | Used for |
|---|---|---|
| react, react-dom | MIT | UI |
| react-router-dom | MIT | Routing |
| vite, @vitejs/plugin-react | MIT | Build tool |
| typescript, eslint, typescript-eslint | Apache 2.0 / MIT | Code quality |
| tailwindcss, @tailwindcss/vite | MIT | Styling |
| vite-plugin-pwa (Workbox) | MIT | Offline + installable app |
| firebase | Apache 2.0 | Auth, database (incl. photos), hosting |
| @tensorflow/tfjs | Apache 2.0 | Running the AI models in the browser |
| MobileNet v2 (ImageNet), via TF Hub | Apache 2.0 | Base model for both trained classifiers and item names |
| Training photos: Wikimedia Commons + Hugging Face datasets | CC0 / CC BY / CC BY-SA / MIT (per photo) | Training the waste and spot classifiers; every photo listed in `docs/training-data-credits.md` |
| @tensorflow/tfjs-node | Apache 2.0 | Training scripts only (`scripts/training`) |
| @mediapipe/tasks-vision + BlazeFace model | Apache 2.0 | Face check |
| leaflet, react-leaflet, leaflet.markercluster, leaflet.heat | BSD-2 / Hippocratic / MIT | Map, clusters, hotspots |
| OpenStreetMap tiles | ODbL (© OpenStreetMap contributors) | Map background |
| ngeohash | MIT | Hotspot grid cells |
| browser-image-compression | MIT | Shrinking photos |
| idb-keyval | Apache 2.0 | Offline queue |
| i18next, react-i18next | MIT | Translations |
| lucide-react | ISC | Icons |
| recharts | MIT | Charts |
| canvas-confetti | ISC | Celebration burst |
| jszip | MIT | Corrections ZIP export |
| firebase-admin, @firebase/rules-unit-testing | Apache 2.0 | Seed script, rules tests (dev only) |
| Google Fonts: Poppins, Inter, Noto Sans Devanagari/Kannada | OFL | Typography |
| TACO trash dataset (if used for training) | CC BY 4.0 | Training photos: credit it here |

*Add every photo source you use for training to this table.*

## AI use disclosure

- **AI coding tool:** Claude Code (Anthropic) wrote the code in this repository from the project's PRD: the app screens, Firebase security rules, points engine, translations (English, Hindi, Kannada), seed script and rules tests. Every commit made with its help carries a `Co-Authored-By: Claude` line in the git history.
- **AI models inside the app (not generated text):**
  - Waste Sorter and Spot Detector are small classifiers trained on top of Google's MobileNet v2 (ImageNet, Apache 2.0). Claude Code collected the openly licensed training photos (Wikimedia Commons and Hugging Face datasets), cleaned them and trained the classifiers with the scripts in `scripts/training`. Every photo is credited in [`docs/training-data-credits.md`](docs/training-data-credits.md).
  - Measured with 5-fold cross-validation: Waste Sorter **92.5%** (911 photos), Spot Detector **90.1%** (736 photos). The scanner's full logic, which also uses MobileNet's own opinion, gives a correct answer 96.6% of the time, asks the user for 16% of photos and is wrong on 2.9%.
  - The face check uses Google's MediaPipe BlazeFace (Apache 2.0). All models run in the browser; sorting photos never leave the phone.
- **Known limits:** the training photos come from the web, not Indian homes, so accuracy on real local items will be lower than the numbers above. Newspaper can be mistaken for wet waste, and the street model has fewer drain photos than other classes. The two Teachable Machine slots in `public/models/` still hold placeholders, so the app uses the pre-trained classifiers.
- **What I did myself:** set the idea and requirements, reviewed and tested the app, chose the Firebase setup and deployment, and checked the AI results. I can explain every screen, the AI pipeline and the data model in my own words.
