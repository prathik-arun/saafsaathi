/**
 * Stats dashboard: scans per day, category split, reports opened vs cleaned,
 * active users per day (last 14 days). Export CSV and the corrections ZIP
 * used to retrain the Waste Sorter.
 */
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import JSZip from 'jszip';
import { useEffect, useState } from 'react';
import { Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { CATEGORY_META } from '../../components/meta';
import { db } from '../../lib/firebase';
import { photoBlob } from '../../lib/photos';
import { toDate } from '../../lib/format';
import { daysAgo, istDate } from '../../lib/time';
import type { CorrectionDoc, PointsLogDoc, ReportDoc, ScanDoc, WasteLabel } from '../../lib/types';
import { downloadBlob, downloadCsv } from './csv';

interface DayRow {
  date: string;
  label: string;
  scans: number;
  opened: number;
  cleaned: number;
  activeUsers: number;
}

const tooltipStyle = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text)' };
const axisTick = { fontSize: 11, fill: 'var(--text-muted)' };

export function StatsDashboard() {
  const { t } = useTranslation();
  const toast = useToast();
  const [days, setDays] = useState<DayRow[] | null>(null);
  const [split, setSplit] = useState<{ category: WasteLabel; count: number }[]>([]);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    setError(false);
    const since = Timestamp.fromDate(daysAgo(14));
    const recent = (col: string, field = 'createdAt') => getDocs(query(collection(db, col), where(field, '>=', since)));
    Promise.all([recent('scans'), recent('reports'), recent('reports', 'cleanedAt'), recent('pointsLog')])
      .then(([scans, opened, cleaned, logs]) => {
        const rows: DayRow[] = Array.from({ length: 14 }, (_, i) => {
          const date = istDate(daysAgo(13 - i));
          return { date, label: date.slice(5), scans: 0, opened: 0, cleaned: 0, activeUsers: 0 };
        });
        const row = (ts: Timestamp | null | undefined) => rows.find((r) => r.date === istDate(toDate(ts) ?? new Date()));
        const counts: Record<WasteLabel, number> = { wet: 0, dry: 0, hazardous: 0, notwaste: 0 };
        scans.docs.forEach((d) => {
          const s = d.data() as ScanDoc;
          const r = row(s.createdAt);
          if (r) r.scans++;
          counts[s.category] = (counts[s.category] ?? 0) + 1;
        });
        opened.docs.forEach((d) => {
          const r = row((d.data() as ReportDoc).createdAt);
          if (r) r.opened++;
        });
        cleaned.docs.forEach((d) => {
          const r = row((d.data() as ReportDoc).cleanedAt);
          if (r) r.cleaned++;
        });
        const active = new Map<string, Set<string>>();
        logs.docs.forEach((d) => {
          const l = d.data() as PointsLogDoc;
          const date = istDate(toDate(l.createdAt) ?? new Date());
          if (!active.has(date)) active.set(date, new Set());
          active.get(date)!.add(l.uid);
        });
        rows.forEach((r) => (r.activeUsers = active.get(r.date)?.size ?? 0));
        setDays(rows);
        setSplit((Object.keys(counts) as WasteLabel[]).map((c) => ({ category: c, count: counts[c] })));
      })
      .catch(() => setError(true));
  }, [attempt]);

  const downloadCorrections = async () => {
    setZipping(true);
    try {
      const snap = await getDocs(collection(db, 'corrections'));
      if (snap.empty) return toast.info(t('admin.noCorrections'));
      const zip = new JSZip();
      // One folder per label, ready to upload as Teachable Machine classes.
      for (const d of snap.docs) {
        const c = d.data() as CorrectionDoc;
        const blob = await photoBlob(c.imageUrl);
        zip.file(`${c.userCategory}/${d.id}.jpg`, blob);
      }
      downloadBlob('saafsaathi-corrections.zip', await zip.generateAsync({ type: 'blob' }));
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    } finally {
      setZipping(false);
    }
  };

  if (error) return <ErrorCard onRetry={() => setAttempt((a) => a + 1)} />;
  if (!days) return <SkeletonCards count={3} height="h-48" />;

  const total = split.reduce((s, x) => s + x.count, 0) || 1;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" className="t-small" onClick={() => downloadCsv('saafsaathi-stats.csv', days.map((d) => ({ date: d.date, scans: d.scans, opened: d.opened, cleaned: d.cleaned, activeUsers: d.activeUsers })))}>
          {t('admin.exportStats')}
        </Button>
        <Button variant="secondary" className="t-small" loading={zipping} onClick={downloadCorrections}>
          {t('admin.downloadCorrections')}
        </Button>
      </div>

      <Card>
        <h3 className="mb-2 t-h2">{t('admin.scansPerDay')}</h3>
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={days}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--primary-soft)' }} />
              <Bar isAnimationActive={false} dataKey="scans" name={t('admin.scans')} fill="var(--primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 t-h2">{t('admin.categorySplit')}</h3>
        <ul className="flex flex-col gap-2">
          {split.map(({ category, count }) => {
            const m = CATEGORY_META[category];
            return (
              <li key={category} className="flex items-center gap-2 t-small">
                <m.Icon className="h-4 w-4" style={{ color: m.color }} aria-hidden />
                <span className="w-24">{t(m.key)}</span>
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-border">
                  <span className="block h-full rounded-full" style={{ width: `${(count / total) * 100}%`, background: m.color }} />
                </span>
                <span className="w-10 text-right">{count}</span>
              </li>
            );
          })}
        </ul>
      </Card>

      <Card>
        <h3 className="mb-2 t-h2">{t('admin.openedVsCleaned')}</h3>
        <div className="h-48">
          <ResponsiveContainer>
            <LineChart data={days}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line isAnimationActive={false} dataKey="opened" name={t('admin.opened')} stroke="var(--status-open)" strokeWidth={2} dot={false} />
              <Line isAnimationActive={false} dataKey="cleaned" name={t('status.cleaned')} stroke="var(--status-cleaned)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h3 className="mb-2 t-h2">{t('admin.activeUsers')}</h3>
        <div className="h-44">
          <ResponsiveContainer>
            <BarChart data={days}>
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={2} />
              <YAxis tick={axisTick} tickLine={false} axisLine={false} width={28} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--primary-soft)' }} />
              <Bar isAnimationActive={false} dataKey="activeUsers" name={t('admin.activeUsers')} fill="var(--accent)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
