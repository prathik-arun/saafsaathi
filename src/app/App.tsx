/**
 * Top-level app: providers, the splash screen, and all the routes.
 * Route guards send people to onboarding -> sign in -> profile setup
 * before they reach the main screens.
 */
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ToastProvider } from '../components/Toast';
import { AuthProvider, useAuth } from '../features/auth/AuthProvider';
import { CitiesProvider } from '../features/leaderboard/useCities';
import { hasOnboarded } from '../features/onboarding/onboarded';
import { MainLayout } from './MainLayout';
import { Splash } from './Splash';
import { SyncManager } from './SyncManager';
import { OfflineBar } from './OfflineBar';
import { EmulatorCheck } from './EmulatorCheck';
import { InstallPrompt } from './InstallPrompt';

// Each screen is loaded only when first opened, so the first load stays fast.
const Onboarding = lazy(() => import('../features/onboarding/Onboarding'));
const SignIn = lazy(() => import('../features/auth/SignIn'));
const ProfileSetup = lazy(() => import('../features/auth/ProfileSetup'));
const Home = lazy(() => import('../features/home/Home'));
const Scan = lazy(() => import('../features/scan/ScanScreen'));
const Report = lazy(() => import('../features/report/ReportScreen'));
const ReportDetails = lazy(() => import('../features/report/ReportDetails'));
const MapScreen = lazy(() => import('../features/map/MapScreen'));
const Leaderboard = lazy(() => import('../features/leaderboard/Leaderboard'));
const Learn = lazy(() => import('../features/learn/Learn'));
const Quiz = lazy(() => import('../features/learn/Quiz'));
const Profile = lazy(() => import('../features/profile/Profile'));
const Activity = lazy(() => import('../features/profile/Activity'));
const Admin = lazy(() => import('../features/admin/Admin'));
const Legal = lazy(() => import('../features/legal/Legal'));

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <CitiesProvider>
          <OfflineBar />
          <EmulatorCheck />
          <Shell />
        </CitiesProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

function Shell() {
  const { loading } = useAuth();
  // Splash shows for up to 1.5 s while auth and the AI model load.
  const [minSplash, setMinSplash] = useState(true);
  useEffect(() => {
    // Start downloading the AI model in the background (TensorFlow.js is loaded lazily).
    import('../ai/classifyWaste').then((m) => m.loadWasteModel()).catch(() => undefined);
    const t = setTimeout(() => setMinSplash(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (loading && minSplash) return <Splash />;

  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" />}>
      <SyncManager />
      <InstallPrompt />
      <Routes>
        {/* Public */}
        <Route path="/welcome" element={<Onboarding />} />
        <Route path="/signin" element={<OnlySignedOut><SignIn /></OnlySignedOut>} />
        <Route path="/privacy" element={<Legal page="privacy" />} />
        <Route path="/terms" element={<Legal page="terms" />} />
        <Route path="/r/:id" element={<ReportDetails />} />

        {/* Signed in, profile not set up yet */}
        <Route path="/setup" element={<NeedsAuth allowNoProfile><ProfileSetup /></NeedsAuth>} />

        {/* Full-screen camera screens (no bottom nav) */}
        <Route path="/scan" element={<NeedsAuth><Scan /></NeedsAuth>} />
        <Route path="/report" element={<NeedsAuth><Report /></NeedsAuth>} />
        <Route path="/learn/quiz" element={<NeedsAuth><Quiz /></NeedsAuth>} />

        {/* Main screens with top bar and bottom nav */}
        <Route element={<NeedsAuth><MainLayout /></NeedsAuth>}>
          <Route index element={<Home />} />
          <Route path="/map" element={<MapScreen />} />
          <Route path="/cities" element={<Leaderboard />} />
          <Route path="/learn" element={<Learn />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/admin/*" element={<Admin />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

/** Redirects to onboarding / sign in / profile setup as needed. */
function NeedsAuth({ children, allowNoProfile }: { children: ReactNode; allowNoProfile?: boolean }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) {
    return <Navigate to={hasOnboarded() ? '/signin' : '/welcome'} replace state={{ from: location.pathname }} />;
  }
  if (!profile && !allowNoProfile) return <Navigate to="/setup" replace />;
  if (profile && allowNoProfile) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function OnlySignedOut({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  return user ? <Navigate to={from} replace /> : <>{children}</>;
}
