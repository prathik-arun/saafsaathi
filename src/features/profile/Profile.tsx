/**
 * Profile (PRD 4.12): who I am, my stats, a 14-day points chart, badges,
 * my reports, settings, and sign out. Admins also see a link to Admin.
 */
import { signOut } from 'firebase/auth';
import { ChevronRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../components/Avatar';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { CityTag } from '../../components/Tags';
import { useToast } from '../../components/Toast';
import { auth } from '../../lib/firebase';
import { num, toDate } from '../../lib/format';
import { setLanguage } from '../../lib/i18n';
import { getThemePref, setThemePref, type ThemePref } from '../../lib/theme';
import type { Lang } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';
import { CityPicker, LANGS } from '../auth/ProfileSetup';
import { changeCity, deleteAccount, updateProfile } from '../auth/profileApi';
import { useCities } from '../leaderboard/useCities';
import { cityName } from '../../lib/cities';
import { BadgesGrid } from '../learn/BadgesGrid';
import { MyReports } from './MyReports';
import { PointsChart } from './PointsChart';
import { notificationsEnabled, setNotificationsEnabled } from './settings';

const MONTH_MS = 30 * 86400000;

export default function Profile() {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const profile = useProfile();
  const { colourOf } = useCities();
  const [theme, setTheme] = useState<ThemePref>(getThemePref());
  const [notif, setNotif] = useState(notificationsEnabled());
  const [citySheet, setCitySheet] = useState(false);
  const [deleteSheet, setDeleteSheet] = useState(false);
  const [busy, setBusy] = useState(false);

  const memberSince = toDate(profile.createdAt)?.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' });
  const lastChange = toDate(profile.cityChangedAt)?.getTime() ?? 0;
  const canChangeCity = Date.now() - lastChange > MONTH_MS;

  const onLanguage = (l: Lang) => {
    setLanguage(l);
    updateProfile(profile.id, { language: l }).catch(() => undefined);
  };

  const onChangeCity = async (to: string, locality: string) => {
    setBusy(true);
    try {
      if (to === profile.cityId) await updateProfile(profile.id, { locality });
      else await changeCity(profile.id, profile.cityId, to, locality);
      toast.success(t('profile.cityChanged', { city: cityName(to, i18n.language as Lang) }));
      setCitySheet(false);
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteAccount(profile.id, profile.cityId);
      toast.success(t('profile.deleted'));
      navigate('/signin', { replace: true });
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
      setBusy(false);
    }
  };

  const stats = [
    { label: t('profile.statPoints'), value: profile.points },
    { label: t('profile.statScans'), value: profile.stats?.scans ?? 0 },
    { label: t('profile.statReports'), value: profile.stats?.reports ?? 0 },
    { label: t('profile.statCleaned'), value: profile.stats?.cleaned ?? 0 },
  ];

  return (
    // Desktop: profile, stats and reports on the left; settings in a side column.
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <Avatar name={profile.nickname} color={colourOf(profile.cityId)} size={64} />
          <div className="flex flex-col gap-1">
            <h2 className="t-h1">{profile.nickname}</h2>
            <div className="flex flex-wrap items-center gap-2 t-small text-muted">
              <CityTag cityId={profile.cityId} />
              <span>{profile.locality}</span>
            </div>
            {memberSince && <span className="t-caption text-muted">{t('profile.memberSince', { date: memberSince })}</span>}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <Card key={s.label} className="flex flex-col items-center p-3 text-center">
              <span className="t-h2">{num(s.value)}</span>
              <span className="t-caption text-muted">{s.label}</span>
            </Card>
          ))}
        </div>

        <Card>
          <h3 className="mb-2 t-h2">{t('profile.last14')}</h3>
          <PointsChart uid={profile.id} />
        </Card>

        <section className="flex flex-col gap-3">
          <h3 className="t-h2">{t('profile.badges')}</h3>
          <BadgesGrid user={profile} onlyEarned />
        </section>

        <section className="flex flex-col gap-3">
          <h3 className="t-h2">{t('profile.myReports')}</h3>
          <MyReports uid={profile.id} />
        </section>
      </div>

      <div className="flex flex-col gap-5 lg:sticky lg:top-24">
        {profile.role === 'admin' && (
          <Link to="/admin">
            <Card className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
              <span className="flex-1 t-strong">{t('admin.title')}</span>
              <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
            </Card>
          </Link>
        )}

        <section className="flex flex-col gap-4 lg:rounded-[16px] lg:border lg:border-border lg:bg-surface lg:p-5 lg:shadow-card">
          <h3 className="t-h2">{t('profile.settings')}</h3>
          <div className="flex flex-col gap-2">
            <span className="t-strong">{t('setup.language')}</span>
            <Segmented<Lang> label={t('setup.language')} value={i18n.language as Lang} onChange={onLanguage} options={LANGS} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="t-strong">{t('profile.darkMode')}</span>
            <Segmented<ThemePref>
              label={t('profile.darkMode')}
              value={theme}
              onChange={(v) => {
                setTheme(v);
                setThemePref(v);
              }}
              options={[
                { value: 'system', label: t('profile.themeSystem') },
                { value: 'light', label: t('profile.themeLight') },
                { value: 'dark', label: t('profile.themeDark') },
              ]}
            />
          </div>
          <label className="flex min-h-11 items-center justify-between gap-3">
            <span>
              <span className="block t-strong">{t('profile.notifications')}</span>
              <span className="t-caption text-muted">{t('profile.notificationsHint')}</span>
            </span>
            <input
              type="checkbox"
              role="switch"
              checked={notif}
              onChange={(e) => {
                setNotif(e.target.checked);
                setNotificationsEnabled(e.target.checked);
              }}
              className="h-6 w-6 accent-[var(--primary)]"
            />
          </label>
          <SettingsRow
            label={t('profile.changeCity')}
            hint={canChangeCity ? t('profile.changeCityHint') : t('profile.changeCityWait')}
            onClick={() => setCitySheet(true)}
          />
          <SettingsRow label={t('legal.privacy')} onClick={() => navigate('/privacy')} />
          <SettingsRow label={t('profile.about')} onClick={() => navigate('/terms#about')} />
          <Button variant="danger" onClick={() => setDeleteSheet(true)}>
            {t('profile.deleteAccount')}
          </Button>
        </section>

        <Button variant="ghost" onClick={() => signOut(auth)}>
          {t('profile.signOut')}
        </Button>
      </div>

      <Sheet open={citySheet} onClose={() => setCitySheet(false)} title={t('profile.changeCity')}>
        <div className="flex flex-col gap-4">
          <p className="t-small text-muted">{t('profile.changeCityNote')}</p>
          <CityPicker
            initialCity={profile.cityId}
            renderSubmit={(cityId, locality) => (
              <Button
                loading={busy}
                // Switching city is limited to once a month; picking a new locality in the same city is always fine.
                disabled={!cityId || !locality || (cityId !== profile.cityId && !canChangeCity)}
                onClick={() => onChangeCity(cityId, locality)}
              >
                {t('admin.save')}
              </Button>
            )}
          />
        </div>
      </Sheet>

      <Sheet open={deleteSheet} onClose={() => setDeleteSheet(false)} title={t('profile.deleteTitle')}>
        <p className="mb-4 t-body text-muted">{t('profile.deleteText')}</p>
        <div className="flex flex-col gap-3">
          <Button variant="danger" loading={busy} onClick={onDelete}>
            {t('profile.deleteConfirm')}
          </Button>
          <Button variant="ghost" onClick={() => setDeleteSheet(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}

function SettingsRow({ label, hint, onClick, disabled }: { label: string; hint?: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-11 items-center justify-between gap-3 text-left disabled:opacity-60"
    >
      <span>
        <span className="block t-strong">{label}</span>
        {hint && <span className="t-caption text-muted">{hint}</span>}
      </span>
      <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
    </button>
  );
}
