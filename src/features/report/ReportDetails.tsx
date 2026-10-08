/**
 * Report details (PRD 4.8): photo, chips, reporter, status timeline,
 * before/after, "I see it too", "Mark as cleaned", Share and Flag.
 * Public page so WhatsApp links work; actions ask non-members to sign in.
 */
import { ArrowLeft, EyeOff, Flag, Share2, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { CameraView } from '../../components/Camera';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { Sheet } from '../../components/Sheet';
import { Skeleton } from '../../components/Skeleton';
import { CityTag, SeverityTag, StatusTag, TypeTag } from '../../components/Tags';
import { STATUS_META } from '../../components/meta';
import { useToast } from '../../components/Toast';
import { ReportImage } from '../../components/ReportImage';
import { loadPhoto } from '../../lib/photos';
import { hasFace } from '../../ai/faceCheck';
import { CLEAN_THRESHOLD, detectSpot, loadSpotModel } from '../../ai/detectSpot';
import { celebrate } from '../../lib/celebrate';
import { shortDate, timeAgo } from '../../lib/format';
import { blobToImage, captureVideoFrame, compressPhoto } from '../../lib/image';
import type { ReportStatus } from '../../lib/types';
import { useAuth } from '../auth/AuthProvider';
import { confirmReport, flagReport, markCleaned } from './reportApi';
import { useHasConfirmed, useReport } from './useReport';
import { whatsappShareUrl } from './SuccessView';

export default function ReportDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { user, profile } = useAuth();
  const { report, state, retry } = useReport(id);
  const [confirmed, setConfirmed] = useHasConfirmed(id, user?.uid);
  const [zoom, setZoom] = useState<string | null>(null);
  const [busy, setBusy] = useState<'confirm' | 'flag' | null>(null);
  const [cleaning, setCleaning] = useState(false);
  const [askSignIn, setAskSignIn] = useState(false);

  const header = (
    <div className="sticky top-0 z-20 flex items-center gap-2 border-b border-border bg-surface px-2 pt-[env(safe-area-inset-top)]">
      <IconButton
        label={t('common.back')}
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        className="border-none"
      >
        <ArrowLeft className="h-5 w-5" />
      </IconButton>
      <h1 className="t-h2 flex-1 truncate">{t('details.title')}</h1>
      {report && (
        <IconButton label={t('details.share')} onClick={() => share()} className="border-none">
          <Share2 className="h-5 w-5" />
        </IconButton>
      )}
    </div>
  );

  const share = async () => {
    if (!report) return;
    const link = `${window.location.origin}/r/${report.id}`;
    const text = t('report.shareText', { type: t(`reportType.${report.type}`).toLowerCase(), link });
    if (navigator.share) await navigator.share({ text, url: link }).catch(() => undefined);
    else window.open(whatsappShareUrl(text), '_blank', 'noopener');
  };

  if (state === 'loading')
    return (
      <Page>
        {header}
        <div className="flex flex-col gap-3 p-4">
          <Skeleton className="h-64 w-full rounded-[16px]" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-24 w-full rounded-[16px]" />
        </div>
      </Page>
    );
  if (state === 'error')
    return (
      <Page>
        {header}
        <div className="p-4">
          <ErrorCard onRetry={retry} />
        </div>
      </Page>
    );
  if (state === 'missing' || !report)
    return (
      <Page>
        {header}
        <EmptyState text={t('details.missing')} actionLabel={t('common.goHome')} onAction={() => navigate('/')} />
      </Page>
    );

  const mine = user?.uid === report.uid;
  const needProfile = (fn: () => void) => () => (profile ? fn() : setAskSignIn(true));

  const onConfirm = needProfile(async () => {
    setBusy('confirm');
    try {
      const r = await confirmReport(profile!.id, report.id);
      setConfirmed(true);
      if (r.points > 0) {
        celebrate();
        toast.success(t('details.confirmedToast', { points: r.points }));
      }
    } catch (e) {
      const msg = (e as Error).message;
      toast.error(t(msg === 'already-confirmed' ? 'report.alreadyConfirmed' : 'common.genericError'));
    } finally {
      setBusy(null);
    }
  });

  const onFlag = needProfile(async () => {
    setBusy('flag');
    try {
      await flagReport(report.id);
      toast.success(t('details.flagged'));
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setBusy(null);
    }
  });

  const steps: { status: ReportStatus; at: typeof report.createdAt | null; label: string }[] = [
    { status: 'open', at: report.createdAt, label: t('details.reported') },
    { status: 'verified', at: report.verifiedAt ?? (report.status !== 'open' ? report.cleanedAt : null), label: t('details.verified') },
    { status: 'cleaned', at: report.cleanedAt, label: t('details.cleaned') },
  ];
  const doneIndex = ['open', 'verified', 'cleaned'].indexOf(report.status);

  return (
    <Page>
      {header}
      {/* Desktop: photos on the left, details on the right. */}
      <div className="flex flex-col gap-4 p-4 pb-12 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:p-8">
        <div className="lg:sticky lg:top-24">
          {report.flagged ? (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-[16px] bg-skeleton text-muted">
              <EyeOff className="h-8 w-8" aria-hidden />
              <p className="t-small">{t('details.hiddenPhoto')}</p>
            </div>
          ) : report.status === 'cleaned' && report.afterImageUrl ? (
            <div className="grid grid-cols-2 gap-2">
              <Photo url={report.imageUrl} thumb={report.thumbUrl} label={t('details.before')} onZoom={setZoom} />
              <Photo url={report.afterImageUrl} thumb={report.afterThumbUrl ?? undefined} label={t('details.after')} onZoom={setZoom} />
            </div>
          ) : (
            <Photo url={report.imageUrl} thumb={report.thumbUrl} onZoom={setZoom} tall />
          )}
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <TypeTag type={report.type} />
            <SeverityTag severity={report.severity} />
            <StatusTag status={report.status} />
          </div>

          <Card className="flex flex-col gap-1">
            <p className="t-strong">{report.locality}</p>
            <p className="t-small text-muted">{timeAgo(report.createdAt)}</p>
            <div className="mt-1 flex items-center gap-2 t-small">
              <span>{t('details.by', { name: report.nickname })}</span>
              <CityTag cityId={report.cityId} />
            </div>
            {report.note && <p className="mt-2 t-body">“{report.note}”</p>}
            {report.confirmCount > 0 && (
              <p className="mt-1 t-caption text-muted">{t('details.confirmations', { count: report.confirmCount })}</p>
            )}
          </Card>

          {/* Status timeline */}
          <Card>
            <ol className="flex flex-col gap-3">
              {steps.map((s, i) => {
                const done = i <= doneIndex;
                const m = STATUS_META[s.status];
                return (
                  <li key={s.status} className="flex items-center gap-3">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2"
                      style={{
                        borderColor: done ? m.color : 'var(--border)',
                        background: done ? m.color : 'transparent',
                        color: done ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      <m.Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className={`flex-1 t-body ${done ? '' : 'text-muted'}`}>{s.label}</span>
                    <span className="t-caption text-muted">{done ? shortDate(s.at) : ''}</span>
                  </li>
                );
              })}
            </ol>
            {report.status === 'open' && <p className="mt-3 t-caption text-muted">{t('details.verifyHint')}</p>}
          </Card>

          {report.status !== 'cleaned' && (
            <div className="flex flex-col gap-3">
              {!mine && (
                <Button variant="secondary" onClick={onConfirm} loading={busy === 'confirm'} disabled={confirmed}>
                  {confirmed ? t('details.youConfirmed') : t('details.seeItToo')}
                </Button>
              )}
              <Button onClick={needProfile(() => setCleaning(true))}>{t('details.markCleaned')}</Button>
            </div>
          )}
          {!report.flagged && (
            <Button variant="ghost" onClick={onFlag} loading={busy === 'flag'} icon={<Flag className="h-4 w-4" />}>
              {t('details.flag')}
            </Button>
          )}
        </div>
      </div>

      {zoom && (
        <div className="anim-fade-in fixed inset-0 z-[70] flex items-center justify-center bg-black" onClick={() => setZoom(null)}>
          <img src={zoom} alt={t('report.photoAlt')} className="max-h-full max-w-full object-contain" />
          <IconButton label={t('common.close')} className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-4">
            <X className="h-5 w-5" />
          </IconButton>
        </div>
      )}

      {cleaning && profile && (
        <AfterPhoto
          onClose={() => setCleaning(false)}
          onDone={async (photo) => {
            const r = await markCleaned(profile.id, report.id, photo);
            celebrate();
            toast.success(t('details.cleanedToast', { points: r.points }));
            if (r.points > 0 && (r.bonus.severity || r.bonus.fast)) {
              toast.info(t('details.cleanedBonus', { severity: r.bonus.severity, fast: r.bonus.fast }));
            }
            setCleaning(false);
          }}
        />
      )}

      <Sheet open={askSignIn} onClose={() => setAskSignIn(false)} title={t('details.signInTitle')}>
        <p className="mb-4 t-body text-muted">{t('details.signInText')}</p>
        <Link to="/signin" state={{ from: `/r/${report.id}` }}>
          <Button>{t('signin.signIn')}</Button>
        </Link>
      </Sheet>
    </Page>
  );
}

function Page({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto min-h-dvh max-w-lg bg-bg md:max-w-2xl lg:max-w-5xl">{children}</div>;
}

function Photo({ url, thumb, label, onZoom, tall }: { url: string; thumb?: string; label?: string; onZoom: (u: string) => void; tall?: boolean }) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={() => loadPhoto(url).then(onZoom).catch(() => undefined)}
      className="relative block w-full overflow-hidden rounded-[16px]"
      aria-label={t('details.zoom')}
    >
      <ReportImage src={url} thumb={thumb} alt={label ?? t('report.photoAlt')} className={`w-full object-cover ${tall ? 'h-64 lg:h-[420px]' : 'h-44 lg:h-72'}`} />
      {label && <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 t-caption text-white">{label}</span>}
    </button>
  );
}

/**
 * Camera for the "after" photo. Face check first, then the Spot Detector
 * must score "Clean area" at least 60%.
 */
function AfterPhoto({ onClose, onDone }: { onClose: () => void; onDone: (photo: Blob) => Promise<void> }) {
  const { t } = useTranslation();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<'face' | 'messy' | null>(null);

  const handle = async (raw: Blob) => {
    setBusy(true);
    try {
      const small = await compressPhoto(raw);
      const img = await blobToImage(small);
      if (await hasFace(img)) return setProblem('face');
      const spot = detectSpot(await loadSpotModel(), img);
      if (spot.cleanScore < CLEAN_THRESHOLD) return setProblem('messy');
      await onDone(small);
    } catch (e) {
      console.error(e);
      toast.error(t('common.genericError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <CameraView
      videoRef={videoRef}
      hint={t('details.afterHint')}
      onClose={onClose}
      onShutter={async () => videoRef.current && handle(await captureVideoFrame(videoRef.current))}
      onGallery={handle}
      busy={busy}
      showFlip={false}
      liveLabel={busy ? t('report.checking') : undefined}
    >
      <Sheet open={!!problem} onClose={() => setProblem(null)}>
        <div className="flex flex-col gap-4 text-center text-text">
          <p className="t-body">{problem === 'face' ? t('report.faceFound') : t('details.stillMessy')}</p>
          <Button onClick={() => setProblem(null)}>{t('report.retake')}</Button>
        </div>
      </Sheet>
    </CameraView>
  );
}
