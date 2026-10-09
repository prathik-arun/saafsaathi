/**
 * Security rules tests (anti-cheat + privacy). Run with:
 *   npm run test:rules
 * (starts a Firestore emulator just for the tests, then runs this file).
 */
import { after, before, beforeEach, describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, getDoc, increment, runTransaction, serverTimestamp, setDoc, Timestamp, updateDoc, writeBatch } from 'firebase/firestore';

let env;
const WEEK = '2026-09-28';

const user = (cityId = 'bengaluru', extra = {}) => ({
  nickname: 'Aarav', ageGroup: '13-17', cityId, locality: 'Indiranagar', language: 'en', role: 'member',
  points: 0, weeklyPoints: 0, weekId: WEEK, streakDays: 0, lastActiveDate: '', badges: [],
  stats: { scans: 0, reports: 0, cleaned: 0, quizCorrect: 0, confirms: 0 },
  daily: { date: '', scan: 0, report: 0, quiz: 0 }, joinedChallenges: [], lastLogId: '', cityChangedAt: null, ...extra,
});
const city = { name: 'Bengaluru', colour: '#7c3aed', points: 0, weeklyPoints: 0, weekId: WEEK, prevWeekId: '', prevWeeklyPoints: 0, memberCount: 1, lastLogId: '' };

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
after(() => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'cities/bengaluru'), city);
    await setDoc(doc(db, 'cities/mysuru'), { ...city, name: 'Mysuru' });
    await setDoc(doc(db, 'users/alice'), user());
    await setDoc(doc(db, 'users/bob'), user('mysuru', { nickname: 'Bob' }));
    await setDoc(doc(db, 'reports/r1'), {
      uid: 'bob', nickname: 'Bob', cityId: 'mysuru', type: 'dump', severity: 'high', status: 'open', confirmCount: 0,
      flagged: false, cleanedBy: null, afterImageUrl: null, reporterBonusClaimed: false, lat: 12.33, lng: 76.63, note: '',
      createdAt: Timestamp.fromMillis(Date.now() - 24 * 3600 * 1000),
    });
  });
});

/** The same batch the app writes in src/lib/points.ts. */
function awardBatch(db, { uid = 'alice', action = 'scan', refId = 'hash1', points = 5, userPoints = points, cityPoints = points, cityId = 'bengaluru', extra } = {}) {
  const logId = `${uid}_${action}_${refId}`;
  const b = writeBatch(db);
  b.set(doc(db, 'pointsLog', logId), { uid, cityId, action, points, refId, createdAt: serverTimestamp() });
  b.update(doc(db, 'users', uid), { points: userPoints, weeklyPoints: userPoints, weekId: WEEK, lastLogId: logId });
  b.update(doc(db, 'cities', cityId), { points: cityPoints, weeklyPoints: cityPoints, lastLogId: logId });
  extra?.(b);
  return b.commit();
}

describe('points', () => {
  it('lets a user earn 5 points for a scan', async () => {
    await assertSucceeds(awardBatch(env.authenticatedContext('alice').firestore()));
  });
  it('rejects more points than the table allows', async () => {
    await assertFails(awardBatch(env.authenticatedContext('alice').firestore(), { points: 500 }));
  });
  it('rejects a total that does not match the log entry', async () => {
    await assertFails(awardBatch(env.authenticatedContext('alice').firestore(), { userPoints: 50 }));
  });
  it('rejects changing points without a log entry', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), { points: 1000 }));
  });
  it('rejects earning twice for the same photo', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(awardBatch(db));
    await assertFails(awardBatch(db, { userPoints: 10, cityPoints: 10 }));
  });
  it('rejects writing points for someone else', async () => {
    const db = env.authenticatedContext('bob').firestore();
    await assertFails(awardBatch(db));
  });
  it('rejects a report award when the report is not mine', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(awardBatch(db, { action: 'report', refId: 'r1', points: 20 }));
  });
  it('lets a transaction check for a missing log entry of mine, but not of others', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'pointsLog/alice_scan_x')));
    await assertFails(getDoc(doc(db, 'pointsLog/bob_scan_x')));
  });
});

describe('profiles', () => {
  it('blocks users from making themselves admin', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/alice'), { role: 'admin' }));
  });
  it('blocks editing another user', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'users/bob'), { nickname: 'hacked' }));
  });
  it('allows joining a city with a +1 member count', async () => {
    const db = env.authenticatedContext('carol').firestore();
    const b = writeBatch(db);
    b.set(doc(db, 'users/carol'), user('mysuru', { nickname: 'Carol' }));
    b.update(doc(db, 'cities/mysuru'), { memberCount: increment(1) });
    await assertSucceeds(b.commit());
  });
  it('blocks bumping a city member count without joining', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'cities/mysuru'), { memberCount: increment(5) }));
  });
  it('blocks joining a city that is not on the list', async () => {
    const db = env.authenticatedContext('carol').firestore();
    await assertFails(setDoc(doc(db, 'users/carol'), user('atlantis', { nickname: 'Carol' })));
  });
});

