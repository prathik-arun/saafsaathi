/** Profile setup (once, after first sign-in): nickname, age group, city, locality, language. */
import { signOut } from 'firebase/auth';
import { LocateFixed, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Segmented } from '../../components/Segmented';
import { useToast } from '../../components/Toast';
import { CITIES, findCity } from '../../lib/cities';
import { getCurrentPosition, nearestCity, nearestLocality } from '../../lib/geo';
import { auth } from '../../lib/firebase';
import { setLanguage, currentLanguage } from '../../lib/i18n';
import type { AgeGroup, Lang } from '../../lib/types';
import { useAuth } from './AuthProvider';
import { createProfile } from './profileApi';

export const LANGS: { value: Lang; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी' },
  { value: 'kn', label: 'ಕನ್ನಡ' },
];

export default function ProfileSetup() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [nickname, setNickname] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('13-17');
  const [language, setLang] = useState<Lang>(currentLanguage());
  const [saving, setSaving] = useState(false);

  const valid = (cityId: string, locality: string) => nickname.trim().length >= 2 && !!cityId && !!locality;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 bg-bg px-4 pt-[calc(env(safe-area-inset-top)+24px)] pb-10 md:max-w-xl md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="t-h1">{t('setup.title')}</h1>
          <p className="t-small text-muted">{t('setup.subtitle')}</p>
        </div>
        {/* Signed in with the wrong account? Let them get out of setup. */}
        <Button variant="ghost" className="shrink-0 px-2" onClick={() => signOut(auth)}>
          {t('setup.notYou')}
        </Button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="t-strong">{t('setup.nickname')}</span>
        <input
          className="h-[52px] w-full rounded-[12px] border border-border bg-surface px-4 t-body outline-none focus:border-primary"
          value={nickname}
          maxLength={20}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="Aarav"
        />
        <span className="t-caption text-muted">{t('setup.nicknameHint')}</span>
      </label>

      <div className="flex flex-col gap-2">
        <span className="t-strong">{t('setup.ageGroup')}</span>
        <Segmented<AgeGroup>
          label={t('setup.ageGroup')}
          value={ageGroup}
          onChange={setAgeGroup}
          options={[
            { value: '13-17', label: '13–17' },
            { value: '18+', label: '18+' },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="t-strong">{t('setup.language')}</span>
        <Segmented<Lang>
          label={t('setup.language')}
          value={language}
          onChange={(l) => {
            setLang(l);
            setLanguage(l);
          }}
          options={LANGS}
        />
      </div>

      <CityPicker
        renderSubmit={(cityId, locality) => (
          <Button
            disabled={!valid(cityId, locality)}
            loading={saving}
            onClick={async () => {
              if (!user) return;
              setSaving(true);
              try {
                await createProfile(user.uid, { nickname, ageGroup, locality, language, cityId });
                navigate('/', { replace: true });
              } catch (e) {
                console.error(e);
                toast.error(t('common.genericError'));
                setSaving(false);
              }
            }}
          >
            {t('setup.join')}
          </Button>
        )}
      />
    </div>
  );
}

/**
 * Pick a home city (search, or detect it once from GPS; the location itself
 * is never saved) and then a locality in that city. Also used to change city.
 */
export function CityPicker({
  initialCity = '',
  renderSubmit,
}: {
  initialCity?: string;
  renderSubmit: (cityId: string, locality: string) => React.ReactNode;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const lang = currentLanguage();
  const [cityId, setCityId] = useState(initialCity);
  const [citySearch, setCitySearch] = useState('');
  const [locality, setLocality] = useState('');
  const [localitySearch, setLocalitySearch] = useState('');
  const [locating, setLocating] = useState(false);

  const city = findCity(cityId);
  const cityMatches = useMemo(() => {
    const q = citySearch.toLowerCase();
    return CITIES.filter((c) => Object.values(c.name).some((n) => n.toLowerCase().includes(q)));
  }, [citySearch]);
  const localityMatches = useMemo(
    () => (city?.localities ?? []).filter((l) => l.name.toLowerCase().includes(localitySearch.toLowerCase())),
    [city, localitySearch],
  );

  const detect = async () => {
    setLocating(true);
    try {
      const at = await getCurrentPosition();
      const c = nearestCity(at);
      if (!c) {
        toast.info(t('setup.cityNotListed'));
        return;
      }
      setCityId(c.id);
      setLocality(nearestLocality(at, c).name);
    } catch {
      toast.error(t('map.locationFailed'));
    } finally {
      setLocating(false);
    }
  };

  const inputCls = 'h-[52px] w-full rounded-[12px] border border-border bg-surface px-4 pl-10 t-body outline-none focus:border-primary';

  return (
    <>
      <div className="flex flex-col gap-2">
        <span className="t-strong">{t('setup.city')}</span>
        <Button variant="secondary" onClick={detect} loading={locating} icon={<LocateFixed className="h-5 w-5" />}>
          {t('setup.detectCity')}
        </Button>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
          <input className={inputCls} value={citySearch} onChange={(e) => setCitySearch(e.target.value)} placeholder={t('setup.citySearch')} aria-label={t('setup.citySearch')} />
        </div>
        <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto">
          {cityMatches.map((c) => (
            <Chip
              key={c.id}
              selected={cityId === c.id}
              onClick={() => {
                setCityId(c.id);
                setLocality('');
                setLocalitySearch('');
              }}
            >
              {c.name[lang]}
            </Chip>
          ))}
        </div>
        <span className="t-caption text-muted">{t('setup.cityHint')}</span>
      </div>

      {city && (
        <div className="flex flex-col gap-2">
          <span className="t-strong">{t('setup.locality')}</span>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
            <input className={inputCls} value={localitySearch} onChange={(e) => setLocalitySearch(e.target.value)} placeholder={t('setup.localitySearch')} aria-label={t('setup.localitySearch')} />
          </div>
          <div className="flex flex-wrap gap-2">
            {localityMatches.map((l) => (
              <Chip key={l.name} selected={locality === l.name} onClick={() => setLocality(l.name)}>
                {l.name}
              </Chip>
            ))}
          </div>
          <span className="t-caption text-muted">{t('setup.localityHint')}</span>
        </div>
      )}

      {renderSubmit(cityId, locality)}
    </>
  );
}
