/**
 * Seeds the LOCAL Firebase emulators with a realistic demo dataset:
 *   - ~50 users spread across every city in src/lib/cities.ts
 *   - three weeks of activity (scans, quiz, streaks, reports, confirmations,
 *     cleanups), with plenty happening THIS week
 *   - reports all over the country: open, verified and cleaned
 *   - this week's challenges and the starter quiz
 * Every user's and city's points are the sum of their pointsLog entries,
 * scored with the real rubric (src/lib/points.ts), so all screens agree.
 *
 * Usage: start the emulators, then:  npm run seed
 * It WIPES the emulators' Firestore and Auth data first, and refuses to run
 * against a real project. The output is the same every time (fixed random seed).
 *
 * Demo logins (emulator only), password: saafsaathi-demo
 *   admin@saafsaathi.test (admin, Bengaluru), aarav@saafsaathi.test (Bengaluru),
 *   diya@saafsaathi.test (City Captain, Mysuru), kabir@saafsaathi.test (Mumbai),
 *   meera@saafsaathi.test (Pune). Every other fake user is <name>@saafsaathi.test too.
 */
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { readFileSync } from 'node:fs';
import ngeohash from 'ngeohash';
import { CITIES } from '../src/lib/cities.ts';
import { STARTER_QUIZ } from '../src/data/quiz.ts';

const PROJECT = 'demo-saafsaathi';
const PASSWORD = 'saafsaathi-demo';

if (!process.env.FIRESTORE_EMULATOR_HOST.includes('127.0.0.1') && !process.env.FIRESTORE_EMULATOR_HOST.includes('localhost')) {
  throw new Error('Refusing to seed: not pointed at a local emulator.');
}

initializeApp({ projectId: PROJECT });
const auth = getAuth();
const db = getFirestore();

