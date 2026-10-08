/** Top app bar: screen title on the left; points pill and avatar (opens Profile) on the right. */
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../components/Avatar';
import { useProfile } from '../features/auth/AuthProvider';
import { useCities } from '../features/leaderboard/useCities';

export function TopBar({ title }: { title: string }) {
  const { t } = useTranslation();
  const profile = useProfile();
  const { colourOf } = useCities();
  const cityColour = colourOf(profile.cityId);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur lg:px-8">
      <h1 className="t-h1 min-w-0 truncate">{title}</h1>
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 shrink-0 items-center gap-1 whitespace-nowrap rounded-full bg-accent-soft px-3 t-small font-semibold text-accent-text">
          <Sparkles className="h-4 w-4" aria-hidden />
          {t('common.pts', { count: profile.points, formatted: profile.points.toLocaleString('en-IN') })}
        </span>
        <Link to="/profile" aria-label={t('profile.title')} className="inline-flex h-11 w-11 items-center justify-center rounded-full">
          <Avatar name={profile.nickname} color={cityColour} size={36} />
        </Link>
      </div>
    </header>
  );
}
