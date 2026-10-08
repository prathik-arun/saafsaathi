/** Plain-language Privacy Policy, Terms and About (linked from sign-in and Settings). */
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../../components/Button';

export default function Legal({ page }: { page: 'privacy' | 'terms' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const points = t(`legal.${page}Points`, { returnObjects: true }) as string[];

  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-bg pb-12 md:max-w-2xl md:py-6">
      <div className="sticky top-0 flex items-center gap-2 border-b border-border bg-surface px-2 pt-[env(safe-area-inset-top)]">
        <IconButton label={t('common.back')} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))} className="border-none">
          <ArrowLeft className="h-5 w-5" />
        </IconButton>
        <h1 className="t-h2">{t(`legal.${page}`)}</h1>
      </div>
      <div className="flex flex-col gap-4 px-4 pt-4">
        <p className="t-body text-muted">{t(`legal.${page}Intro`)}</p>
        <ul className="flex list-disc flex-col gap-2 pl-5 t-body">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {page === 'terms' && (
          <section id="about" className="mt-4 flex flex-col gap-2">
            <h2 className="t-h2">{t('profile.about')}</h2>
            <p className="t-body">{t('legal.about')}</p>
            <p className="t-small text-muted">{t('legal.aiDisclosure')}</p>
          </section>
        )}
      </div>
    </div>
  );
}
