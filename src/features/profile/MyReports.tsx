/** "My reports" list on the Profile screen. */
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { StatusTag, TypeTag } from '../../components/Tags';
import { db } from '../../lib/firebase';
import { timeAgo } from '../../lib/format';
import type { ReportDoc, WithId } from '../../lib/types';

export function MyReports({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [rows, setRows] = useState<WithId<ReportDoc>[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    return onSnapshot(
      query(collection(db, 'reports'), where('uid', '==', uid), orderBy('createdAt', 'desc'), limit(20)),
      (snap) => setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ReportDoc) }))),
      () => setError(true),
    );
  }, [uid, attempt]);

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!rows) return <SkeletonCards count={2} />;
  if (rows.length === 0) return <EmptyState text={t('profile.noReports')} actionLabel={t('home.reportSpot')} onAction={() => navigate('/report')} />;

  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" className="w-full text-left" onClick={() => navigate(`/r/${r.id}`)}>
            <Card className="flex items-center gap-3 p-3">
              <img src={r.imageUrl} alt="" className="h-14 w-14 rounded-[12px] object-cover" loading="lazy" />
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex flex-wrap gap-1.5">
                  <TypeTag type={r.type} />
                  <StatusTag status={r.status} />
                </div>
                <span className="truncate t-caption text-muted">
                  {r.locality} · {timeAgo(r.createdAt)}
                </span>
              </div>
            </Card>
          </button>
        </li>
      ))}
    </ul>
  );
}
