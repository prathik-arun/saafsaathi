/**
 * Reports: submit (with photo upload), duplicate check, "I see it too",
 * mark as cleaned, flag, and the +10 bonus for the original reporter.
 */
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { findCity } from '../../lib/cities';
import { distanceMeters, geohash7, nearestCity, nearestLocality, type LatLng } from '../../lib/geo';
import { enqueue, isNetworkError, registerOutboxHandler, type OutboxJob } from '../../lib/outbox';
import { awardPoints, awardStreakBonus, cleanupPoints, type AwardResult } from '../../lib/points';
import { daysAgo } from '../../lib/time';
import type { ReportDoc, ReportType, Severity, WithId } from '../../lib/types';

export interface NewReport {
  /** Generated on the phone so a retry after a lost connection can't create a duplicate. */
  id: string;
  uid: string;
  type: ReportType;
  severity: Severity;
  aiType: ReportType | null;
  aiConfidence: number;
  lat: number;
  lng: number;
  note: string;
  photo: Blob;
}

/** Upload a photo (once). If it was already uploaded by an earlier try, reuse it. */
async function uploadOnce(path: string, photo: Blob): Promise<string> {
  const r = ref(storage, path);
  try {
    return await getDownloadURL(r);
  } catch {
    await uploadBytes(r, photo, { contentType: 'image/jpeg' });
    return getDownloadURL(r);
  }
}

async function saveReport(n: NewReport): Promise<AwardResult & { streakBonus: number }> {
  const imageUrl = await uploadOnce(`reports/${n.id}/before.jpg`, n.photo);
  const reportRef = doc(db, 'reports', n.id);
  const result = await awardPoints(n.uid, {
    action: 'report',
    refId: n.id,
    extra: async (tx, user) => {
      const existing = await tx.get(reportRef);
      // The spot counts for the city it is in; outside all listed cities it counts for the reporter's home city.
      const city = nearestCity(n) ?? findCity(user.cityId)!;
      const near = nearestLocality(n, city);
      const locality = distanceMeters(n, near) < 8000 ? near.name : city.name.en;
      const cityId = existing.exists() ? (existing.data() as ReportDoc).cityId : city.id;
      return {
        cityId,
        write: () => {
          if (existing.exists()) return; // already saved by an earlier try
          const data: Omit<ReportDoc, 'createdAt'> & { createdAt: unknown } = {
            uid: n.uid,
            nickname: user.nickname,
            cityId,
            type: n.type,
            severity: n.severity,
            aiType: n.aiType,
            aiConfidence: Math.round(n.aiConfidence * 1000) / 1000,
            imageUrl,
            afterImageUrl: null,
            lat: n.lat,
            lng: n.lng,
            geohash: geohash7(n),
            locality,
            note: n.note.slice(0, 140),
            status: 'open',
            confirmCount: 0,
            flagged: false,
            createdAt: serverTimestamp(),
            verifiedAt: null,
            cleanedAt: null,
            cleanedBy: null,
            reporterBonusClaimed: false,
          };
          tx.set(reportRef, data);
        },
      };
    },
  });
  let streakBonus = 0;
  if (result.streakContinued && result.streakDays >= 2) streakBonus = await awardStreakBonus(n.uid).catch(() => 0);
  return { ...result, streakBonus };
}

/** Submit now, or queue it (photo included) if offline. */
export async function submitReport(n: NewReport): Promise<{ points: number; queued: boolean; streakBonus: number }> {
  if (!navigator.onLine) {
    await enqueue('report', n);
    return { points: 0, queued: true, streakBonus: 0 };
  }
  try {
    const r = await saveReport(n);
    return { points: r.points, queued: false, streakBonus: r.streakBonus };
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    await enqueue('report', n);
    return { points: 0, queued: true, streakBonus: 0 };
  }
}

registerOutboxHandler('report', async (job: OutboxJob) => {
  const r = await saveReport(job.payload as NewReport);
  return r.points + r.streakBonus;
});

