/**
 * Bottom navigation: Home, Scan, [Report FAB], Map, Cities.
 * The Report button is a 64 px accent circle raised 16 px above the bar.
 * Hidden on desktop, where SideNav is used instead.
 */
import { Camera, House, Map, ScanLine, Trophy } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ITEMS = [
  { to: '/', key: 'nav.home', Icon: House },
  { to: '/scan', key: 'nav.scan', Icon: ScanLine },
  null, // Report FAB goes here
  { to: '/map', key: 'nav.map', Icon: Map },
  { to: '/cities', key: 'nav.cities', Icon: Trophy },
] as const;

export function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <nav
      aria-label={t('nav.label')}
      className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-border bg-surface pb-safe md:max-w-2xl lg:hidden"
    >
      <ul className="grid h-16 grid-cols-5">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="report" className="relative flex justify-center">
              <button
                type="button"
                onClick={() => navigate('/report')}
                aria-label={t('nav.report')}
                className="absolute -top-6 flex h-16 w-16 items-center justify-center rounded-full bg-accent text-white shadow-card ring-4 ring-surface transition-transform duration-150 ease-out active:scale-95"
              >
                <Camera className="h-7 w-7" aria-hidden />
              </button>
              <span className="absolute bottom-1.5 t-caption text-muted">{t('nav.report')}</span>
            </li>
          ) : (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex h-full min-h-11 flex-col items-center justify-center gap-0.5 t-caption ${isActive ? 'text-primary' : 'text-muted'}`
                }
              >
                <item.Icon className="h-6 w-6" aria-hidden />
                {t(item.key)}
              </NavLink>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
