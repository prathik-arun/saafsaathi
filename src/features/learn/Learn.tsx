/** Learn & Challenges (PRD 4.11): daily quiz, weekly challenges, badges, learn cards. */
import { Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { SkeletonCards } from '../../components/Skeleton';
import { currentLanguage } from '../../lib/i18n';
import { LEARN_CARDS } from '../../data/learn';
import { useProfile } from '../auth/AuthProvider';
import { BadgesGrid } from './BadgesGrid';
import { ChallengeCard } from './ChallengeCard';
import { quizDoneToday } from './quizData';
import { useChallenges } from './useChallenges';

export default function Learn() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const lang = currentLanguage();
  const { challenges, error, retry } = useChallenges(profile.id);
  const done = quizDoneToday();

  return (
    // Desktop: two columns (quiz | challenges, badges | …) with the learn cards across the bottom.
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
      <section>
        <Card className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Brain className="h-6 w-6" aria-hidden />
          </span>
          <div className="flex-1">
            <h2 className="t-h2">{t('quiz.title')}</h2>
            <p className="t-small text-muted">{done === null ? t('quiz.cardText') : t('quiz.doneToday', { correct: done })}</p>
          </div>
        </Card>
        <Button variant="secondary" className="mt-3" onClick={() => navigate('/learn/quiz')} disabled={done !== null}>
          {done === null ? t('quiz.play') : t('quiz.comeBack')}
        </Button>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="t-h2">{t('challenges.title')}</h2>
        {error ? (
          <ErrorCard onRetry={retry} />
        ) : !challenges ? (
          <SkeletonCards count={2} height="h-36" />
        ) : challenges.length === 0 ? (
          <EmptyState text={t('challenges.none')} />
        ) : (
          challenges.map((c) => <ChallengeCard key={c.id} c={c} />)
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="t-h2">{t('badges.title')}</h2>
        <BadgesGrid user={profile} />
      </section>

      <section className="flex flex-col gap-3 lg:col-span-2">
        <h2 className="t-h2">{t('learn.cardsTitle')}</h2>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0">
          {LEARN_CARDS.map((c) => (
            <Card key={c.id} stripe={c.color} className="w-[78%] shrink-0 snap-center lg:w-auto">
              <h3 className="mb-2 t-h2" style={{ color: c.color }}>
                {c.title[lang]}
              </h3>
              <p className="t-body">{c.body[lang]}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
