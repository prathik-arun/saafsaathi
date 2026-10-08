/**
 * Admin actions. Firestore rules only allow these for users with role "admin".
 * To make the first admin, set role: "admin" on their users/{uid} document in
 * the Firebase console (or the emulator UI).
 */
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { deletePhoto } from '../../lib/photos';
import { pointsLogId } from '../../lib/points';
import { weekId } from '../../lib/time';
import type { ChallengeDoc, CityDoc, PointsLogDoc, Role, UserDoc } from '../../lib/types';
import { STARTER_QUIZ } from '../../data/quiz';

export function verifyReport(id: string) {
  return updateDoc(doc(db, 'reports', id), { status: 'verified', verifiedAt: serverTimestamp() });
}

export function adminMarkCleaned(id: string, adminUid: string) {
  return updateDoc(doc(db, 'reports', id), { status: 'cleaned', cleanedAt: serverTimestamp(), cleanedBy: adminUid });
}

export function approvePhoto(id: string) {
  return updateDoc(doc(db, 'reports', id), { flagged: false });
}

/**
 * Reverse one points log entry: writes a negative entry and subtracts the
 * points from the user and the city, so the audit trail stays complete.
 */
export async function reversePoints(logId: string): Promise<void> {
  const logSnap = await getDoc(doc(db, 'pointsLog', logId));
  if (!logSnap.exists()) return;
  const log = logSnap.data() as PointsLogDoc;
  const reverseId = `reverse_${logId}`;
  if ((await getDoc(doc(db, 'pointsLog', reverseId))).exists()) return;

  const userRef = doc(db, 'users', log.uid);
  const cityRef = doc(db, 'cities', log.cityId);
  const [user, city] = [(await getDoc(userRef)).data() as UserDoc | undefined, (await getDoc(cityRef)).data() as CityDoc | undefined];
  const week = weekId();
  const loggedWeek = weekId(log.createdAt.toDate());

  const batch = writeBatch(db);
  batch.set(doc(db, 'pointsLog', reverseId), { ...log, points: -log.points, action: log.action, refId: `reverse-${log.refId}`, createdAt: serverTimestamp() });
  if (user)
    batch.update(userRef, {
      points: Math.max(0, user.points - log.points),
      ...(user.weekId === week && loggedWeek === week ? { weeklyPoints: Math.max(0, user.weeklyPoints - log.points) } : {}),
    });
  if (city)
    batch.update(cityRef, {
      points: Math.max(0, city.points - log.points),
      ...(city.weekId === week && loggedWeek === week ? { weeklyPoints: Math.max(0, city.weeklyPoints - log.points) } : {}),
    });
  await batch.commit();
}

/** Remove a report and its photos; optionally reverse the reporter's +20. */
export async function removeReport(id: string, reporterUid: string, reverse: boolean): Promise<void> {
  if (reverse) await reversePoints(pointsLogId(reporterUid, 'report', id));
  const report = (await getDoc(doc(db, 'reports', id))).data();
  await Promise.all([deletePhoto(report?.imageUrl), deletePhoto(report?.afterImageUrl)]);
  await deleteDoc(doc(db, 'reports', id));
}

export function updateCity(id: string, data: Partial<Pick<CityDoc, 'colour'>>) {
  return updateDoc(doc(db, 'cities', id), data);
}

export function setRole(uid: string, role: Role) {
  return updateDoc(doc(db, 'users', uid), { role });
}

export type ChallengeInput = Omit<ChallengeDoc, 'startDate' | 'endDate'> & { startDate: Date; endDate: Date };

export async function saveChallenge(id: string | null, c: ChallengeInput) {
  const data = { ...c, startDate: Timestamp.fromDate(c.startDate), endDate: Timestamp.fromDate(c.endDate) };
  const r = id ? doc(db, 'challenges', id) : doc(collection(db, 'challenges'));
  const batch = writeBatch(db);
  batch.set(r, data);
  await batch.commit();
}

export function deleteChallenge(id: string) {
  return deleteDoc(doc(db, 'challenges', id));
}

/** Copy the built-in quiz questions into Firestore and create this week's default challenges. */
export async function loadStarterContent(): Promise<void> {
  const batch = writeBatch(db);
  for (const q of STARTER_QUIZ) {
    for (const lang of ['en', 'hi', 'kn'] as const) {
      const x = q.text[lang];
      batch.set(doc(db, 'quizQuestions', `${q.id}-${lang}`), {
        question: x.q,
        options: x.options,
        answerIndex: q.answerIndex,
        explanation: x.why,
        language: lang,
      });
    }
  }
  // This week (Monday 00:00 IST) to next Monday.
  const start = new Date(Date.parse(weekId()) - 5.5 * 3600 * 1000);
  const end = new Date(start.getTime() + 7 * 86400000 - 1000);
  const defaults: Omit<ChallengeDoc, 'startDate' | 'endDate'>[] = [
    { title: 'Scan 20 items', description: 'Sort 20 pieces of household waste this week.', action: 'scan', target: 20, rewardPoints: 50 },
    { title: 'Report 3 spots', description: 'Find and report 3 garbage spots or blocked drains.', action: 'report', target: 3, rewardPoints: 50 },
    { title: 'Get 1 spot cleaned', description: 'Clean up (or get cleaned) one reported spot.', action: 'cleaned', target: 1, rewardPoints: 50 },
  ];
  defaults.forEach((c, i) =>
    batch.set(doc(db, 'challenges', `starter-${weekId()}-${i}`), { ...c, startDate: Timestamp.fromDate(start), endDate: Timestamp.fromDate(end) }),
  );
  await batch.commit();
}

/** All documents in a collection (admin-only; fine for a school-sized app). */
export async function getAll<T>(col: string): Promise<(T & { id: string })[]> {
  const snap = await getDocs(collection(db, col));
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }));
}