/**
 * Duplicate check: an Open report of the same type within 50 m from the
 * last 7 days.
 */
export async function findDuplicate(type: ReportType, at: LatLng): Promise<WithId<ReportDoc> | null> {
  const snap = await getDocs(
    query(
      collection(db, 'reports'),
      where('status', '==', 'open'),
      where('type', '==', type),
      where('createdAt', '>=', Timestamp.fromDate(daysAgo(7))),
    ),
  );
  const near = snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as ReportDoc) }))
    .filter((r) => !r.flagged && distanceMeters(r, at) <= 50)
    .sort((a, b) => distanceMeters(a, at) - distanceMeters(b, at));
  return near[0] ?? null;
}

/** "I see it too": +5 points, once per report, never on your own report. Auto-verifies at 3. */
export async function confirmReport(uid: string, reportId: string): Promise<AwardResult> {
  const reportRef = doc(db, 'reports', reportId);
  const confRef = doc(db, 'reports', reportId, 'confirmations', uid);
  return awardPoints(uid, {
    action: 'confirm',
    refId: reportId,
    extra: async (tx) => {
      const [report, conf] = [await tx.get(reportRef), await tx.get(confRef)];
      const r = report.data() as ReportDoc | undefined;
      if (!r) throw new Error('not-found');
      if (r.uid === uid) throw new Error('own-report');
      if (conf.exists()) throw new Error('already-confirmed');
      return {
        cityId: r.cityId,
        write: () => {
          const count = r.confirmCount + 1;
          tx.set(confRef, { createdAt: serverTimestamp() });
          tx.update(reportRef, {
            confirmCount: count,
            ...(r.status === 'open' && count >= 3 ? { status: 'verified', verifiedAt: serverTimestamp() } : {}),
          });
        },
      };
    },
  });
}

/**
 * Mark as cleaned with an "after" photo that already passed the AI clean check.
 * Points follow the cleanup rubric: base + severity bonus + fast-cleanup bonus.
 */
export async function markCleaned(uid: string, reportId: string, afterPhoto: Blob): Promise<AwardResult & { bonus: ReturnType<typeof cleanupPoints> }> {
  const afterImageUrl = await uploadOnce(`reports/${reportId}/after.jpg`, afterPhoto);
  const reportRef = doc(db, 'reports', reportId);
  let bonus = cleanupPoints({ severity: 'low', createdAt: null as never });
  const result = await awardPoints(uid, {
    action: 'cleaned',
    refId: reportId,
    extra: async (tx) => {
      const r = (await tx.get(reportRef)).data() as ReportDoc | undefined;
      if (!r) throw new Error('not-found');
      if (r.status === 'cleaned') throw new Error('already-cleaned');
      bonus = cleanupPoints(r);
      return {
        cityId: r.cityId,
        points: bonus.total,
        write: () => tx.update(reportRef, { status: 'cleaned', afterImageUrl, cleanedAt: serverTimestamp(), cleanedBy: uid }),
      };
    },
  });
  return { ...result, bonus };
}

/** Flag an inappropriate photo. It is hidden until an admin reviews it. */
export function flagReport(reportId: string) {
  return updateDoc(doc(db, 'reports', reportId), { flagged: true });
}

/**
 * When someone cleans a spot I reported, I get +10. The cleaner can't write
 * my points, so my phone claims the bonus the next time I open the app.
 */
export async function claimReporterBonuses(uid: string): Promise<number> {
  const snap = await getDocs(
    query(
      collection(db, 'reports'),
      where('uid', '==', uid),
      where('status', '==', 'cleaned'),
      where('reporterBonusClaimed', '==', false),
    ),
  );
  let total = 0;
  for (const d of snap.docs) {
    const r = await awardPoints(uid, {
      action: 'cleanedReporter',
      refId: d.id,
      extra: async (tx) => ({
        cityId: (d.data() as ReportDoc).cityId,
        write: () => tx.update(d.ref, { reporterBonusClaimed: true }),
      }),
    }).catch(() => null);
    total += r?.points ?? 0;
  }
  return total;
}
