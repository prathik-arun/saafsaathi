/**
 * Removes the demo data that `npm run seed:live` put in the REAL project:
 * every document whose id starts with "seed" (users, points log, scans,
 * reports + their confirmations, photos). Then it recomputes each city's
 * totals from the points log that is left, so real users' points stay right.
 * The quiz questions and challenges are kept (they're real content).
 *
 * Usage: npm run seed:clear-live
 */
import { Ts, accessToken, defaultProject, restClient } from './lib/firestore-rest.mjs';

const PROJECT = defaultProject();
const rest = restClient(PROJECT, accessToken());
console.log(`Clearing demo data from LIVE project ${PROJECT}`);

const isSeed = (id) => id.startsWith('seed');
const toDelete = [];

for (const col of ['users', 'pointsLog', 'scans', 'photos']) {
  const docs = (await rest.list(col, ['createdAt'])).filter((d) => isSeed(d.id));
  toDelete.push(...docs.map((d) => d.path));
  console.log(`  ${col}: ${docs.length} demo documents`);
}
const reports = (await rest.list('reports', ['createdAt'])).filter((d) => isSeed(d.id));
for (const r of reports) {
  const confs = await rest.list(`reports/${r.id}/confirmations`, ['createdAt']);
  toDelete.push(...confs.map((c) => c.path), r.path);
}
console.log(`  reports: ${reports.length} demo reports (with their confirmations)`);
await rest.deleteAll(toDelete);

// Recompute city totals from what's left (real users only).
const IST = 5.5 * 3600 * 1000;
const DAY = 86400000;
const weekIdOf = (ms) => {
  const ist = new Date(ms + IST);
  return new Date(ist.getTime() - ((ist.getUTCDay() + 6) % 7) * DAY).toISOString().slice(0, 10);
};
const NOW = Date.now();
const WEEK = weekIdOf(NOW);
const WEEK_START = Date.parse(WEEK) - IST;
const LAST_WEEK_START = WEEK_START - 7 * DAY;

const logs = await rest.list('pointsLog', ['cityId', 'points', 'createdAt']);
const users = await rest.list('users', ['cityId']);
const cities = await rest.list('cities');
const writer = rest.writer();
const keep = [];
for (const c of cities) {
  const mine = logs.filter((l) => l.data.cityId === c.id);
  const at = (l) => (l.data.createdAt instanceof Ts ? l.data.createdAt.ms : 0);
  const sum = (from, to = Infinity) => mine.filter((l) => at(l) >= from && at(l) < to).reduce((s, l) => s + (l.data.points ?? 0), 0);
  const members = users.filter((u) => u.data.cityId === c.id).length;
  if (!mine.length && !members) continue; // nothing real left: remove the city from the board
  keep.push(c.id);
  const { announcement, ...rest } = c.data;
  writer.set(c.path, {
    ...rest,
    points: sum(0),
    weeklyPoints: sum(WEEK_START),
    weekId: WEEK,
    prevWeekId: weekIdOf(NOW - 7 * DAY),
    prevWeeklyPoints: sum(LAST_WEEK_START, WEEK_START),
    memberCount: members,
    lastLogId: '',
    ...(announcement && !c.id.startsWith('seed') && c.id !== 'mysuru' ? { announcement } : {}),
  });
}
await writer.flush();
await rest.deleteAll(cities.filter((c) => !keep.includes(c.id)).map((c) => c.path));

console.log(`Deleted ${toDelete.length} demo documents. ${keep.length} cities still have real activity.`);