// ---------- helpers ----------
/** Small deterministic random generator so every run makes the same data. */
let seed = 20261010;
const rand = () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (a, b) => a + Math.floor(rand() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const chance = (p) => rand() < p;

const IST = 5.5 * 3600 * 1000;
const DAY = 86400000;
const HOUR = 3600000;
const NOW = Date.now();
const istDate = (ms) => new Date(ms + IST).toISOString().slice(0, 10);
const weekIdOf = (ms) => {
  const ist = new Date(ms + IST);
  const back = (ist.getUTCDay() + 6) % 7;
  return new Date(ist.getTime() - back * DAY).toISOString().slice(0, 10);
};
const WEEK = weekIdOf(NOW);
const LAST_WEEK = weekIdOf(NOW - 7 * DAY);
const WEEK_START = Date.parse(WEEK) - IST; // Monday 00:00 IST
const LAST_WEEK_START = WEEK_START - 7 * DAY;
/** A random moment on IST day `d` days ago, between 7am and 9pm, never in the future. */
const timeOnDay = (d) => {
  const dayStart = Date.parse(istDate(NOW - d * DAY)) - IST;
  return Math.min(NOW - 60000, dayStart + randInt(7, 21) * HOUR + randInt(0, 59) * 60000);
};

// Same palette and order as --city-1..8 in tokens.css / cityColourVar() in cities.ts.
const PALETTE = ['#7c3aed', '#d97706', '#db2777', '#0891b2', '#2563eb', '#65a30d', '#c2410c', '#4f46e5'];
const cityColour = (id) => PALETTE[CITIES.findIndex((c) => c.id === id) % PALETTE.length];

// Rubric (keep in sync with src/lib/points.ts).
const POINTS = { scan: 5, report: 20, confirm: 5, cleaned: 30, cleanedReporter: 10, quiz: 2, streak: 10 };
const SEVERITY_BONUS = { low: 0, medium: 10, high: 20 };
const cleanupPoints = (severity, createdAt, cleanedAt) =>
  POINTS.cleaned + SEVERITY_BONUS[severity] + (cleanedAt - createdAt < 71 * HOUR ? 15 : 0);

// ---------- 1. wipe Firestore + Auth in the emulators ----------
async function wipe() {
  const fsHost = process.env.FIRESTORE_EMULATOR_HOST;
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  await fetch(`http://${fsHost}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
  await fetch(`http://${authHost}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
}
await wipe();
console.log('Wiped emulator Firestore + Auth');

// ---------- 2. users ----------
const DEMO = [
  { email: 'admin@saafsaathi.test', nickname: 'Ms Rao', cityId: 'bengaluru', role: 'admin', ageGroup: '18+', level: 0.5 },
  { email: 'aarav@saafsaathi.test', nickname: 'Aarav', cityId: 'bengaluru', role: 'member', ageGroup: '13-17', level: 0.9 },
  { email: 'diya@saafsaathi.test', nickname: 'Diya', cityId: 'mysuru', role: 'captain', ageGroup: '13-17', level: 0.85 },
  { email: 'kabir@saafsaathi.test', nickname: 'Kabir', cityId: 'mumbai', role: 'member', ageGroup: '13-17', level: 0.7 },
  { email: 'meera@saafsaathi.test', nickname: 'Meera', cityId: 'pune', role: 'member', ageGroup: '18+', level: 0.6 },
];
const NAMES = [
  'Ishaan', 'Ananya', 'Vihaan', 'Saanvi', 'Arjun', 'Kavya', 'Reyansh', 'Myra', 'Advik', 'Aadhya', 'Krishna', 'Anika',
  'Rohan', 'Tara', 'Dev', 'Nisha', 'Kunal', 'Pooja', 'Yash', 'Sneha', 'Rahul', 'Priya', 'Aditya', 'Lakshmi', 'Harsh',
  'Zoya', 'Siddharth', 'Riya', 'Farhan', 'Gauri', 'Nikhil', 'Bhavna', 'Tanvi', 'Om', 'Ira', 'Manav', 'Shreya',
  'Varun', 'Aisha', 'Pranav', 'Divya', 'Kiran', 'Neel', 'Sana', 'Abhay',
];
// More users in the bigger cities, at least two everywhere.
const WEIGHT = { bengaluru: 6, mumbai: 5, delhi: 5, pune: 3, chennai: 3, hyderabad: 3, kolkata: 3, mysuru: 3 };
const cityQueue = CITIES.flatMap((c) => Array(WEIGHT[c.id] ?? 2).fill(c.id));
const people = [...DEMO];
NAMES.forEach((name, i) => {
  people.push({
    email: `${name.toLowerCase()}@saafsaathi.test`,
    nickname: name,
    cityId: cityQueue[i % cityQueue.length],
    role: i % 9 === 0 ? 'captain' : 'member',
    ageGroup: chance(0.7) ? '13-17' : '18+',
    level: 0.25 + rand() * 0.7, // how active they are
  });
});

for (const p of people) {
  const user = await auth.createUser({ email: p.email, password: PASSWORD, displayName: p.nickname });
  p.uid = user.uid;
  const city = CITIES.find((c) => c.id === p.cityId);
  p.locality = p.email.startsWith('aarav') || p.email.startsWith('admin') ? 'Indiranagar' : pick(city.localities).name;
  p.logs = [];
  p.stats = { scans: 0, reports: 0, cleaned: 0, quizCorrect: 0, confirms: 0 };
  p.activeDays = new Set();
}
const byCity = (cityId) => people.filter((p) => p.cityId === cityId);
console.log(`Created ${people.length} users`);

const writer = db.bulkWriter();
const log = (p, action, points, refId, cityId, at) => {
  const id = `${p.uid}_${action}_${refId}`.replace(/[^A-Za-z0-9_-]/g, '-');
  const entry = { uid: p.uid, cityId, action, points, refId, createdAt: Timestamp.fromMillis(at) };
  p.logs.push(entry);
  writer.set(db.doc(`pointsLog/${id}`), entry);
};

// ---------- 3. personal activity: scans, quiz, streaks (home city) ----------
const CATS = ['wet', 'wet', 'wet', 'dry', 'dry', 'hazardous', 'notwaste'];
for (const p of people) {
  for (let d = 20; d >= 0; d--) {
    // Busier this week, so the weekly board is lively.
    const thisWeek = timeOnDay(d) >= WEEK_START;
    if (!chance(p.level * (thisWeek ? 0.95 : 0.6))) continue;
    p.activeDays.add(d);
    const scans = randInt(1, Math.max(1, Math.round(9 * p.level)));
    for (let k = 0; k < scans; k++) {
      const at = timeOnDay(d);
      const category = pick(CATS);
      const corrected = chance(0.12);
      writer.set(db.collection('scans').doc(), {
        uid: p.uid, cityId: p.cityId, category, aiCategory: corrected ? pick(CATS) : category,
        confidence: Math.round((0.7 + rand() * 0.29) * 1000) / 1000, corrected, source: 'phone', createdAt: Timestamp.fromMillis(at),
      });
      if (category === 'notwaste' || k >= 20) continue;
      log(p, 'scan', POINTS.scan, `seed-${d}-${k}`, p.cityId, at);
      p.stats.scans++;
    }
    if (chance(0.45)) {
      const correct = randInt(1, 5);
      for (let q = 0; q < correct; q++) log(p, 'quiz', POINTS.quiz, `${istDate(NOW - d * DAY)}-q${q}`, p.cityId, timeOnDay(d));
      p.stats.quizCorrect += correct;
    }
    // Streak bonus when yesterday was also active.
    if (p.activeDays.has(d + 1)) log(p, 'streak', POINTS.streak, istDate(NOW - d * DAY), p.cityId, timeOnDay(d));
  }
}

// ---------- 4. reports all over the country ----------
const TYPES = ['dump', 'dump', 'bin', 'bin', 'drain', 'littering'];
const PHOTO = { dump: 'dump', bin: 'bin', drain: 'drain', littering: 'littering', other: 'dump' };
const NOTES = ['', '', '', 'Behind the bus stop, been here a week', 'Near the school gate', 'Smells bad after rain', 'Next to the vegetable market', 'Blocking the footpath'];
const REPORTS_PER_CITY = { bengaluru: 14, mumbai: 9, delhi: 9, pune: 6, chennai: 6, hyderabad: 6, kolkata: 6, mysuru: 6 };

// Photos live in Firestore (see src/lib/photos.ts). The demo images are small
// PNGs, so the same data URL doubles as the thumbnail.
const PNG = Object.fromEntries(
  ['dump', 'bin', 'drain', 'littering', 'clean'].map((f) => [f, `data:image/png;base64,${readFileSync(`scripts/seed-assets/${f}.png`).toString('base64')}`]),
);
function savePhoto(id, file, uid, at) {
  writer.set(db.doc(`photos/${id}`), { uid, data: PNG[file], createdAt: Timestamp.fromMillis(at) });
  return `photo:${id}`;
}

const reports = [];
for (const city of CITIES) {
  const n = REPORTS_PER_CITY[city.id] ?? 4;
  for (let i = 0; i < n; i++) {
    let loc = pick(city.localities);
    let jitter = 0.004;
    // Bengaluru: three dumps close together in Indiranagar make a hotspot.
    if (city.id === 'bengaluru' && i < 3) {
      loc = city.localities.find((l) => l.name === 'Indiranagar');
      jitter = 0.0006;
    }
    reports.push({
      city,
      locality: loc.name,
      lat: loc.lat + (rand() - 0.5) * jitter,
      lng: loc.lng + (rand() - 0.5) * jitter,
      type: city.id === 'bengaluru' && i < 3 ? 'dump' : pick(TYPES),
      severity: pick(['low', 'medium', 'medium', 'high']),
      createdAt: NOW - randInt(2, 20 * 24) * HOUR,
    });
  }
}

let reportNo = 0;
for (const r of reports) {
  const id = `seedreport${reportNo++}`;
  const locals = byCity(r.city.id);
  const reporter = chance(0.85) && locals.length ? pick(locals) : pick(people); // some people report while travelling
  const roll = rand();
  const status = roll < 0.4 ? 'cleaned' : roll < 0.6 ? 'verified' : 'open';
  const confirmers = people.filter((p) => p !== reporter && (p.cityId === r.city.id || chance(0.05)));
  const confirmCount = Math.min(confirmers.length, status === 'open' ? randInt(0, 2) : randInt(3, 5));
  const chosen = [...confirmers].sort(() => rand() - 0.5).slice(0, confirmCount);

  log(reporter, 'report', POINTS.report, id, r.city.id, r.createdAt);
  reporter.stats.reports++;
  reporter.activeDays.add(Math.floor((NOW - r.createdAt) / DAY));

  let verifiedAt = null;
  chosen.forEach((c, k) => {
    const at = Math.min(NOW - 60000, r.createdAt + (k + 1) * randInt(1, 10) * HOUR);
    writer.set(db.doc(`reports/${id}/confirmations/${c.uid}`), { createdAt: Timestamp.fromMillis(at) });
    log(c, 'confirm', POINTS.confirm, id, r.city.id, at);
    c.stats.confirms++;
    if (k === 2) verifiedAt = at;
  });

  let cleanedAt = null;
  let cleaner = null;
  if (status === 'cleaned') {
    cleanedAt = Math.min(NOW - 60000, r.createdAt + randInt(4, 6 * 24) * HOUR);
    cleaner = pick(locals.filter((p) => p !== reporter)) ?? pick(people.filter((p) => p !== reporter));
    log(cleaner, 'cleaned', cleanupPoints(r.severity, r.createdAt, cleanedAt), id, r.city.id, cleanedAt);
    cleaner.stats.cleaned++;
    log(reporter, 'cleanedReporter', POINTS.cleanedReporter, id, r.city.id, cleanedAt);
  }

  const imageUrl = savePhoto(`${id}_before`, PHOTO[r.type], reporter.uid, r.createdAt);
  const afterImageUrl = status === 'cleaned' ? savePhoto(`${id}_after`, 'clean', cleaner.uid, cleanedAt) : null;
  writer.set(db.doc(`reports/${id}`), {
    uid: reporter.uid,
    nickname: reporter.nickname,
    cityId: r.city.id,
    type: r.type,
    severity: r.severity,
    aiType: r.type,
    aiConfidence: Math.round((0.6 + rand() * 0.38) * 1000) / 1000,
    imageUrl,
    thumbUrl: PNG[PHOTO[r.type]],
    afterImageUrl,
    afterThumbUrl: afterImageUrl ? PNG.clean : null,
    lat: r.lat,
    lng: r.lng,
    geohash: ngeohash.encode(r.lat, r.lng, 7),
    locality: r.locality,
    note: pick(NOTES),
    status,
    confirmCount,
    flagged: false,
    createdAt: Timestamp.fromMillis(r.createdAt),
    verifiedAt: status !== 'open' ? Timestamp.fromMillis(verifiedAt ?? r.createdAt + 6 * HOUR) : null,
    cleanedAt: cleanedAt ? Timestamp.fromMillis(cleanedAt) : null,
    cleanedBy: cleaner?.uid ?? null,
    reporterBonusClaimed: true,
  });
}
console.log(`Created ${reports.length} reports in ${CITIES.length} cities`);

// ---------- 5. totals: users and cities from their logs ----------
const BADGE_RULES = [
  ['firstScan', (p) => p.stats.scans >= 1],
  ['sortingPro', (p) => p.stats.scans >= 100],
  ['streetHero', (p) => p.stats.reports >= 10],
  ['cleanupChampion', (p) => p.stats.cleaned >= 5],
  ['streak7', (p) => p.streakDays >= 7],
  ['quizWhiz', (p) => p.stats.quizCorrect >= 25],
];
const sum = (logs, from, to = Infinity) =>
  logs.filter((l) => l.createdAt.toMillis() >= from && l.createdAt.toMillis() < to).reduce((s, l) => s + l.points, 0);

for (const p of people) {
  // Current streak: consecutive active days ending today or yesterday.
  let streak = 0;
  const start = p.activeDays.has(0) ? 0 : 1;
  for (let d = start; p.activeDays.has(d); d++) streak++;
  p.streakDays = streak;
  const lastActive = [...p.activeDays].sort((a, b) => a - b)[0];
  const todayLogs = p.logs.filter((l) => istDate(l.createdAt.toMillis()) === istDate(NOW));
  writer.set(db.doc(`users/${p.uid}`), {
    nickname: p.nickname,
    ageGroup: p.ageGroup,
    cityId: p.cityId,
    locality: p.locality,
    language: 'en',
    role: p.role,
    points: sum(p.logs, 0),
    weeklyPoints: sum(p.logs, WEEK_START),
    weekId: WEEK,
    streakDays: streak,
    lastActiveDate: lastActive === undefined ? '' : istDate(NOW - lastActive * DAY),
    badges: BADGE_RULES.filter(([, ok]) => ok(p)).map(([id]) => id),
    stats: p.stats,
    daily: {
      date: istDate(NOW),
      scan: todayLogs.filter((l) => l.action === 'scan').length,
      report: todayLogs.filter((l) => l.action === 'report').length,
      quiz: todayLogs.filter((l) => l.action === 'quiz').length,
    },
    joinedChallenges: [],
    lastLogId: '',
    cityChangedAt: null,
    createdAt: Timestamp.fromMillis(NOW - randInt(21, 60) * DAY),
  });
}

const allLogs = people.flatMap((p) => p.logs);
const activeCities = new Set([...people.map((p) => p.cityId), ...allLogs.map((l) => l.cityId)]);
for (const cityId of activeCities) {
  const logs = allLogs.filter((l) => l.cityId === cityId);
  writer.set(db.doc(`cities/${cityId}`), {
    name: CITIES.find((c) => c.id === cityId).name.en,
    colour: cityColour(cityId),
    points: sum(logs, 0),
    weeklyPoints: sum(logs, WEEK_START),
    weekId: WEEK,
    prevWeekId: LAST_WEEK,
    prevWeeklyPoints: sum(logs, LAST_WEEK_START, WEEK_START),
    memberCount: byCity(cityId).length,
    lastLogId: '',
    ...(cityId === 'mysuru' ? { announcement: 'Clean-up drive at Gokulam park on Sunday, 8 am. Bring gloves!' } : {}),
  });
}

// ---------- 6. quiz + this week's challenges ----------
for (const q of STARTER_QUIZ) {
  for (const lang of ['en', 'hi', 'kn']) {
    const x = q.text[lang];
    writer.set(db.doc(`quizQuestions/${q.id}-${lang}`), { question: x.q, options: x.options, answerIndex: q.answerIndex, explanation: x.why, language: lang });
  }
}
const challenges = [
  { title: 'Scan 20 items', description: 'Sort 20 pieces of household waste this week.', action: 'scan', target: 20, rewardPoints: 50 },
  { title: 'Report 3 spots', description: 'Find and report 3 garbage spots or blocked drains.', action: 'report', target: 3, rewardPoints: 50 },
  { title: 'Get 1 spot cleaned', description: 'Clean up (or get cleaned) one reported spot.', action: 'cleaned', target: 1, rewardPoints: 50 },
];
challenges.forEach((c, i) =>
  writer.set(db.doc(`challenges/starter-${WEEK}-${i}`), {
    ...c,
    startDate: Timestamp.fromMillis(WEEK_START),
    endDate: Timestamp.fromMillis(WEEK_START + 7 * DAY - 1000),
  }),
);

await writer.close();

const ranking = [...activeCities]
  .map((id) => [id, sum(allLogs.filter((l) => l.cityId === id), WEEK_START)])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 5)
  .map(([id, pts]) => `${id} ${pts}`)
  .join(', ');
console.log(`Wrote ${allLogs.length} points-log entries. This week's top cities: ${ranking}`);
console.log(`Done. Demo password for all *@saafsaathi.test users: ${PASSWORD}`);
process.exit(0);
