/** Flagged photos: approve (show again) or remove the report. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { useRecentReports } from '../map/useReports';
import { approvePhoto, removeReport } from './adminApi';
import { ReportImage } from '../../components/ReportImage';

export function FlaggedPhotos() {
  const { t } = useTranslation();
  const toast = useToast();
  const { reports, state, retry } = useRecentReports(365);
  const [busy, setBusy] = useState<string | null>(null);
  const flagged = reports.filter((r) => r.flagged);

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    } finally {
      setBusy(null);
    }
  };

  if (state === 'loading') return <SkeletonCards count={2} height="h-64" />;
  if (state === 'error') return <ErrorCard onRetry={retry} />;
  if (!flagged.length) return <EmptyState text={t('admin.noFlagged')} />;

  return (
    <div className="flex flex-col gap-3">
      {flagged.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-3">
          <ReportImage src={r.imageUrl} thumb={r.thumbUrl} alt={t('report.photoAlt')} className="h-56 w-full rounded-[12px] object-cover" />
          <p className="t-small text-muted">
            {r.locality} · {r.nickname}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" loading={busy === `a-${r.id}`} onClick={() => act(`a-${r.id}`, () => approvePhoto(r.id))}>
              {t('admin.approve')}
            </Button>
            <Button variant="danger" loading={busy === `r-${r.id}`} onClick={() => act(`r-${r.id}`, () => removeReport(r.id, r.uid, true))}>
              {t('admin.remove')}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
