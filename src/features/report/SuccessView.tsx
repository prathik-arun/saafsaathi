/** Step 3 of Report a Spot: green tick, points, View on map / Share on WhatsApp / Done. */
import { Check, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { PointsBadge } from '../../components/PointsBadge';
import { cityName } from '../../lib/cities';
import { currentLanguage } from '../../lib/i18n';
import { xShareUrl } from '../../lib/authorities';
import type { ReportType } from '../../lib/types';

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function SuccessView({ result, type, place }: { result: { id?: string; points: number; queued: boolean; confirmed?: boolean }; type: ReportType; place: { cityId: string; locality: string } }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const link = result.id ? `${window.location.origin}/r/${result.id}` : window.location.origin;
  const shareText = t('report.shareText', { type: t(`reportType.${type}`).toLowerCase(), link });

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 bg-bg px-4 py-10 text-center md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card">
      <div className="anim-pop flex h-24 w-24 items-center justify-center rounded-full bg-success text-white">
        <Check className="h-12 w-12" strokeWidth={3} aria-hidden />
      </div>
      <h1 className="t-h1">
        {result.queued ? t('report.savedOffline') : result.confirmed ? t('report.confirmedTitle') : t('report.successTitle')}
      </h1>
      {result.points > 0 && <PointsBadge points={result.points} animate />}
      {result.queued && <p className="t-small text-muted">{t('report.queuedText')}</p>}
      {!result.queued && result.points === 0 && <p className="t-small text-muted">{t('report.noPointsToday')}</p>}
      <div className="mt-4 flex w-full flex-col gap-3">
        {!result.queued && <Button onClick={() => navigate(`/map?focus=${result.id}`, { replace: true })}>{t('report.viewOnMap')}</Button>}
        {!result.queued && (
          <Button variant="secondary" onClick={() => window.open(whatsappShareUrl(shareText), '_blank', 'noopener')}>
            {t('report.shareWhatsapp')}
          </Button>
        )}
        {!result.queued && (
          <Button
            variant="secondary"
            icon={<Megaphone className="h-4 w-4" />}
            onClick={() =>
              window.open(
                xShareUrl({ ...place, cityName: cityName(place.cityId, currentLanguage()), type: t(`reportType.${type}`), link }),
                '_blank',
                'noopener',
              )
            }
          >
            {t('report.shareX')}
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate('/', { replace: true })}>
          {t('common.done')}
        </Button>
      </div>
    </div>
  );
}
