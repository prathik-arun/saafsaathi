/** Points per day for the last 14 days (Recharts bar chart). */
import { collection, getDocs, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { ErrorCard } from '../../components/ErrorCard';
import { Skeleton } from '../../components/Skeleton';
import { db } from '../../lib/firebase';
import { toDate } from '../../lib/format';
import { daysAgo, istDate } from '../../lib/time';
import type { PointsLogDoc } from '../../lib/types';

interface Day {
  date: string;
  label: string;
  points: number;
}

export function PointsChart({ uid }: { uid: string }) {
  const { t } = useTranslation();
  const [data, setData] = useState<Day[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setError(false);
    const days: Day[] = Array.from({ length: 14 }, (_, i) => {
      const d = daysAgo(13 - i);
      return { date: istDate(d), label: String(Number(istDate(d).slice(8))), points: 0 };
    });
    getDocs(query(collection(db, 'pointsLog'), where('uid', '==', uid), where('createdAt', '>=', Timestamp.fromDate(daysAgo(14))), orderBy('createdAt', 'desc')))
      .then((snap) => {
        for (const d of snap.docs) {
          const log = d.data() as PointsLogDoc;
          const day = days.find((x) => x.date === istDate(toDate(log.createdAt) ?? new Date()));
          if (day) day.points += log.points;
        }
        setData(days);
      })
      .catch(() => setError(true));
  }, [uid, attempt]);

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!data) return <Skeleton className="h-40 w-full rounded-[16px]" />;

  return (
    <div className="h-40 w-full" role="img" aria-label={t('profile.chartLabel')}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} interval={1} />
          <Tooltip
            cursor={{ fill: 'var(--primary-soft)' }}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' }}
            formatter={(v) => [v, t('common.ptsShort')]}
            labelFormatter={(_, p) => p?.[0]?.payload?.date ?? ''}
          />
          <Bar isAnimationActive={false} dataKey="points" fill="var(--primary)" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
