/**
 * Report a Spot (PRD 4.7):
 *   1. Capture: photo -> face check (blocks photos with people) -> AI tag + severity
 *   2. Details: AI suggestion chips, severity, GPS pin, note, "no people" checkbox
 *      -> duplicate check (same type, Open, within 50 m, last 7 days)
 *   3. Success: +20 pts, View on map, Share on WhatsApp, Done
 */
import { Check, MapPin, Sparkles, UserX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CameraView } from '../../components/Camera';
import { Button } from '../../components/Button';
import { Chip } from '../../components/Chip';
import { Segmented } from '../../components/Segmented';
import { Sheet } from '../../components/Sheet';
import { useToast } from '../../components/Toast';
import { REPORT_TYPE_META } from '../../components/meta';
import { TypeTag } from '../../components/Tags';
import { hasFace, preloadFaceCheck } from '../../ai/faceCheck';
import { detectSpot, loadSpotModel } from '../../ai/detectSpot';
import { celebrate } from '../../lib/celebrate';
import { getCurrentPosition, nearestCity, nearestLocality, type LatLng } from '../../lib/geo';
import { blobToImage, captureVideoFrame, compressPhoto } from '../../lib/image';
import type { ReportDoc, ReportType, Severity, WithId } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';
import { confirmReport, findDuplicate, submitReport } from './reportApi';
import { MiniMap, PinPicker } from './PinMaps';
import { SuccessView } from './SuccessView';
import { ReportImage } from '../../components/ReportImage';

const TYPES: ReportType[] = ['dump', 'bin', 'drain', 'littering', 'other'];

type Step = 'capture' | 'details' | 'success';
type GpsState = { status: 'locating' } | { status: 'ok'; at: LatLng } | { status: 'failed' };

