/**
 * Daily quiz (PRD 4.11): 5 multiple-choice questions, one per screen,
 * instant right/wrong feedback with a one-line explanation, +2 pts per
 * correct answer.
 */
import { Check, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../components/Button';
import { PointsBadge } from '../../components/PointsBadge';
import { ProgressBar } from '../../components/ProgressBar';
import { SkeletonCards } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { celebrate } from '../../lib/celebrate';
import { currentLanguage } from '../../lib/i18n';
import { awardPoints } from '../../lib/points';
import { istDate } from '../../lib/time';
import { useProfile } from '../auth/AuthProvider';
import { markQuizDone, todaysQuiz, type QuizQuestion } from './quizData';

export default function Quiz() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const profile = useProfile();
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [earned, setEarned] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    todaysQuiz(currentLanguage()).then(setQuestions);
  }, []);

  if (!questions)
    return (
      <div className="mx-auto max-w-lg p-4 pt-16">
        <SkeletonCards count={4} height="h-14" />
      </div>
    );

  const q = questions[i];
  const last = i === questions.length - 1;

  const answer = async (idx: number) => {
    if (picked !== null) return;
    setPicked(idx);
    if (idx === q.answerIndex) {
      setCorrect((c) => c + 1);
      try {
        const r = await awardPoints(profile.id, { action: 'quiz', refId: `${istDate()}-${q.id}` });
        setEarned((e) => e + r.points);
      } catch {
        toast.error(t('quiz.pointsLater'));
      }
    }
  };

  const next = () => {
    if (last) {
      markQuizDone(correct);
      setFinished(true);
      if (earned > 0) celebrate();
      return;
    }
    setI(i + 1);
    setPicked(null);
  };

  if (finished)
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 bg-bg px-4 text-center md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card">
        <h1 className="t-display">{t('quiz.score', { correct, total: questions.length })}</h1>
        {earned > 0 ? <PointsBadge points={earned} animate /> : <p className="t-small text-muted">{t('quiz.noPoints')}</p>}
        <Button onClick={() => navigate('/learn', { replace: true })}>{t('common.done')}</Button>
      </div>
    );

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 bg-bg px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-8 md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card md:min-h-[620px]">
      <div className="flex items-center gap-3">
        <IconButton label={t('common.close')} onClick={() => navigate(-1)}>
          <X className="h-5 w-5" />
        </IconButton>
        <div className="flex-1">
          <ProgressBar value={(i + (picked !== null ? 1 : 0)) / questions.length} label={t('quiz.progress', { n: i + 1, total: questions.length })} />
        </div>
        <span className="t-caption text-muted">
          {i + 1}/{questions.length}
        </span>
      </div>

      <h1 className="t-h1">{q.question}</h1>

      <div className="flex flex-col gap-3">
        {q.options.map((opt, idx) => {
          const isRight = idx === q.answerIndex;
          const show = picked !== null && (isRight || idx === picked);
          const color = show ? (isRight ? 'var(--success)' : 'var(--error)') : undefined;
          return (
            <button
              key={idx}
              type="button"
              disabled={picked !== null}
              onClick={() => answer(idx)}
              className="flex min-h-[52px] items-center justify-between gap-2 rounded-[12px] border-[1.5px] bg-surface px-4 text-left t-body font-medium transition-colors duration-150"
              style={{
                borderColor: color ?? 'var(--primary)',
                color: color ?? 'var(--primary)',
                background: color ? `color-mix(in srgb, ${color} 12%, var(--surface))` : undefined,
              }}
            >
              {opt}
              {show && (isRight ? <Check className="h-5 w-5" aria-label={t('quiz.right')} /> : <X className="h-5 w-5" aria-label={t('quiz.wrong')} />)}
            </button>
          );
        })}
      </div>

      {picked !== null && (
        <div className="anim-fade-in rounded-[12px] bg-surface p-4" role="status">
          <p className="t-strong" style={{ color: picked === q.answerIndex ? 'var(--success)' : 'var(--error)' }}>
            {picked === q.answerIndex ? t('quiz.correct') : t('quiz.notQuite')}
          </p>
          <p className="t-small text-muted">{q.explanation}</p>
        </div>
      )}

      <div className="flex-1" />
      <Button onClick={next} disabled={picked === null}>
        {last ? t('quiz.finish') : t('common.next')}
      </Button>
    </div>
  );
}
