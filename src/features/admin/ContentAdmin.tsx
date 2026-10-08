/** Challenges and quiz: create, edit, schedule, delete; load starter content. */
import { addDoc, collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Sheet } from '../../components/Sheet';
import { SkeletonCards } from '../../components/Skeleton';
import { useToast } from '../../components/Toast';
import { db } from '../../lib/firebase';
import { shortDate } from '../../lib/format';
import type { ChallengeDoc, Lang, QuizQuestionDoc, WithId } from '../../lib/types';
import { deleteChallenge, loadStarterContent, saveChallenge, type ChallengeInput } from './adminApi';

const input = 'h-11 w-full rounded-[12px] border border-border bg-surface px-3 t-body';

function useCollection<T>(name: string) {
  const [rows, setRows] = useState<WithId<T>[] | null>(null);
  useEffect(() => onSnapshot(collection(db, name), (s) => setRows(s.docs.map((d) => ({ id: d.id, ...(d.data() as T) })))), [name]);
  return rows;
}

const toInputDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export function ContentAdmin() {
  const { t } = useTranslation();
  const toast = useToast();
  const challenges = useCollection<ChallengeDoc>('challenges');
  const questions = useCollection<QuizQuestionDoc>('quizQuestions');
  const [editing, setEditing] = useState<{ id: string | null; c: ChallengeInput } | null>(null);
  const [editingQ, setEditingQ] = useState<{ id: string | null; q: QuizQuestionDoc } | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      return true;
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const newChallenge = (): ChallengeInput => ({
    title: '',
    description: '',
    action: 'scan',
    target: 10,
    rewardPoints: 50,
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 86400000),
  });

  return (
    <div className="flex flex-col gap-6">
      <Button variant="secondary" loading={busy} onClick={() => run(loadStarterContent, t('admin.starterLoaded'))}>
        {t('admin.loadStarter')}
      </Button>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="t-h2">{t('challenges.title')}</h2>
          <IconButton label={t('admin.add')} onClick={() => setEditing({ id: null, c: newChallenge() })}>
            <Plus className="h-5 w-5" />
          </IconButton>
        </div>
        {!challenges ? (
          <SkeletonCards count={2} />
        ) : (
          challenges.map((c) => (
            <Card key={c.id} className="flex items-center gap-3 p-3">
              <div className="flex-1">
                <p className="t-strong">{c.title}</p>
                <p className="t-caption text-muted">
                  {t(`admin.action.${c.action}`)} × {c.target} · +{c.rewardPoints} · {shortDate(c.startDate)} – {shortDate(c.endDate)}
                </p>
              </div>
              <IconButton
                label={t('admin.edit')}
                onClick={() => setEditing({ id: c.id, c: { ...c, startDate: c.startDate.toDate(), endDate: c.endDate.toDate() } })}
              >
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label={t('admin.remove')} onClick={() => run(() => deleteChallenge(c.id), t('admin.removed'))}>
                <Trash2 className="h-4 w-4 text-error" />
              </IconButton>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="t-h2">{t('admin.quizQuestions')}</h2>
          <IconButton
            label={t('admin.add')}
            onClick={() => setEditingQ({ id: null, q: { question: '', options: ['', '', '', ''], answerIndex: 0, explanation: '', language: 'en' } })}
          >
            <Plus className="h-5 w-5" />
          </IconButton>
        </div>
        {!questions ? (
          <SkeletonCards count={2} />
        ) : questions.length === 0 ? (
          <p className="t-small text-muted">{t('admin.noQuestions')}</p>
        ) : (
          questions.map((q) => (
            <Card key={q.id} className="flex items-center gap-3 p-3">
              <span className="rounded-full bg-bg px-2 t-caption uppercase">{q.language}</span>
              <p className="flex-1 t-small">{q.question}</p>
              <IconButton label={t('admin.edit')} onClick={() => setEditingQ({ id: q.id, q })}>
                <Pencil className="h-4 w-4" />
              </IconButton>
              <IconButton label={t('admin.remove')} onClick={() => run(() => deleteDoc(doc(db, 'quizQuestions', q.id)), t('admin.removed'))}>
                <Trash2 className="h-4 w-4 text-error" />
              </IconButton>
            </Card>
          ))
        )}
      </section>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={t(editing?.id ? 'admin.editChallenge' : 'admin.newChallenge')}>
        {editing && (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (await run(() => saveChallenge(editing.id, editing.c), t('admin.saved'))) setEditing(null);
            }}
          >
            <input className={input} required placeholder={t('admin.titleField')} value={editing.c.title} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, title: e.target.value } })} />
            <input className={input} placeholder={t('admin.description')} value={editing.c.description} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, description: e.target.value } })} />
            <label className="t-caption text-muted">
              {t('admin.actionLabel')}
              <select className={input} value={editing.c.action} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, action: e.target.value as ChallengeDoc['action'] } })}>
                {(['scan', 'report', 'cleaned', 'confirm', 'quiz'] as const).map((a) => (
                  <option key={a} value={a}>
                    {t(`admin.action.${a}`)}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="t-caption text-muted">
                {t('admin.target')}
                <input type="number" min={1} className={input} value={editing.c.target} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, target: Number(e.target.value) } })} />
              </label>
              <label className="t-caption text-muted">
                {t('admin.reward')}
                <input type="number" min={1} className={input} value={editing.c.rewardPoints} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, rewardPoints: Number(e.target.value) } })} />
              </label>
              <label className="t-caption text-muted">
                {t('admin.start')}
                <input type="date" className={input} value={toInputDate(editing.c.startDate)} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, startDate: new Date(`${e.target.value}T00:00:00+05:30`) } })} />
              </label>
              <label className="t-caption text-muted">
                {t('admin.end')}
                <input type="date" className={input} value={toInputDate(editing.c.endDate)} onChange={(e) => setEditing({ ...editing, c: { ...editing.c, endDate: new Date(`${e.target.value}T23:59:59+05:30`) } })} />
              </label>
            </div>
            <Button type="submit" loading={busy}>
              {t('admin.save')}
            </Button>
          </form>
        )}
      </Sheet>

      <Sheet open={!!editingQ} onClose={() => setEditingQ(null)} title={t(editingQ?.id ? 'admin.editQuestion' : 'admin.newQuestion')}>
        {editingQ && (
          <form
            className="flex flex-col gap-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const save = () => (editingQ.id ? setDoc(doc(db, 'quizQuestions', editingQ.id), editingQ.q) : addDoc(collection(db, 'quizQuestions'), editingQ.q));
              if (await run(save, t('admin.saved'))) setEditingQ(null);
            }}
          >
            <select className={input} value={editingQ.q.language} onChange={(e) => setEditingQ({ ...editingQ, q: { ...editingQ.q, language: e.target.value as Lang } })} aria-label={t('setup.language')}>
              <option value="en">English</option>
              <option value="hi">हिन्दी</option>
              <option value="kn">ಕನ್ನಡ</option>
            </select>
            <input className={input} required placeholder={t('admin.question')} value={editingQ.q.question} onChange={(e) => setEditingQ({ ...editingQ, q: { ...editingQ.q, question: e.target.value } })} />
            {editingQ.q.options.map((o, i) => (
              <label key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answer"
                  checked={editingQ.q.answerIndex === i}
                  onChange={() => setEditingQ({ ...editingQ, q: { ...editingQ.q, answerIndex: i } })}
                  aria-label={t('admin.correctAnswer')}
                  className="h-5 w-5 accent-[var(--primary)]"
                />
                <input
                  className={input}
                  required
                  placeholder={t('admin.option', { n: i + 1 })}
                  value={o}
                  onChange={(e) => {
                    const options = [...editingQ.q.options];
                    options[i] = e.target.value;
                    setEditingQ({ ...editingQ, q: { ...editingQ.q, options } });
                  }}
                />
              </label>
            ))}
            <input className={input} placeholder={t('admin.explanation')} value={editingQ.q.explanation} onChange={(e) => setEditingQ({ ...editingQ, q: { ...editingQ.q, explanation: e.target.value } })} />
            <Button type="submit" loading={busy}>
              {t('admin.save')}
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
