/** Reports queue: filter by status and locality; Verify, Mark cleaned, Remove. */
import { BadgeCheck, Sparkles, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { Sheet } from '../../components/Sheet';
import { SkeletonCards } from '../../components/Skeleton';
import { StatusTag, TypeTag } from '../../components/Tags';
import { useToast } from '../../components/Toast';
import { timeAgo } from '../../lib/format';
import type { ReportDoc, ReportStatus, WithId } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';
import { useRecentReports } from '../map/useReports';
import { adminMarkCleaned, removeReport, verifyReport } from './adminApi';
import { downloadCsv } from './csv';
import { ReportImage } from '../../components/ReportImage';

export function ReportsQueue() {
  const { t } = useTranslation();
  const toast = useToast();
  const profile = useProfile();
  const { reports, state, retry } = useRecentReports(365);
  const [status, setStatus] = useState<ReportStatus | 'all'>('open');
  const [locality, setLocality] = useState('all');
  const [removing, setRemoving] = useState<WithId<ReportDoc> | null>(null);
  const [reverse, setReverse] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const localities = useMemo(() => [...new Set(reports.map((r) => r.locality))].sort(), [reports]);
  const rows = reports.filter((r) => (status === 'all' || r.status === status) && (locality === 'all' || r.locality === locality));

  const act = async (key: string, fn: () => Promise<unknown>, msg: string) => {
    setBusy(key);
    try {
      await fn();
      toast.success(msg);
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      'saafsaathi-reports.csv',
      reports.map((r) => ({
        id: r.id,
        createdAt: r.createdAt?.toDate().toISOString() ?? '',
        type: r.type,
        severity: r.severity,
        status: r.status,
        locality: r.locality,
        lat: r.lat,
        lng: r.lng,
        confirmCount: r.confirmCount,
        aiType: r.aiType ?? '',
        aiConfidence: r.aiConfidence,
        cityId: r.cityId,
        cleanedAt: r.cleanedAt?.toDate().toISOString() ?? '',
        flagged: r.flagged,
      })),
    );

  return (
    <div className="flex flex-col gap-3">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {(['open', 'verified', 'cleaned', 'all'] as const).map((s) => (
          <Chip key={s} selected={status === s} onClick={() => setStatus(s)}>
            {s === 'all' ? t('map.filter.all') : t(`status.${s}`)}
          </Chip>
        ))}
      </div>
      <select
        value={locality}
        onChange={(e) => setLocality(e.target.value)}
        aria-label={t('setup.locality')}
        className="h-11 rounded-[12px] border border-border bg-surface px-3 t-small"
      >
        <option value="all">{t('admin.allLocalities')}</option>
        {localities.map((l) => (
          <option key={l}>{l}</option>
        ))}
      </select>
      <Button variant="secondary" onClick={exportCsv} disabled={!reports.length}>
        {t('admin.exportReports')}
      </Button>

      {state === 'loading' && <SkeletonCards count={4} height="h-28" />}
      {state === 'error' && <ErrorCard onRetry={retry} />}
      {state === 'ok' && rows.length === 0 && <EmptyState text={t('admin.queueEmpty')} />}
      {rows.map((r) => (
        <Card key={r.id} className="flex flex-col gap-3 p-3">
          <Link to={`/r/${r.id}`} className="flex gap-3">
            <ReportImage src={r.imageUrl} thumb={r.thumbUrl} thumbOnly alt="" className="h-16 w-16 rounded-[12px] object-cover" loading="lazy" />
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap gap-1.5">
                <TypeTag type={r.type} />
                <StatusTag status={r.status} />
              </div>
              <span className="t-caption text-muted">
                {r.locality} · {timeAgo(r.createdAt)} · {t('details.confirmations', { count: r.confirmCount })}
              </span>
            </div>
          </Link>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="secondary"
              className="h-11 min-h-11 px-2 t-small"
              disabled={r.status !== 'open'}
              loading={busy === `v-${r.id}`}
              onClick={() => act(`v-${r.id}`, () => verifyReport(r.id), t('admin.verified'))}
              icon={<BadgeCheck className="h-4 w-4" />}
            >
              {t('admin.verify')}
            </Button>
            <Button
              variant="secondary"
              className="h-11 min-h-11 px-2 t-small"
              disabled={r.status === 'cleaned'}
              loading={busy === `c-${r.id}`}
              onClick={() => act(`c-${r.id}`, () => adminMarkCleaned(r.id, profile.id), t('admin.markedCleaned'))}
              icon={<Sparkles className="h-4 w-4" />}
            >
              {t('admin.cleaned')}
            </Button>
            <Button variant="danger" className="h-11 min-h-11 px-2 t-small" onClick={() => setRemoving(r)} icon={<Trash2 className="h-4 w-4" />}>
              {t('admin.remove')}
            </Button>
          </div>
        </Card>
      ))}

      <Sheet open={!!removing} onClose={() => setRemoving(null)} title={t('admin.removeTitle')}>
        <p className="mb-3 t-body text-muted">{t('admin.removeText')}</p>
        <label className="mb-4 flex min-h-11 items-center gap-3">
          <input type="checkbox" checked={reverse} onChange={(e) => setReverse(e.target.checked)} className="h-6 w-6 accent-[var(--primary)]" />
          <span className="t-body">{t('admin.reversePoints')}</span>
        </label>
        <Button
          variant="danger"
          loading={busy === 'remove'}
          onClick={() =>
            removing &&
            act('remove', () => removeReport(removing.id, removing.uid, reverse), t('admin.removed')).then(() => setRemoving(null))
          }
        >
          {t('admin.remove')}
        </Button>
      </Sheet>
    </div>
  );
}
