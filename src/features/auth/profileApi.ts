/**
 * Profile actions: create the profile (and join a city), change city,
 * update settings, and delete the account with all its data.
 */
import { deleteUser, signOut } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { auth, db, storage } from '../../lib/firebase';
import { cityColourVar, findCity, tokenValue } from '../../lib/cities';
import type { AgeGroup, Lang, UserDoc } from '../../lib/types';

/** Create a city's leaderboard document (with zero points) if it doesn't exist yet. */
export async function ensureCity(cityId: string): Promise<void> {
  const r = doc(db, 'cities', cityId);
  if ((await getDoc(r)).exists()) return;
  await setDoc(r, {
    name: findCity(cityId)?.name.en ?? cityId,
    colour: tokenValue(cityColourVar(cityId)),
    points: 0,
    weeklyPoints: 0,
    weekId: '',
    prevWeekId: '',
    prevWeeklyPoints: 0,
    memberCount: 0,
    lastLogId: '',
  }).catch(() => undefined); // someone else created it at the same moment
}

export interface NewProfile {
  nickname: string;
  ageGroup: AgeGroup;
  locality: string;
  language: Lang;
  cityId: string;
}

/** Save the profile and add one member to the chosen city, in one batch. */
export async function createProfile(uid: string, p: NewProfile): Promise<void> {
  await ensureCity(p.cityId);
  const batch = writeBatch(db);
  const user: Omit<UserDoc, 'createdAt' | 'cityChangedAt'> & Record<string, unknown> = {
    ...p,
    nickname: p.nickname.trim(),
    role: 'member',
    points: 0,
    weeklyPoints: 0,
    weekId: '',
    streakDays: 0,
    lastActiveDate: '',
    badges: [],
    stats: { scans: 0, reports: 0, cleaned: 0, quizCorrect: 0, confirms: 0 },
    daily: { date: '', scan: 0, report: 0, quiz: 0 },
    joinedChallenges: [],
    lastLogId: '',
    cityChangedAt: null,
    createdAt: serverTimestamp(),
  };
  batch.set(doc(db, 'users', uid), user);
  batch.update(doc(db, 'cities', p.cityId), { memberCount: increment(1) });
  await batch.commit();
}

/** Settings that don't affect points (language, nickname, locality, ...). */
export function updateProfile(uid: string, data: Partial<Pick<UserDoc, 'language' | 'nickname' | 'locality' | 'joinedChallenges'>>) {
  return updateDoc(doc(db, 'users', uid), data);
}

/** Move to another home city (once every 30 days; points already earned stay with the old city). */
export async function changeCity(uid: string, from: string, to: string, locality: string): Promise<void> {
  await ensureCity(to);
  const batch = writeBatch(db);
  batch.update(doc(db, 'users', uid), { cityId: to, locality, cityChangedAt: serverTimestamp() });
  batch.update(doc(db, 'cities', from), { memberCount: increment(-1) });
  batch.update(doc(db, 'cities', to), { memberCount: increment(1) });
  await batch.commit();
}

/** Delete a Storage file, ignoring "not found". */
async function deleteFile(path: string) {
  await deleteObject(ref(storage, path)).catch(() => undefined);
}

/**
 * Delete my account: my reports and their photos, my scans, my corrections,
 * my points log and my profile, then the login itself.
 */
export async function deleteAccount(uid: string, cityId: string): Promise<void> {
  const mine = (col: string) => getDocs(query(collection(db, col), where('uid', '==', uid)));

  const reports = await mine('reports');
  for (const r of reports.docs) {
    await deleteFile(`reports/${r.id}/before.jpg`);
    await deleteFile(`reports/${r.id}/after.jpg`);
  }
  const corrections = await mine('corrections');
  for (const c of corrections.docs) await deleteFile(c.data().imagePath);

  // Delete documents in batches of up to 400 writes.
  const toDelete = [...reports.docs, ...(await mine('scans')).docs, ...corrections.docs].map((d) => d.ref);
  for (let i = 0; i < toDelete.length; i += 400) {
    const batch = writeBatch(db);
    toDelete.slice(i, i + 400).forEach((r) => batch.delete(r));
    await batch.commit();
  }

  // Points log entries can only be deleted in the same batch as the profile.
  const logs = (await mine('pointsLog')).docs.map((d) => d.ref);
  for (let i = 0; i < logs.length || i === 0; i += 400) {
    const batch = writeBatch(db);
    logs.slice(i, i + 400).forEach((r) => batch.delete(r));
    if (i + 400 >= logs.length) {
      batch.delete(doc(db, 'users', uid));
      batch.update(doc(db, 'cities', cityId), { memberCount: increment(-1) });
    }
    await batch.commit();
  }

  const current = auth.currentUser;
  if (current) {
    try {
      await deleteUser(current);
    } catch {
      // Firebase asks for a recent sign-in to delete the login; the data is
      // already gone, so just sign out.
      await signOut(auth);
    }
  }
}