describe('reports', () => {
  it('blocks confirming your own report', async () => {
    const db = env.authenticatedContext('bob').firestore();
    const b = writeBatch(db);
    b.set(doc(db, 'reports/r1/confirmations/bob'), { createdAt: serverTimestamp() });
    b.update(doc(db, 'reports/r1'), { confirmCount: 1 });
    await assertFails(b.commit());
  });
  it("allows confirming someone else's report once", async () => {
    const db = env.authenticatedContext('alice').firestore();
    const confirm = () =>
      runTransaction(db, async (tx) => {
        tx.set(doc(db, 'reports/r1/confirmations/alice'), { createdAt: serverTimestamp() });
        tx.update(doc(db, 'reports/r1'), { confirmCount: increment(1) });
      });
    await assertSucceeds(confirm());
    await assertFails(confirm());
  });
  it('blocks members from verifying or deleting reports', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(updateDoc(doc(db, 'reports/r1'), { status: 'verified' }));
  });
  it('lets anyone flag a photo', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(updateDoc(doc(db, 'reports/r1'), { flagged: true }));
  });
  it('lets admins verify', async () => {
    await env.withSecurityRulesDisabled((ctx) => updateDoc(doc(ctx.firestore(), 'users/alice'), { role: 'admin' }));
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(updateDoc(doc(db, 'reports/r1'), { status: 'verified' }));
  });
});

describe('city rubric', () => {
  /** Alice cleans Bob's Mysuru report (high severity, reported 24 h ago). */
  const clean = (db, points, cityId = 'mysuru') =>
    awardBatch(db, {
      action: 'cleaned', refId: 'r1', points, cityId,
      extra: (b) => b.update(doc(db, 'reports/r1'), { status: 'cleaned', cleanedBy: 'alice', afterImageUrl: 'photo:r1_after', afterThumbUrl: 'data:image/jpeg;base64,x', cleanedAt: serverTimestamp() }),
    });

  it('scan points must go to my home city', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(awardBatch(db, { cityId: 'mysuru' }));
    await assertSucceeds(awardBatch(db, { cityId: 'bengaluru' }));
  });
  it('cleanup gives 30 + 20 (high severity) + 15 (fast) to the spot city', async () => {
    await assertSucceeds(clean(env.authenticatedContext('alice').firestore(), 65));
  });
  it('cleanup without the fast bonus is also accepted', async () => {
    await assertSucceeds(clean(env.authenticatedContext('alice').firestore(), 50));
  });
  it('rejects inflated cleanup points', async () => {
    await assertFails(clean(env.authenticatedContext('alice').firestore(), 100));
  });
  it("rejects cleanup points sent to my home city instead of the spot's city", async () => {
    await assertFails(clean(env.authenticatedContext('alice').firestore(), 65, 'bengaluru'));
  });
  it('rejects the fast bonus after 72 hours', async () => {
    await env.withSecurityRulesDisabled((ctx) =>
      updateDoc(doc(ctx.firestore(), 'reports/r1'), { createdAt: Timestamp.fromMillis(Date.now() - 80 * 3600 * 1000) }),
    );
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(clean(db, 65));
    await assertSucceeds(clean(db, 50));
  });
});

describe('photos', () => {
  const photo = (uid, data = 'data:image/jpeg;base64,AAAA') => ({ uid, data, createdAt: serverTimestamp() });
  it('lets me save my own photo once', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(setDoc(doc(db, 'photos/r9_before'), photo('alice')));
    await assertFails(setDoc(doc(db, 'photos/r9_before'), photo('alice')));
  });
  it('blocks photos saved in someone else\'s name or that are not images', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertFails(setDoc(doc(db, 'photos/r9_before'), photo('bob')));
    await assertFails(setDoc(doc(db, 'photos/r9_before'), photo('alice', 'hello')));
  });
  it('lets me save a correction photo (checking first that it does not exist)', async () => {
    const db = env.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'correctionPhotos/new1')));
    await assertSucceeds(setDoc(doc(db, 'correctionPhotos/new1'), photo('alice')));
  });
  it('keeps correction photos private to their owner', async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'correctionPhotos/c1'), { uid: 'alice', data: 'x' }));
    await assertSucceeds(getDoc(doc(env.authenticatedContext('alice').firestore(), 'correctionPhotos/c1')));
    await assertFails(getDoc(doc(env.authenticatedContext('bob').firestore(), 'correctionPhotos/c1')));
  });
});
