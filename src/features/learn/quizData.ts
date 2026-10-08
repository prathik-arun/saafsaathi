/**
 * Picks today's 5 quiz questions: admin-made questions from Firestore in the
 * user's language if there are enough, otherwise the built-in starter set.
 * Everyone gets the same 5 questions on the same day.
 */
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { istDate } from '../../lib/time';
import type { Lang, QuizQuestionDoc } from '../../lib/types';
import { STARTER_QUIZ } from '../../data/quiz';

export interface QuizQuestion extends QuizQuestionDoc {
  id: string;
}

export const QUIZ_LENGTH = 5;

/** Small deterministic shuffle so the daily pick is the same for everyone. */
function seededShuffle<T>(items: T[], seed: number): T[] {
  const a = [...items];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function starterQuestions(lang: Lang): QuizQuestion[] {
  return STARTER_QUIZ.map((q) => ({
    id: q.id,
    question: q.text[lang].q,
    options: q.text[lang].options,
    answerIndex: q.answerIndex,
    explanation: q.text[lang].why,
    language: lang,
  }));
}

export async function todaysQuiz(lang: Lang): Promise<QuizQuestion[]> {
  let pool: QuizQuestion[] = [];
  try {
    const snap = await getDocs(query(collection(db, 'quizQuestions'), where('language', '==', lang)));
    pool = snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizQuestionDoc) }));
  } catch {
    /* offline: use starter questions */
  }
  if (pool.length < QUIZ_LENGTH) pool = starterQuestions(lang);
  const seed = Math.floor(Date.parse(istDate()) / 86400000);
  return seededShuffle(pool, seed).slice(0, QUIZ_LENGTH);
}

const DONE_KEY = () => `ss-quiz-${istDate()}`;

export function quizDoneToday(): number | null {
  try {
    const v = localStorage.getItem(DONE_KEY());
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function markQuizDone(score: number) {
  try {
    localStorage.setItem(DONE_KEY(), String(score));
  } catch {
    /* ignore */
  }
}
