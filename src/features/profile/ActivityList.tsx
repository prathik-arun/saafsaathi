/** My recent points activity (scans, reports, quiz, ...) from pointsLog. */
import { collection, limit as qLimit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { BadgeCheck, Brain, Camera, Flame, ScanLine, Sparkles, Trophy, type LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { db } from '../../lib/firebase';
import { timeAgo } from '../../lib/format';
import type { PointsAction, PointsLogDoc, WithId } from '../../lib/types';

const ICON: Record<PointsAction, LucideIcon> = {
  scan: ScanLine,
  report: Camera,
  confirm: BadgeCheck,
  cleaned: Sparkles,
  cleanedReporter: Sparkles,
  quiz: Brain,
  streak: Flame,
  challenge: Trophy,
};

export function usePointsLog(uid: string, max: number) {
  const [rows, setRows] = useState<WithId<PointsLogDoc>[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setError(false);
    return onSnapshot(
      query(collection(db, 'pointsLog'), where('uid', '==', uid), orderBy('createdAt', 'desc'), qLimit(max)),
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PointsLogDoc) }))),
      () => setError(true),
    );
  }, [uid, max, attempt]);
  return { rows, error, retry: () => setAttempt((a) => a + 1) };
}

export function ActivityList({ uid, max, empty }: { uid: string; max: number; empty?: React.ReactNode }) {
  const { t } = useTranslation();
  const { rows, error, retry } = usePointsLog(uid, max);
  if (error) return <ErrorCard onRetry={retry} />;
  if (!rows) return <SkeletonCards count={3} height="h-14" />;
  if (rows.length === 0) return <>{empty ?? <EmptyState text={t('activity.empty')} />}</>;

  return (
    <ul className="flex flex-col divide-y divide-border rounded-[16px] border border-border bg-surface">
      {rows.map((r) => {
        const Icon = ICON[r.action] ?? Sparkles;
        return (
          <li key={r.id} className="flex items-center gap-3 px-4 py-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block t-body">{t(`activity.${r.action}`)}</span>
              <span className="t-caption text-muted">{timeAgo(r.createdAt) || t('activity.justNow')}</span>
            </span>
            <span className={`t-strong ${r.points >= 0 ? 'text-accent-text' : 'text-error'}`}>
              {r.points >= 0 ? '+' : ''}
              {r.points}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
