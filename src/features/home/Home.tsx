/**
 * Home dashboard (PRD 4.5): greeting, points card, quick actions, tip of the
 * day, weekly challenge, daily quiz, recent activity. Shows last week's
 * winning city as a banner all week.
 */
import { Brain, Camera, ChevronRight, Crown, Flame, Lightbulb, ScanLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { BinsIllustration } from '../../components/Illustrations';
import { CityTag } from '../../components/Tags';
import { useRollUp } from '../../components/PointsBadge';
import { softOf } from '../../components/meta';
import { num } from '../../lib/format';
import { currentLanguage } from '../../lib/i18n';
import { currentWeekly } from '../../lib/points';
import { istDate, istHour, lastWeekId, previousDate } from '../../lib/time';
import { tipOfTheDay } from '../../data/tips';
import { useProfile } from '../auth/AuthProvider';
import { useCities, type CityRecord } from '../leaderboard/useCities';
import { cityName } from '../../lib/cities';
import { ChallengeCard } from '../learn/ChallengeCard';
import { quizDoneToday, QUIZ_LENGTH } from '../learn/quizData';
import { useChallenges } from '../learn/useChallenges';
import { ActivityList } from '../profile/ActivityList';
import { POINTS } from '../../lib/points';

/** Last week's total for a city, whichever field it is in right now. */
function lastWeekPoints(h: CityRecord): number {
  const lw = lastWeekId();
  if (h.weekId === lw) return h.weeklyPoints;
  if (h.prevWeekId === lw) return h.prevWeeklyPoints;
  return 0;
}

export default function Home() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useProfile();
  const { weeklyRanking, cities } = useCities();
  const { challenges } = useChallenges(profile.id);
  const lang = currentLanguage();
  const total = useRollUp(profile.points, false);

  const hour = istHour();
  const greeting = hour < 12 ? 'home.morning' : hour < 17 ? 'home.afternoon' : 'home.evening';
  const today = istDate();
  const streak = profile.lastActiveDate === today || profile.lastActiveDate === previousDate(today) ? profile.streakDays : 0;
  const rank = weeklyRanking.findIndex((h) => h.id === profile.cityId) + 1;
  const winner = [...cities].sort((a, b) => lastWeekPoints(b) - lastWeekPoints(a))[0];
  const showWinner = winner && lastWeekPoints(winner) > 0;
  const quizDone = quizDoneToday();
  const isNew = profile.points === 0 && profile.stats?.scans === 0;
  const challenge = challenges?.find((c) => !c.claimed) ?? challenges?.[0];

  return (
    <div className="flex flex-col gap-3 lg:gap-6">
      {showWinner && (
        <div
          className="flex items-center gap-2 rounded-[12px] px-3 py-2 t-small font-semibold"
          style={{ background: softOf(winner.colour, 20), color: winner.colour }}
        >
          <Crown className="h-4 w-4" aria-hidden />
          {t('home.lastWeekWinner', { city: cityName(winner.id, lang), points: num(lastWeekPoints(winner)) })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <h2 className="t-h2">{t(greeting, { name: profile.nickname })}</h2>
        <CityTag cityId={profile.cityId} />
      </div>

      {/* Desktop: main column + side column. Phones: one column in this order. */}
      <div className="flex flex-col gap-3 lg:grid lg:grid-cols-3 lg:items-start lg:gap-6">
        <div className="flex flex-col gap-3 lg:col-span-2 lg:gap-6">
          {/* Points card */}
          <div
            className="rounded-[16px] p-4 text-white shadow-card"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
          >
            <p className="t-caption opacity-90">{t('home.totalPoints')}</p>
            <p className="t-display">{num(total)}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 t-small">
              <span>{t('home.thisWeek', { points: num(currentWeekly(profile)) })}</span>
              <span className="inline-flex items-center gap-1">
                <Flame className="h-4 w-4" aria-hidden />
                {t('home.streak', { count: streak })}
              </span>
            </div>
            {rank > 0 && <p className="mt-2 t-small font-semibold">{t('home.cityRank', { rank, city: cityName(profile.cityId, lang) })}</p>}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <QuickAction label={t('home.scanWaste')} Icon={ScanLine} color="var(--wet)" onClick={() => navigate('/scan')} />
            <QuickAction label={t('home.reportSpot')} Icon={Camera} color="var(--accent)" onClick={() => navigate('/report')} />
          </div>

          {isNew && (
            <Card>
              <EmptyState
                illustration={<BinsIllustration />}
                text={t('home.newUser')}
                actionLabel={t('home.startScanning')}
                onAction={() => navigate('/scan')}
              />
            </Card>
          )}

          <div className="hidden lg:block">
            <section className="mt-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="t-h2">{t('home.recentActivity')}</h2>
                <Button variant="ghost" className="px-2" onClick={() => navigate('/activity')}>
                  {t('home.seeAll')}
                </Button>
              </div>
              <ActivityList uid={profile.id} max={5} empty={<p className="t-small text-muted">{t('activity.empty')}</p>} />
            </section>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <Card className="flex items-start gap-3">
            <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
            <div>
              <p className="t-caption text-muted">{t('home.tipOfDay')}</p>
              <p className="t-body">{tipOfTheDay(lang)}</p>
            </div>
          </Card>

          {challenge && <ChallengeCard c={challenge} />}

          <Card className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Brain className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex-1">
              <p className="t-strong">{t('quiz.title')}</p>
              <p className="t-small text-muted">
                {quizDone === null
                  ? t('home.quizMeta', { n: QUIZ_LENGTH, points: QUIZ_LENGTH * POINTS.quiz })
                  : t('quiz.doneToday', { correct: quizDone })}
              </p>
            </div>
            <Button
              variant="secondary"
              block={false}
              className="h-11 min-h-11 px-5"
              onClick={() => navigate('/learn/quiz')}
              disabled={quizDone !== null}
            >
              {t('quiz.play')}
            </Button>
          </Card>

          <button type="button" onClick={() => navigate('/learn')} className="text-left">
            <Card className="flex items-center justify-between">
              <span className="t-strong">{t('home.learnChallenges')}</span>
              <ChevronRight className="h-5 w-5 text-muted" aria-hidden />
            </Card>
          </button>
        </div>
      </div>

      {/* Phones: recent activity at the bottom. */}
      <div className="lg:hidden">
        <section className="mt-2 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="t-h2">{t('home.recentActivity')}</h2>
            <Button variant="ghost" className="px-2" onClick={() => navigate('/activity')}>
              {t('home.seeAll')}
            </Button>
          </div>
          <ActivityList uid={profile.id} max={5} empty={<p className="t-small text-muted">{t('activity.empty')}</p>} />
        </section>
      </div>
    </div>
  );
}

function QuickAction({ label, Icon, color, onClick }: { label: string; Icon: typeof ScanLine; color: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex aspect-square flex-col items-start justify-between rounded-[16px] border border-border p-4 text-left shadow-card transition duration-150 hover:brightness-[0.98] active:scale-[0.98] lg:aspect-auto lg:h-28 lg:flex-row lg:items-center lg:justify-start lg:gap-4 lg:p-6"
      style={{ background: softOf(color, 14) }}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ background: color }}>
        <Icon className="h-6 w-6" aria-hidden />
      </span>
      <span className="t-h2">{label}</span>
    </button>
  );
}
