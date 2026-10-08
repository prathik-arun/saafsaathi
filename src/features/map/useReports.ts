/** Live list of recent reports for the map, list view and stats. */
import { collection, limit, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import { daysAgo } from '../../lib/time';
import type { ReportDoc, WithId } from '../../lib/types';

export function useRecentReports(days = 90) {
  const [reports, setReports] = useState<WithId<ReportDoc>[]>([]);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setState('loading');
    return onSnapshot(
      query(collection(db, 'reports'), where('createdAt', '>=', Timestamp.fromDate(daysAgo(days))), orderBy('createdAt', 'desc'), limit(500)),
      (snap) => {
        setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as ReportDoc) })));
        setState('ok');
      },
      () => setState('error'),
    );
  }, [days, attempt]);

  return { reports, state, retry: () => setAttempt((a) => a + 1) };
}