export default function ReportScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const profile = useProfile();
  const videoRef = useRef<HTMLVideoElement>(null);

  const [step, setStep] = useState<Step>('capture');
  const [checking, setChecking] = useState(false);
  const [faceBlocked, setFaceBlocked] = useState(false);
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [aiType, setAiType] = useState<ReportType | null>(null);
  const [aiConfidence, setAiConfidence] = useState(0);
  const [type, setType] = useState<ReportType>('dump');
  const [severity, setSeverity] = useState<Severity>('medium');
  const [gps, setGps] = useState<GpsState>({ status: 'locating' });
  const [pin, setPin] = useState<LatLng | null>(null);
  const [adjusting, setAdjusting] = useState(false);
  const [note, setNote] = useState('');
  const [noPeople, setNoPeople] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<WithId<ReportDoc> | null>(null);
  const [result, setResult] = useState<{ id?: string; points: number; queued: boolean; confirmed?: boolean } | null>(null);

  useEffect(() => {
    preloadFaceCheck();
    loadSpotModel().catch(() => undefined);
  }, []);

  const locate = () => {
    setGps({ status: 'locating' });
    getCurrentPosition()
      .then((at) => {
        setGps({ status: 'ok', at });
        setPin(at);
      })
      .catch(() => setGps({ status: 'failed' }));
  };

  // Step 1: photo -> face check -> AI suggestion.
  const handlePhoto = async (raw: Blob) => {
    setChecking(true);
    try {
      const small = await compressPhoto(raw);
      const img = await blobToImage(small);
      if (await hasFace(img)) {
        setFaceBlocked(true); // the photo is dropped, never uploaded
        return;
      }
      try {
        const spot = detectSpot(await loadSpotModel(), img);
        setAiType(spot.type);
        setAiConfidence(spot.confidence);
        setType(spot.type);
        setSeverity(spot.severity);
      } catch {
        setAiType(null); // the user picks the type themselves
      }
      setPhoto(small);
      setPreviewUrl(img.src);
      setStep('details');
      if (gps.status !== 'ok') locate();
    } catch (e) {
      console.error(e);
      toast.error(t('report.faceCheckFailed'));
    } finally {
      setChecking(false);
    }
  };

  const doSubmit = async () => {
    if (!photo || !pin) return;
    setSubmitting(true);
    try {
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 20);
      const r = await submitReport({ id, uid: profile.id, type, severity, aiType, aiConfidence, lat: pin.lat, lng: pin.lng, note, photo });
      setResult({ id, points: r.points, queued: r.queued });
      if (r.points > 0) celebrate();
      if (r.streakBonus) toast.success(t('scan.streakBonus', { points: r.streakBonus, days: profile.streakDays + 1 }));
      setStep('success');
    } catch (e) {
      console.error(e);
      toast.error(t('report.submitFailed'));
    } finally {
      setSubmitting(false);
      setDuplicate(null);
    }
  };

  const onSubmit = async () => {
    if (!pin) return;
    if (navigator.onLine) {
      setSubmitting(true);
      const dup = await findDuplicate(type, pin).catch(() => null);
      setSubmitting(false);
      if (dup) return setDuplicate(dup);
    }
    doSubmit();
  };

  const confirmInstead = async () => {
    if (!duplicate) return;
    setSubmitting(true);
    try {
      const r = await confirmReport(profile.id, duplicate.id);
      if (r.points > 0) celebrate();
      setResult({ id: duplicate.id, points: r.points, queued: false, confirmed: true });
      setStep('success');
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(t(msg === 'own-report' ? 'report.ownReport' : msg === 'already-confirmed' ? 'report.alreadyConfirmed' : 'common.genericError'));
    } finally {
      setSubmitting(false);
      setDuplicate(null);
    }
  };

  const retake = () => {
    setStep('capture');
    setPhoto(null);
    setNoPeople(false);
  };

  // ----- Step 1: capture -----
  if (step === 'capture') {
    return (
      <CameraView
        videoRef={videoRef}
        hint={t('report.hint')}
        onClose={() => navigate(-1)}
        onShutter={async () => videoRef.current && handlePhoto(await captureVideoFrame(videoRef.current))}
        onGallery={handlePhoto}
        busy={checking}
        showFlip={false}
        liveLabel={checking ? t('report.checking') : undefined}
      >
        <Sheet open={faceBlocked} onClose={() => setFaceBlocked(false)}>
          <div className="flex flex-col items-center gap-4 text-center text-text">
            <UserX className="h-12 w-12 text-error" aria-hidden />
            <p className="t-body">{t('report.faceFound')}</p>
            <Button onClick={() => setFaceBlocked(false)}>{t('report.retake')}</Button>
          </div>
        </Sheet>
      </CameraView>
    );
  }

  // ----- Step 3: success -----
  if (step === 'success' && result) {
    const spotCity = pin ? nearestCity(pin) : null;
    return (
      <SuccessView
        result={result}
        type={type}
        place={{ cityId: spotCity?.id ?? profile.cityId, locality: spotCity && pin ? nearestLocality(pin, spotCity).name : profile.locality }}
      />
    );
  }

  // ----- Step 2: details -----
  const canSubmit = !!pin && noPeople && !submitting;
  return (
    <div className="mx-auto min-h-dvh max-w-lg bg-bg px-4 pt-[calc(env(safe-area-inset-top)+16px)] pb-10 md:max-w-xl md:my-10 md:min-h-0 md:rounded-[24px] md:border md:border-border md:bg-surface md:px-8 md:py-10 md:shadow-card">
      <h1 className="mb-4 t-h1">{t('report.detailsTitle')}</h1>
      <div className="flex flex-col gap-5">
        <div className="relative">
          <img src={previewUrl} alt={t('report.photoAlt')} className="h-52 w-full rounded-[16px] object-cover" />
          <div className="absolute right-2 bottom-2">
            <Button variant="ghost" onClick={retake} className="bg-surface/90 px-3">
              {t('report.retake')}
            </Button>
          </div>
        </div>

        <section>
          <div className="mb-2 flex items-center gap-1.5 t-caption text-muted">
            <Sparkles className="h-4 w-4 text-accent" aria-hidden />
            {aiType ? t('report.aiSuggestion') : t('report.pickType')}
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {TYPES.map((tp) => {
              const m = REPORT_TYPE_META[tp];
              return (
                <Chip key={tp} selected={type === tp} onClick={() => setType(tp)} icon={<m.Icon className="h-4 w-4" aria-hidden />}>
                  {t(m.key)}
                </Chip>
              );
            })}
          </div>
        </section>

        <section>
          <p className="mb-2 t-strong">{t('severity.label')}</p>
          <Segmented<Severity>
            label={t('severity.label')}
            value={severity}
            onChange={setSeverity}
            options={[
              { value: 'low', label: t('severity.low') },
              { value: 'medium', label: t('severity.medium') },
              { value: 'high', label: t('severity.high') },
            ]}
          />
        </section>

        <section>
          <p className="mb-2 t-strong">{t('report.location')}</p>
          {gps.status === 'locating' && <div className="skeleton h-36 w-full rounded-[12px]" role="status" aria-label={t('report.locating')} />}
          {gps.status === 'failed' && (
            <div className="flex flex-col items-center gap-2 rounded-[12px] border border-border bg-surface p-4 text-center">
              <MapPin className="h-6 w-6 text-warning" aria-hidden />
              <p className="t-small text-muted">{t('report.gpsFailed')}</p>
              <Button variant="secondary" onClick={locate} block={false} className="px-6">
                {t('common.tryAgain')}
              </Button>
            </div>
          )}
          {gps.status === 'ok' && pin && (
            <>
              <MiniMap at={pin} />
              <Button variant="ghost" onClick={() => setAdjusting(true)} icon={<MapPin className="h-4 w-4" />}>
                {t('report.adjustPin')}
              </Button>
            </>
          )}
        </section>

        <label className="flex flex-col gap-1">
          <span className="t-strong">{t('report.noteLabel')}</span>
          <textarea
            value={note}
            maxLength={140}
            rows={2}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('report.notePlaceholder')}
            className="rounded-[12px] border border-border bg-surface p-3 t-body outline-none focus:border-primary"
          />
          <span className="self-end t-caption text-muted">{note.length}/140</span>
        </label>

        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input type="checkbox" checked={noPeople} onChange={(e) => setNoPeople(e.target.checked)} className="mt-0.5 h-6 w-6 shrink-0 accent-[var(--primary)]" />
          <span className="t-body">{t('report.noPeopleCheck')}</span>
        </label>

        <Button onClick={onSubmit} disabled={!canSubmit} loading={submitting}>
          {t('report.submit')}
          <span className="ml-1 rounded-full bg-accent px-2 py-0.5 t-caption text-white">+20 {t('common.ptsShort')}</span>
        </Button>
      </div>

      {adjusting && pin && (
        <PinPicker
          start={pin}
          onCancel={() => setAdjusting(false)}
          onDone={(p) => {
            setPin(p);
            setAdjusting(false);
          }}
        />
      )}

      <Sheet open={!!duplicate} onClose={() => setDuplicate(null)} title={t('report.duplicateTitle')}>
        {duplicate && (
          <div className="flex flex-col gap-3">
            <ReportImage src={duplicate.imageUrl} thumb={duplicate.thumbUrl} alt={t('report.photoAlt')} className="h-44 w-full rounded-[12px] object-cover" />
            <div className="flex gap-2">
              <TypeTag type={duplicate.type} />
            </div>
            <Button onClick={confirmInstead} loading={submitting} icon={<Check className="h-5 w-5" />}>
              {t('report.confirmInstead')}
            </Button>
            <Button variant="ghost" onClick={doSubmit} disabled={submitting}>
              {t('report.differentSpot')}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}
