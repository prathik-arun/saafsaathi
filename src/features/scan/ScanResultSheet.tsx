/**
 * The bottom sheet after the shutter (PRD 4.6):
 *  - confident (>= 70%): category, confidence, item guess, tip, "Which bin?", +5 points
 *  - not sure (< 70%): "Not sure about this one. Which is it?" -> user picks, then points
 *  - "Wrong? Fix it": pick the right category, saved as a correction
 *  - after a user pick: "Share this photo to help the AI learn?"
 */
import { Leaf, Package, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { Sheet } from '../../components/Sheet';
import { PointsBadge } from '../../components/PointsBadge';
import { CategoryTag } from '../../components/Tags';
import { CATEGORY_META } from '../../components/meta';
import { useToast } from '../../components/Toast';
import { CONFIDENCE_THRESHOLD, type WasteResult } from '../../ai/classifyWaste';
import { celebrate } from '../../lib/celebrate';
import { blobToImage, compressPhoto } from '../../lib/image';
import { hasFace } from '../../ai/faceCheck';
import { currentLanguage } from '../../lib/i18n';
import type { Category, WasteLabel } from '../../lib/types';
import { disposalTip, itemName } from '../../data/tips';
import { useProfile } from '../auth/AuthProvider';
import { fixScan, recordScan, shareCorrection, type ScanOutcome } from './scanApi';

export interface CapturedScan {
  photo: Blob;
  previewUrl: string;
  ai: WasteResult;
  hash: string;
}

type Phase = 'saving' | 'result' | 'pick' | 'fix' | 'share';

export function ScanResultSheet({ capture, onScanAnother, onClose }: { capture: CapturedScan; onScanAnother: () => void; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const profile = useProfile();
  const lang = currentLanguage();
  const { ai } = capture;
  const confident = ai.confidence >= CONFIDENCE_THRESHOLD;

  const [phase, setPhase] = useState<Phase>(confident ? 'saving' : 'pick');
  const [category, setCategory] = useState<WasteLabel>(ai.category);
  const [userPicked, setUserPicked] = useState(false);
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [sharing, setSharing] = useState(false);
  const started = useRef(false);

  const save = async (cat: WasteLabel, corrected: boolean) => {
    try {
      const r = await recordScan({ uid: profile.id, category: cat, aiCategory: ai.category, confidence: ai.confidence, corrected, hash: capture.hash });
      setOutcome(r);
      if (r.points > 0) celebrate();
      if (r.streakBonus) toast.success(t('scan.streakBonus', { points: r.streakBonus, days: r.streakDays }));
      r.newBadges?.forEach((b) => toast.success(t('badges.unlocked', { name: t(`badges.${b}.name`) })));
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    }
  };

  // Confident result: save straight away (once, even in React StrictMode).
  useEffect(() => {
    if (!confident || started.current) return;
    started.current = true;
    save(ai.category, false).then(() => setPhase('result'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPick = async (cat: WasteLabel) => {
    setCategory(cat);
    setUserPicked(true);
    if (phase === 'pick') {
      setPhase('saving');
      await save(cat, cat !== ai.category);
    } else if (outcome?.scanId) {
      fixScan(outcome.scanId, cat).catch(() => undefined);
    }
    setPhase('share');
  };

  const answerShare = async (yes: boolean) => {
    if (yes) {
      setSharing(true);
      try {
        const photo = await compressPhoto(capture.photo);
        // Shared photos are seen by admins, so never share one that shows a person.
        if (await hasFace(await blobToImage(photo))) {
          toast.info(t('scan.shareHasFace'));
        } else {
          await shareCorrection(profile.id, photo, ai.category, category);
          toast.success(t('scan.thanksShare'));
        }
      } catch (e) {
        console.error(e);
        toast.error(t('scan.shareFailed'));
      } finally {
        setSharing(false);
      }
    }
    setPhase('result');
  };

  const pickButtons = (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-2">
        {(['wet', 'dry', 'hazardous'] as Category[]).map((c) => (
          <CategoryButton key={c} category={c} onClick={() => onPick(c)} />
        ))}
      </div>
      <Button variant="ghost" onClick={() => onPick('notwaste')}>
        {t('category.notwaste')}
      </Button>
    </div>
  );

  return (
    <Sheet open onClose={onScanAnother}>
      <div className="flex gap-4">
        <img src={capture.previewUrl} alt={t('scan.yourPhoto')} className="h-20 w-20 shrink-0 rounded-[12px] object-cover" />
        <div className="flex flex-col justify-center gap-1">
          {phase === 'pick' && <h2 className="t-h2">{t('scan.notSure')}</h2>}
          {phase === 'fix' && <h2 className="t-h2">{t('scan.fixTitle')}</h2>}
          {phase === 'share' && <h2 className="t-h2">{t('scan.shareQuestion')}</h2>}
          {(phase === 'result' || phase === 'saving') && (
            <>
              <CategoryTag category={category} size="lg" />
              {!userPicked && <span className="t-small text-muted">{t('scan.sure', { pct: Math.round(ai.confidence * 100) })}</span>}
            </>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        {(phase === 'pick' || phase === 'fix') && pickButtons}

        {phase === 'share' && (
          <div className="flex flex-col gap-3">
            <p className="t-small text-muted">{t('scan.shareExplain')}</p>
            <Button onClick={() => answerShare(true)} loading={sharing}>
              {t('common.yes')}
            </Button>
            <Button variant="secondary" onClick={() => answerShare(false)} disabled={sharing}>
              {t('common.no')}
            </Button>
          </div>
        )}

        {(phase === 'result' || phase === 'saving') && (
          <>
            {ai.item && !userPicked && <p className="t-strong">{itemName(ai.item, lang)}</p>}
            <p className="t-body">{disposalTip(category, userPicked ? undefined : ai.item, lang)}</p>
            {category !== 'notwaste' && <WhichBin category={category} />}
            <PointsLine outcome={outcome} saving={phase === 'saving'} notWaste={category === 'notwaste'} />
            <Button onClick={onScanAnother}>{t('scan.scanAnother')}</Button>
            {!userPicked && (
              <Button variant="ghost" onClick={() => setPhase('fix')} disabled={phase === 'saving'}>
                {t('scan.wrongFix')}
              </Button>
            )}
            {userPicked && (
              <Button variant="ghost" onClick={onClose}>
                {t('common.done')}
              </Button>
            )}
          </>
        )}
      </div>
    </Sheet>
  );
}

function PointsLine({ outcome, saving, notWaste }: { outcome: ScanOutcome | null; saving: boolean; notWaste: boolean }) {
  const { t } = useTranslation();
  if (saving || !outcome) return <div className="skeleton h-8 w-24 rounded-full" />;
  if (notWaste) return null;
  if (outcome.queued) return <p className="t-small text-muted">{t('scan.queued')}</p>;
  if (outcome.points > 0) return <div><PointsBadge points={outcome.points} animate /></div>;
  return <p className="t-small text-muted">{t(outcome.reason === 'duplicate' ? 'scan.duplicate' : 'scan.dailyLimit')}</p>;
}

/** Large category button: soft fill, category colour icon and text (56 px). */
export function CategoryButton({ category, onClick }: { category: Category; onClick: () => void }) {
  const { t } = useTranslation();
  const m = CATEGORY_META[category];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-[12px] t-caption font-semibold transition-transform duration-150 active:scale-[0.98]"
      style={{ background: m.soft, color: m.color }}
    >
      <m.Icon className="h-5 w-5" aria-hidden />
      {t(m.key)}
    </button>
  );
}

/** "Which bin?" row: the three bins, with the right one highlighted. */
function WhichBin({ category }: { category: WasteLabel }) {
  const { t } = useTranslation();
  const bins: { c: Category; Icon: typeof Leaf }[] = [
    { c: 'wet', Icon: Leaf },
    { c: 'dry', Icon: Package },
    { c: 'hazardous', Icon: TriangleAlert },
  ];
  return (
    <div>
      <p className="mb-2 t-caption text-muted">{t('scan.whichBin')}</p>
      <div className="grid grid-cols-3 gap-2">
        {bins.map(({ c, Icon }) => {
          const m = CATEGORY_META[c];
          const on = c === category;
          return (
            <div
              key={c}
              className="flex h-16 flex-col items-center justify-center gap-1 rounded-[12px] border-2 t-caption"
              style={{
                borderColor: on ? m.color : 'var(--border)',
                background: on ? m.soft : 'transparent',
                color: on ? m.color : 'var(--text-muted)',
                opacity: on ? 1 : 0.6,
              }}
              aria-current={on || undefined}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {t(m.key)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
