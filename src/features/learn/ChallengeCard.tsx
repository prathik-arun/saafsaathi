/** One weekly challenge: title, progress bar, days left, Join / Joined / Claim points. */
import { Trophy } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { PointsBadge } from '../../components/PointsBadge';
import { useToast } from '../../components/Toast';
import { celebrate } from '../../lib/celebrate';
import { toDate } from '../../lib/format';
import { useProfile } from '../auth/AuthProvider';
import { claimChallenge, joinChallenge, type Challenge } from './useChallenges';

export function ChallengeCard({ c }: { c: Challenge }) {
  const { t } = useTranslation();
  const toast = useToast();
  const profile = useProfile();
  const [busy, setBusy] = useState(false);
  const joined = profile.joinedChallenges?.includes(c.id);
  const daysLeft = Math.max(0, Math.ceil(((toDate(c.endDate)?.getTime() ?? 0) - Date.now()) / 86400000));

  const run = async (fn: () => Promise<unknown>, success?: string) => {
    setBusy(true);
    try {
      await fn();
      if (success) toast.success(success);
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card stripe="var(--accent)" className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-accent" aria-hidden />
        <div className="flex-1">
          <h3 className="t-h2">{c.title}</h3>
          {c.description && <p className="t-small text-muted">{c.description}</p>}
        </div>
        <PointsBadge points={c.rewardPoints} />
      </div>
      <ProgressBar value={c.progress / c.target} color="var(--accent)" label={c.title} />
      <div className="flex justify-between t-caption text-muted">
        <span>
          {c.progress}/{c.target}
        </span>
        <span>{t('challenges.daysLeft', { count: daysLeft })}</span>
      </div>
      {c.claimed ? (
        <Button variant="accent" disabled>
          {t('challenges.claimed')}
        </Button>
      ) : joined && c.done ? (
        <Button
          variant="accent"
          loading={busy}
          onClick={() =>
            run(async () => {
              const r = await claimChallenge(profile.id, c);
              if (r.points > 0) celebrate();
            }, t('challenges.claimedToast', { points: c.rewardPoints }))
          }
        >
          {t('challenges.claim')}
        </Button>
      ) : joined ? (
        <Button variant="accent" disabled>
          {t('challenges.joined')}
        </Button>
      ) : (
        <Button variant="accent" loading={busy} onClick={() => run(() => joinChallenge(profile.id, c.id))}>
          {t('challenges.join')}
        </Button>
      )}
    </Card>
  );
}
