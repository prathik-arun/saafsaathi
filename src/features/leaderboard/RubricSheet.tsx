/**
 * "How cities score": the scoring rubric, shown from the leaderboard.
 * Numbers come straight from src/lib/points.ts so this can never go out of date.
 */
import { Building2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Sheet } from '../../components/Sheet';
import { DAILY_LIMITS, FAST_CLEANUP_BONUS, FAST_CLEANUP_HOURS, POINTS, SEVERITY_BONUS } from '../../lib/points';

export function RubricSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();

  const spotRows = [
    { label: t('rubric.report'), pts: `+${POINTS.report}`, note: t('rubric.perDay', { n: DAILY_LIMITS.report }) },
    { label: t('rubric.confirm'), pts: `+${POINTS.confirm}`, note: t('rubric.oncePerReport') },
    { label: t('rubric.clean'), pts: `+${POINTS.cleaned}`, note: t('rubric.needsPhoto') },
    { label: t('rubric.severityBonus'), pts: `+${SEVERITY_BONUS.medium} / +${SEVERITY_BONUS.high}`, note: t('rubric.mediumHigh') },
    { label: t('rubric.fastBonus'), pts: `+${FAST_CLEANUP_BONUS}`, note: t('rubric.within', { h: FAST_CLEANUP_HOURS }) },
    { label: t('rubric.reporterBonus'), pts: `+${POINTS.cleanedReporter}`, note: t('rubric.whenCleaned') },
  ];
  const homeRows = [
    { label: t('rubric.scan'), pts: `+${POINTS.scan}`, note: t('rubric.perDay', { n: DAILY_LIMITS.scan }) },
    { label: t('rubric.quiz'), pts: `+${POINTS.quiz}`, note: t('rubric.perDay', { n: DAILY_LIMITS.quiz }) },
    { label: t('rubric.streak'), pts: `+${POINTS.streak}`, note: t('rubric.oncePerDay') },
    { label: t('rubric.challenge'), pts: `+${POINTS.challenge}`, note: t('rubric.perChallenge') },
  ];

  const table = (rows: typeof spotRows) => (
    <ul className="divide-y divide-border rounded-[12px] border border-border">
      {rows.map((r) => (
        <li key={r.label} className="flex items-center gap-3 px-3 py-2">
          <span className="flex-1">
            <span className="block t-small font-semibold">{r.label}</span>
            <span className="t-caption text-muted">{r.note}</span>
          </span>
          <span className="t-strong text-accent-text">{r.pts}</span>
        </li>
      ))}
    </ul>
  );

  return (
    <Sheet open={open} onClose={onClose} title={t('rubric.title')}>
      <div className="flex flex-col gap-4">
        <p className="t-small text-muted">{t('rubric.intro')}</p>
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 t-strong">
            <MapPin className="h-4 w-4 text-accent" aria-hidden />
            {t('rubric.spotTitle')}
          </h3>
          <p className="t-caption text-muted">{t('rubric.spotHint')}</p>
          {table(spotRows)}
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="flex items-center gap-2 t-strong">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            {t('rubric.homeTitle')}
          </h3>
          <p className="t-caption text-muted">{t('rubric.homeHint')}</p>
          {table(homeRows)}
        </section>
        <p className="rounded-[12px] bg-primary-soft p-3 t-small text-primary">{t('rubric.cleanupRate')}</p>
      </div>
    </Sheet>
  );
}
