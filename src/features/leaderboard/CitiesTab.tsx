/**
 * Cities leaderboard: each city's points (this week or all time), members,
 * and its cleanup rate (share of the last 30 days' reports that are cleaned).
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { ProgressBar } from '../../components/ProgressBar';
import { SkeletonCards } from '../../components/Skeleton';
import { softOf } from '../../components/meta';
import { cityName } from '../../lib/cities';
import { num } from '../../lib/format';
import { currentLanguage } from '../../lib/i18n';
import { currentWeekly } from '../../lib/points';
import { useProfile } from '../auth/AuthProvider';
import { useRecentReports } from '../map/useReports';
import { useCities } from './useCities';
import { AnnouncementEditor } from './AnnouncementEditor';

export function CitiesTab({ period }: { period: 'week' | 'all' }) {
  const { t } = useTranslation();
  const lang = currentLanguage();
  const profile = useProfile();
  const { cities, loading, error } = useCities();
  const { reports } = useRecentReports(30);

  // Cleanup rate per city from the last 30 days of reports.
  const rates = useMemo(() => {
    const m = new Map<string, { total: number; cleaned: number }>();
    for (const r of reports) {
      const x = m.get(r.cityId) ?? { total: 0, cleaned: 0 };
      x.total++;
      if (r.status === 'cleaned') x.cleaned++;
      m.set(r.cityId, x);
    }
    return m;
  }, [reports]);

  if (loading) return <SkeletonCards count={4} height="h-24" />;
  if (error) return <ErrorCard onRetry={() => window.location.reload()} />;
  const active = cities.filter((c) => c.points > 0 || c.memberCount > 0);
  if (!active.length) return <EmptyState text={t('leaderboard.noCities')} />;

  const score = (c: (typeof cities)[number]) => (period === 'week' ? currentWeekly(c) : c.points);
  const ranked = [...active].sort((a, b) => score(b) - score(a));
  const leader = Math.max(1, score(ranked[0]));

  return (
    <ol className="flex flex-col gap-3">
      {ranked.map((c, i) => {
        const name = cityName(c.id, lang);
        const rate = rates.get(c.id);
        const mine = c.id === profile.cityId;
        return (
          <li key={c.id}>
            <Card stripe={c.colour} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="w-5 text-center t-strong text-muted">{i + 1}</span>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-heading text-lg font-bold text-white" style={{ background: c.colour }}>
                  {name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-x-2 t-strong">
                    {name}
                    {mine && (
                      <span className="rounded-full px-2 t-caption" style={{ background: softOf(c.colour), color: c.colour }}>
                        {t('leaderboard.yourCity')}
                      </span>
                    )}
                  </p>
                  <p className="t-caption text-muted">
                    {t('leaderboard.thisWeekPlus', { points: num(currentWeekly(c)) })} · {t('setup.members', { count: c.memberCount })}
                  </p>
                </div>
                <span className="t-h2">{num(score(c))}</span>
              </div>
              <ProgressBar value={score(c) / leader} color={c.colour} label={name} />
              <p className="t-caption text-muted">
                {rate
                  ? t('leaderboard.cleanupRate', { pct: Math.round((rate.cleaned / rate.total) * 100), cleaned: rate.cleaned, total: rate.total })
                  : t('leaderboard.noReports30')}
              </p>
              {c.announcement && <p className="rounded-[12px] bg-bg p-2 t-small">📣 {c.announcement}</p>}
              {profile.role === 'captain' && mine && <AnnouncementEditor cityId={c.id} current={c.announcement ?? ''} />}
            </Card>
          </li>
        );
      })}
    </ol>
  );
}
