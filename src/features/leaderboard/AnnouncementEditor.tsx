import { doc, updateDoc } from 'firebase/firestore';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { db } from '../../lib/firebase';

/** City Captains can post one short announcement for their city. */
export function AnnouncementEditor({ cityId, current }: { cityId: string; current: string }) {
  const { t } = useTranslation();
  const toast = useToast();
  const [text, setText] = useState(current);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'cities', cityId), { announcement: text.trim().slice(0, 140) });
      toast.success(t('leaderboard.announced'));
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="flex gap-2">
      <input
        value={text}
        maxLength={140}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('leaderboard.announcePlaceholder')}
        aria-label={t('leaderboard.announcePlaceholder')}
        className="h-11 min-w-0 flex-1 rounded-[12px] border border-border bg-surface px-3 t-small"
      />
      <Button block={false} className="h-11 min-h-11 px-4" onClick={save} loading={saving}>
        {t('leaderboard.post')}
      </Button>
    </div>
  );
}
