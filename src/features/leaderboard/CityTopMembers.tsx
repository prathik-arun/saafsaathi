import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/Avatar';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { db } from '../../lib/firebase';
import { num } from '../../lib/format';
import { currentWeekly } from '../../lib/points';
import { weekId } from '../../lib/time';
import type { UserDoc, WithId } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';

/** Top 10 contributors whose home city is `cityId`, with their area in small text. */
export function CityTopMembers({ cityId, colour, period }: { cityId: string; colour: string; period: 'week' | 'all' }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const [rows, setRows] = useState<WithId<UserDoc>[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setRows(null);
    setError(false);
    const users = collection(db, 'users');
    const q =
      period === 'week'
        ? query(users, where('cityId', '==', cityId), where('weekId', '==', weekId()), orderBy('weeklyPoints', 'desc'), limit(10))
        : query(users, where('cityId', '==', cityId), orderBy('points', 'desc'), limit(10));
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))),
      () => setError(true),
    );
  }, [cityId, period, attempt]);

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!rows) return <SkeletonCards count={3} height="h-12" />;
  const shown = rows.filter((u) => (period === 'week' ? currentWeekly(u) : u.points) > 0);
  if (!shown.length) return <EmptyState text={t('leaderboard.noMembers')} />;

  return (
    <ol className="flex flex-col gap-1" aria-label={t('leaderboard.topContributors')}>
      <li className="t-small font-semibold text-muted">{t('leaderboard.topContributors')}</li>
      {shown.map((u, i) => (
        <li key={u.id} className={`flex items-center gap-3 rounded-[12px] px-2 py-1.5 ${u.id === profile.id ? 'bg-primary-soft' : ''}`}>
          <span className="w-5 text-center t-small font-semibold text-muted">{i + 1}</span>
          <Avatar name={u.nickname} color={colour} size={32} />
          <span className="min-w-0 flex-1">
            <span className="block truncate t-strong">{u.nickname}</span>
            {u.locality && <span className="block truncate t-caption text-muted">{u.locality}</span>}
          </span>
          <span className="t-strong">{t('leaderboard.pts', { points: num(period === 'week' ? currentWeekly(u) : u.points) })}</span>
        </li>
      ))}
    </ol>
  );
}
