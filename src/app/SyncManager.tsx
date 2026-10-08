/**
 * Background jobs while the app is open:
 *  - sends queued offline scans/reports when back online,
 *  - claims the +10 bonus when someone cleaned a spot I reported,
 *  - toasts when one of my reports is verified or cleaned (if notifications are on).
 */
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { useAuth } from '../features/auth/AuthProvider';
import { claimReporterBonuses } from '../features/report/reportApi';
import { notificationsEnabled } from '../features/profile/settings';
import { db } from '../lib/firebase';
import { flushOutbox, onOutboxChange } from '../lib/outbox';
import type { ReportStatus } from '../lib/types';
import '../features/scan/scanApi'; // registers the outbox handler for scans
import '../features/report/reportApi'; // registers the outbox handler for reports

export function SyncManager() {
  const { t } = useTranslation();
  const toast = useToast();
  const { user, profile } = useAuth();
  const uid = profile ? user?.uid : undefined;
  const lastStatus = useRef<Record<string, ReportStatus>>({});

  useEffect(
    () =>
      onOutboxChange((_pending, synced) => {
        if (synced > 0) toast.success(t('common.synced', { points: synced }));
      }),
    [t, toast],
  );

  useEffect(() => {
    if (!uid) return;
    void flushOutbox();
    claimReporterBonuses(uid)
      .then((p) => p > 0 && toast.success(t('report.reporterBonus', { points: p })))
      .catch(() => undefined);

    // Watch my own reports for status changes.
    return onSnapshot(query(collection(db, 'reports'), where('uid', '==', uid)), (snap) => {
      for (const d of snap.docs) {
        const status = d.data().status as ReportStatus;
        const before = lastStatus.current[d.id];
        if (before && before !== status && notificationsEnabled()) {
          toast.info(t(status === 'cleaned' ? 'report.yourReportCleaned' : 'report.yourReportVerified'));
          if (status === 'cleaned') claimReporterBonuses(uid).catch(() => undefined);
        }
        lastStatus.current[d.id] = status;
      }
    });
  }, [uid, t, toast]);

  return null;
}
