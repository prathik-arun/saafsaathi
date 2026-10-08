/**
 * Layout for the main screens.
 *  - Phones/tablets: top app bar, page content, bottom nav.
 *  - Desktop (lg, 1024 px+): sidebar on the left, wider content area.
 */
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BottomNav } from './BottomNav';
import { SideNav } from './SideNav';
import { TopBar } from './TopBar';

const TITLES: Record<string, string> = {
  '/': 'nav.home',
  '/map': 'nav.map',
  '/cities': 'nav.cities',
  '/learn': 'learn.cardsTitle',
  '/profile': 'profile.title',
  '/activity': 'activity.title',
};

export function MainLayout() {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const isMap = pathname === '/map';
  const titleKey = pathname.startsWith('/admin') ? 'admin.title' : (TITLES[pathname] ?? 'nav.home');

  return (
    <div className="min-h-dvh bg-bg lg:flex">
      <SideNav />
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col md:max-w-2xl lg:min-w-0 lg:max-w-none lg:flex-1">
        <TopBar title={t(titleKey)} />
        <main className={isMap ? 'relative flex-1' : 'flex-1 px-4 pt-2 pb-32 lg:px-8 lg:pt-6 lg:pb-12'}>
          {isMap ? (
            <Outlet />
          ) : (
            <div className="mx-auto w-full max-w-6xl">
              <Outlet />
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
