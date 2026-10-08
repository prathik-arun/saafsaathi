/** Onboarding: 3 slides, shown on first launch only. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { ONBOARDED_KEY } from './onboarded';
import { BinsIllustration, LeaderboardIllustration, MapIllustration } from '../../components/Illustrations';


const SLIDES = [
  { key: 'onboarding.slide1', Art: BinsIllustration },
  { key: 'onboarding.slide2', Art: MapIllustration },
  { key: 'onboarding.slide3', Art: LeaderboardIllustration },
];

export default function Onboarding() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;

  const finish = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, '1');
    } catch {
      /* ignore */
    }
    navigate('/signin', { replace: true });
  };

  const { key, Art } = SLIDES[i];
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-bg px-4 pt-[env(safe-area-inset-top)] pb-6 md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card md:min-h-[640px] md:pt-6">
      <div className="flex h-14 justify-end">
        {!last && (
          <Button variant="ghost" onClick={finish} className="px-3">
            {t('common.skip')}
          </Button>
        )}
      </div>
      <div key={i} className="anim-fade-in flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <Art />
        <h1 className="t-h1 max-w-xs">{t(key)}</h1>
      </div>
      <div className="mb-6 flex justify-center gap-2" aria-label={t('onboarding.progress', { n: i + 1, total: SLIDES.length })}>
        {SLIDES.map((_, j) => (
          <span key={j} className={`h-2 rounded-full transition-all duration-200 ${j === i ? 'w-6 bg-primary' : 'w-2 bg-border'}`} />
        ))}
      </div>
      <Button onClick={() => (last ? finish() : setI(i + 1))}>{last ? t('onboarding.getStarted') : t('common.next')}</Button>
    </div>
  );
}
