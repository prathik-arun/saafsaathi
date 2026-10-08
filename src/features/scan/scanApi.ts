/**
 * Saving scans: one `scans` document per item (for admin stats) and +5 points
 * (first 20 scans a day; the same photo can never earn twice). Works offline
 * by going through the outbox.
 */
import { addDoc, collection, doc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { savePhoto } from '../../lib/photos';
import { enqueue, isNetworkError, registerOutboxHandler, type OutboxJob } from '../../lib/outbox';
import { awardPoints, awardStreakBonus, type AwardResult } from '../../lib/points';
import type { WasteLabel } from '../../lib/types';

export interface ScanInput {
  uid: string;
  category: WasteLabel;
  aiCategory: WasteLabel;
  confidence: number;
  corrected: boolean;
  /** Perceptual hash of the photo (anti-cheat). */
  hash: string;
}

export interface ScanOutcome extends Partial<AwardResult> {
  points: number;
  /** Id of the saved scans document (missing when queued offline). */
  scanId?: string;
  queued?: boolean;
  streakBonus?: number;
}

/** Write the scan and award points in one transaction. */
async function saveScan(s: ScanInput): Promise<ScanOutcome> {
  const scanRef = doc(collection(db, 'scans'));
  const scanData = (cityId: string) => ({
    uid: s.uid,
    cityId,
    category: s.category,
    aiCategory: s.aiCategory,
    confidence: Math.round(s.confidence * 1000) / 1000,
    corrected: s.corrected,
    source: 'phone',
    createdAt: serverTimestamp(),
  });

  // "Not waste" is recorded (helps the stats) but earns nothing.
  if (s.category === 'notwaste') {
    const u = await getDoc(doc(db, 'users', s.uid));
    const r = await addDoc(collection(db, 'scans'), scanData(u.data()?.cityId ?? ''));
    return { points: 0, scanId: r.id };
  }

  const result = await awardPoints(s.uid, {
    action: 'scan',
    refId: s.hash,
    extra: async (tx, user) => ({ write: () => tx.set(scanRef, scanData(user.cityId)) }),
  });
  let streakBonus = 0;
  if (result.streakContinued && result.streakDays >= 2) streakBonus = await awardStreakBonus(s.uid).catch(() => 0);
  return { ...result, streakBonus, scanId: scanRef.id };
}

/** "Wrong? Fix it" after a scan was already saved: store the user's answer. */
export function fixScan(scanId: string, category: WasteLabel) {
  return updateDoc(doc(db, 'scans', scanId), { category, corrected: true });
}

/** Record a scan now, or queue it if offline. */
export async function recordScan(s: ScanInput): Promise<ScanOutcome> {
  if (!navigator.onLine) {
    await enqueue('scan', s);
    return { points: 0, queued: true };
  }
  try {
    return await saveScan(s);
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue('scan', s);
    return { points: 0, queued: true };
  }
}

registerOutboxHandler('scan', async (job: OutboxJob) => {
  const r = await saveScan(job.payload as ScanInput);
  return r.points + (r.streakBonus ?? 0);
});

/** "Share this photo to help the AI learn?" -> upload to corrections. */
export async function shareCorrection(uid: string, photo: Blob, aiCategory: WasteLabel, userCategory: WasteLabel) {
  const id = crypto.randomUUID();
  const imageUrl = await savePhoto('correctionPhotos', id, photo, uid);
  await addDoc(collection(db, 'corrections'), {
    uid,
    imageUrl,
    aiCategory,
    userCategory,
    createdAt: serverTimestamp(),
  });
}
