/** Live single report, and whether I already confirmed it. */
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { db } from '../../lib/firebase';
import type { ReportDoc, WithId } from '../../lib/types';

export function useReport(id: string | undefined) {
  const [report, setReport] = useState<WithId<ReportDoc> | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    setState('loading');
    return onSnapshot(
      doc(db, 'reports', id),
      (snap) => {
        if (!snap.exists()) return setState('missing');
        setReport({ id: snap.id, ...(snap.data() as ReportDoc) });
        setState('ok');
      },
      () => setState('error'),
    );
  }, [id, attempt]);

  return { report, state, retry: () => setAttempt((a) => a + 1) };
}

export function useHasConfirmed(reportId: string | undefined, uid: string | undefined) {
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (!reportId || !uid) return;
    getDoc(doc(db, 'reports', reportId, 'confirmations', uid))
      .then((s) => setConfirmed(s.exists()))
      .catch(() => undefined);
  }, [reportId, uid]);
  return [confirmed, setConfirmed] as const;
}
