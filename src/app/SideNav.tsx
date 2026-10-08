/**
 * Desktop navigation (screens 1024 px and wider): a sidebar with the logo,
 * a big Report button and all main sections. Phones use BottomNav instead.
 */
import { BookOpen, Camera, House, Map, ScanLine, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Logo } from '../components/Logo';
import { useProfile } from '../features/auth/AuthProvider';

export function SideNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();

  const items = [
    { to: '/', key: 'nav.home', Icon: House },
    { to: '/scan', key: 'nav.scan', Icon: ScanLine },
    { to: '/map', key: 'nav.map', Icon: Map },
    { to: '/cities', key: 'nav.cities', Icon: Trophy },
    { to: '/learn', key: 'learn.cardsTitle', Icon: BookOpen },
    { to: '/profile', key: 'profile.title', Icon: UserRound },
    ...(profile.role === 'admin' ? [{ to: '/admin', key: 'admin.title', Icon: ShieldCheck }] : []),
  ];

  return (
    <nav
      aria-label={t('nav.label')}
      className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-border bg-surface px-4 py-6 lg:flex"
    >
      <NavLink to="/" className="flex items-center gap-3 px-2">
        <span className="rounded-[12px] bg-primary p-1.5">
          <Logo size={28} bubble="var(--on-primary)" leaf="var(--primary)" />
        </span>
        <span className="font-heading text-xl font-bold">SaafSaathi</span>
      </NavLink>

      <button
        type="button"
        onClick={() => navigate('/report')}
        className="flex h-12 items-center justify-center gap-2 rounded-[12px] bg-accent font-semibold text-white shadow-card transition hover:brightness-95 active:scale-[0.98]"
      >
        <Camera className="h-5 w-5" aria-hidden />
        {t('home.reportSpot')}
      </button>

      <ul className="flex flex-col gap-1">
        {items.map(({ to, key, Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex h-11 items-center gap-3 rounded-[12px] px-3 t-body font-medium transition-colors ${
                  isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-bg hover:text-text'
                }`
              }
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(key)}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
