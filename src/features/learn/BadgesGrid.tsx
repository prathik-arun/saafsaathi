/** Badges grid; locked badges are greyed out with their progress. */
import { Brain, Flame, Lock, MapPin, Recycle, ScanLine, Sparkles, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BADGES } from '../../lib/badges';
import type { UserDoc } from '../../lib/types';

const ICONS: Record<string, LucideIcon> = { ScanLine, Recycle, MapPin, Sparkles, Flame, Brain };

export function BadgesGrid({ user, onlyEarned }: { user: Pick<UserDoc, 'stats' | 'streakDays' | 'badges'>; onlyEarned?: boolean }) {
  const { t } = useTranslation();
  const list = BADGES.map((b) => ({ ...b, earned: (user.badges ?? []).includes(b.id) || b.progress(user) >= b.target })).filter(
    (b) => !onlyEarned || b.earned,
  );
  if (onlyEarned && list.length === 0) return <p className="t-small text-muted">{t('badges.none')}</p>;

  return (
    <ul className="grid grid-cols-3 gap-3">
      {list.map((b) => {
        const Icon = ICONS[b.icon];
        return (
          <li
            key={b.id}
            className={`flex flex-col items-center gap-1.5 rounded-[16px] border border-border bg-surface p-3 text-center ${b.earned ? '' : 'opacity-50 grayscale'}`}
            aria-label={`${t(`badges.${b.id}.name`)}: ${b.earned ? t('badges.earned') : t('badges.locked')}`}
          >
            <span className={`flex h-12 w-12 items-center justify-center rounded-full ${b.earned ? 'bg-accent-soft text-accent-text' : 'bg-bg text-muted'}`}>
              {b.earned ? <Icon className="h-6 w-6" aria-hidden /> : <Lock className="h-5 w-5" aria-hidden />}
            </span>
            <span className="t-caption font-semibold">{t(`badges.${b.id}.name`)}</span>
            <span className="t-caption text-muted">
              {b.earned ? t(`badges.${b.id}.desc`) : `${Math.min(b.progress(user), b.target)}/${b.target}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
