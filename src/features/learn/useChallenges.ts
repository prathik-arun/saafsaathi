/**
 * Weekly challenges (PRD 4.11): live list of active challenges plus my
 * progress in each, counted from my pointsLog entries since the challenge
 * started.
 */
import { arrayUnion, collection, doc, onSnapshot, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../../lib/firebase';
import { toDate } from '../../lib/format';
import { awardPoints } from '../../lib/points';
import type { ChallengeDoc, PointsLogDoc, WithId } from '../../lib/types';

export type Challenge = WithId<ChallengeDoc> & { progress: number; done: boolean; claimed: boolean };

export function useChallenges(uid: string) {
  const [challenges, setChallenges] = useState<WithId<ChallengeDoc>[] | null>(null);
  const [logs, setLogs] = useState<PointsLogDoc[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    return onSnapshot(
      query(collection(db, 'challenges'), where('endDate', '>=', Timestamp.now())),
      (snap) =>
        setChallenges(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as ChallengeDoc) }))
            .filter((c) => (toDate(c.startDate)?.getTime() ?? 0) <= Date.now()),
        ),
      () => setError(true),
    );
  }, [attempt]);

  // My points log since the earliest active challenge started.
  const earliest = useMemo(() => {
    if (!challenges?.length) return null;
    return Math.min(...challenges.map((c) => toDate(c.startDate)!.getTime()));
  }, [challenges]);

  useEffect(() => {
    if (earliest === null) return;
    return onSnapshot(
      query(collection(db, 'pointsLog'), where('uid', '==', uid), where('createdAt', '>=', Timestamp.fromMillis(earliest))),
      (snap) => setLogs(snap.docs.map((d) => d.data() as PointsLogDoc)),
      () => undefined,
    );
  }, [uid, earliest]);

  const withProgress: Challenge[] | null = useMemo(() => {
    if (!challenges) return null;
    return challenges.map((c) => {
      const start = toDate(c.startDate)!.getTime();
      const end = toDate(c.endDate)!.getTime();
      const progress = logs.filter((l) => {
        const at = toDate(l.createdAt)?.getTime() ?? Date.now();
        return l.action === c.action && at >= start && at <= end;
      }).length;
      const claimed = logs.some((l) => l.action === 'challenge' && l.refId === c.id);
      return { ...c, progress: Math.min(progress, c.target), done: progress >= c.target, claimed };
    });
  }, [challenges, logs]);

  return { challenges: withProgress, error, retry: () => setAttempt((a) => a + 1) };
}

export function joinChallenge(uid: string, challengeId: string) {
  return updateDoc(doc(db, 'users', uid), { joinedChallenges: arrayUnion(challengeId) });
}

/** "Claim points" once a joined challenge is complete (once per challenge). */
export function claimChallenge(uid: string, c: WithId<ChallengeDoc>) {
  return awardPoints(uid, { action: 'challenge', refId: c.id, points: c.rewardPoints });
}
