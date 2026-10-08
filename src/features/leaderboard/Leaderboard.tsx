/**
 * Leaderboard: Cities / Members / Localities tabs,
 * This week / All time. Updates live. Weekly totals reset every Monday
 * 00:00 IST (see weekId in src/lib/time.ts).
 */
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cityName } from '../../lib/cities';
import { currentLanguage } from '../../lib/i18n';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { ProgressBar } from '../../components/ProgressBar';
import { Segmented } from '../../components/Segmented';
import { SkeletonCards } from '../../components/Skeleton';
import { CityTag } from '../../components/Tags';
import { db } from '../../lib/firebase';
import { num, toDate } from '../../lib/format';
import { currentWeekly } from '../../lib/points';
import { weekId } from '../../lib/time';
import type { ReportDoc, UserDoc, WithId } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';
import { useCities } from './useCities';
import { CitiesTab } from './CitiesTab';
import { RubricSheet } from './RubricSheet';

type Tab = 'cities' | 'members' | 'localities';
type Period = 'week' | 'all';

export default function Leaderboard() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('cities');
  const [period, setPeriod] = useState<Period>('week');
  const [rubric, setRubric] = useState(false);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div role="tablist" className="flex border-b border-border">
        {(['cities', 'members', 'localities'] as Tab[]).map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-11 flex-1 border-b-2 t-small font-semibold ${tab === k ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
          >
            {t(`leaderboard.${k}`)}
          </button>
        ))}
      </div>
      <Segmented<Period>
        label={t('leaderboard.period')}
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: t('leaderboard.thisWeek') },
          { value: 'all', label: t('leaderboard.allTime') },
        ]}
      />
      {tab === 'cities' && (
        <Button variant="ghost" onClick={() => setRubric(true)} icon={<Info className="h-4 w-4" />}>
          {t('rubric.title')}
        </Button>
      )}
      {tab === 'cities' && <CitiesTab period={period} />}
      {tab === 'members' && <MembersTab period={period} />}
      {tab === 'localities' && <LocalitiesTab period={period} />}
      <RubricSheet open={rubric} onClose={() => setRubric(false)} />
    </div>
  );
}

function MembersTab({ period }: { period: Period }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const { colourOf } = useCities();
  const [rows, setRows] = useState<WithId<UserDoc>[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setRows(null);
    setError(false);
    const q =
      period === 'week'
        ? query(collection(db, 'users'), where('weekId', '==', weekId()), orderBy('weeklyPoints', 'desc'), limit(50))
        : query(collection(db, 'users'), orderBy('points', 'desc'), limit(50));
    return onSnapshot(
      q,
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserDoc) }))),
      () => setError(true),
    );
  }, [period, attempt]);

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!rows) return <SkeletonCards count={6} height="h-14" />;
  if (rows.length === 0) return <EmptyState text={t('leaderboard.noMembers')} />;

  const score = (u: UserDoc) => (period === 'week' ? currentWeekly(u) : u.points);
  const inTop = rows.some((r) => r.id === profile.id);

  const row = (u: WithId<UserDoc>, rank: number | null) => (
    <li
      key={u.id}
      className={`flex items-center gap-3 rounded-[12px] px-3 py-2 ${u.id === profile.id ? 'bg-primary-soft' : 'bg-surface'}`}
      aria-current={u.id === profile.id || undefined}
    >
      <span className="w-6 text-center t-small font-semibold text-muted">{rank ?? '–'}</span>
      <Avatar name={u.nickname} color={colourOf(u.cityId)} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block truncate t-strong">{u.nickname}</span>
        <CityTag cityId={u.cityId} />
      </span>
      <span className="t-strong">{num(score(u))}</span>
    </li>
  );

  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2">{rows.map((u, i) => row(u, i + 1))}</ol>
      {!inTop && <div className="sticky bottom-24 mt-2 shadow-card">{row(profile, null)}</div>}
    </div>
  );
}

/** Localities inside my home city, ranked by spots cleaned. */
function LocalitiesTab({ period }: { period: Period }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    return onSnapshot(
      query(collection(db, 'reports'), where('status', '==', 'cleaned'), limit(1000)),
      (snap) => setReports(snap.docs.map((d) => d.data() as ReportDoc)),
      () => setError(true),
    );
  }, [attempt]);

  const ranked = useMemo(() => {
    if (!reports) return [];
    const since = Date.parse(weekId()) - 5.5 * 3600 * 1000; // Monday 00:00 IST
    const counts = new Map<string, number>();
    for (const r of reports) {
      if (r.cityId !== profile.cityId) continue;
      if (period === 'week' && (toDate(r.cleanedAt)?.getTime() ?? Date.now()) < since) continue;
      counts.set(r.locality, (counts.get(r.locality) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [reports, period, profile.cityId]);

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!reports) return <SkeletonCards count={5} height="h-12" />;
  if (ranked.length === 0) return <EmptyState text={t('leaderboard.noLocalities')} />;

  const top = ranked[0][1];
  return (
    <ol className="flex flex-col gap-2" aria-label={t('leaderboard.localitiesIn', { city: cityName(profile.cityId, currentLanguage()) })}>
      <li className="t-small text-muted">{t('leaderboard.localitiesIn', { city: cityName(profile.cityId, currentLanguage()) })}</li>
      {ranked.map(([name, n], i) => (
        <li key={name}>
          <Card className="flex flex-col gap-2 p-3">
            <div className="flex items-center gap-3">
              <span className="w-6 text-center t-small font-semibold text-muted">{i + 1}</span>
              <span className="flex-1 t-strong">{name}</span>
              <span className="t-small text-muted">{t('leaderboard.cleanedCount', { count: n })}</span>
            </div>
            <ProgressBar value={n / top} color="var(--status-cleaned)" label={name} />
          </Card>
        </li>
      ))}
    </ol>
  );
}

