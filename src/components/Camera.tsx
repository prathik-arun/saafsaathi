/**
 * Full-screen camera used by Scan & Sort, Report a Spot and "Mark as cleaned".
 * Controls: Close (top-left), Flash (top-right), Gallery (bottom-left),
 * Shutter (72 px white circle), Flip camera (bottom-right).
 * Handles the "camera permission denied" state with a gallery fallback.
 */
import { Camera as CameraIcon, ImageIcon, SwitchCamera, X, Zap, ZapOff } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from './Button';

type CamStatus = 'starting' | 'live' | 'denied' | 'error';

/** Opens the back camera and keeps it running while mounted. */
export function useCamera(videoRef: RefObject<HTMLVideoElement>) {
  const [status, setStatus] = useState<CamStatus>('starting');
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('starting');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('no-camera');
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 1280 } },
          audio: false,
        });
        if (cancelled) return stream.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        const track = stream.getVideoTracks()[0];
        const caps = (track.getCapabilities?.() ?? {}) as MediaTrackCapabilities & { torch?: boolean };
        setTorchSupported(!!caps.torch);
        setTorchOn(false);
        setStatus('live');
      } catch (e) {
        if (cancelled) return;
        const name = (e as DOMException)?.name;
        setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'error');
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing, videoRef]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  const flip = useCallback(() => setFacing((f) => (f === 'environment' ? 'user' : 'environment')), []);

  return { status, facing, flip, torchSupported, torchOn, toggleTorch };
}

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement>;
  hint: string;
  onClose: () => void;
  onShutter: () => void;
  onGallery: (file: File) => void;
  /** Shown just above the shutter (e.g. the live "Looks like: Dry, 92%"). */
  liveLabel?: ReactNode;
  /** Draw the rounded square guide frame (Scan). */
  guide?: boolean;
  busy?: boolean;
  children?: ReactNode;
  showFlip?: boolean;
}

export function CameraView({ videoRef, hint, onClose, onShutter, onGallery, liveLabel, guide, busy, children, showFlip = true }: CameraViewProps) {
  const { t } = useTranslation();
  const cam = useCamera(videoRef);
  const fileRef = useRef<HTMLInputElement>(null);
  const [showSettingsHelp, setShowSettingsHelp] = useState(false);

  const pickFile = () => fileRef.current?.click();
  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) onGallery(f);
        e.target.value = '';
      }}
    />
  );

  if (cam.status === 'denied' || cam.status === 'error') {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-bg">
        <div className="flex p-4 pt-[calc(env(safe-area-inset-top)+16px)]">
          <IconButton label={t('common.close')} onClick={onClose}>
            <X className="h-5 w-5" />
          </IconButton>
        </div>
        <div className="mx-auto flex max-w-sm flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraIcon className="h-12 w-12 text-muted" aria-hidden />
          <h1 className="t-h1">{t(cam.status === 'denied' ? 'camera.deniedTitle' : 'camera.errorTitle')}</h1>
          <p className="t-body text-muted">{t(cam.status === 'denied' ? 'camera.deniedText' : 'camera.errorText')}</p>
          {showSettingsHelp && <p className="t-small rounded-[12px] bg-primary-soft p-3 text-primary">{t('camera.settingsHelp')}</p>}
          {cam.status === 'denied' && (
            <Button variant="primary" onClick={() => setShowSettingsHelp(true)}>
              {t('camera.openSettings')}
            </Button>
          )}
          <Button variant="secondary" onClick={pickFile} icon={<ImageIcon className="h-5 w-5" />}>
            {t('camera.useGallery')}
          </Button>
          {fileInput}
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-camera text-white">
      <video
        ref={videoRef}
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={cam.facing === 'user' ? { transform: 'scaleX(-1)' } : undefined}
      />

      {guide && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="aspect-square w-[72%] max-w-sm rounded-[28px] border-4 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
      )}

      {/* Top controls */}
      <div className="relative z-10 mx-auto flex w-full max-w-3xl items-center justify-between p-4 pt-[calc(env(safe-area-inset-top)+16px)]">
        <IconButton label={t('common.close')} onClick={onClose} className="border-white/30 bg-black/40 text-white">
          <X className="h-5 w-5" />
        </IconButton>
        <p className="mx-2 rounded-full bg-black/50 px-3 py-1.5 text-center t-small">{hint}</p>
        <IconButton
          label={t(cam.torchOn ? 'camera.flashOff' : 'camera.flashOn')}
          onClick={cam.toggleTorch}
          disabled={!cam.torchSupported}
          className="border-white/30 bg-black/40 text-white"
        >
          {cam.torchOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
        </IconButton>
      </div>

      <div className="flex-1" />

      {/* Bottom controls */}
      <div className="relative z-10 flex flex-col items-center gap-4 pb-[calc(env(safe-area-inset-bottom)+28px)]">
        {liveLabel && <div className="rounded-full bg-black/60 px-4 py-2 t-strong">{liveLabel}</div>}
        {cam.status === 'starting' && <div className="rounded-full bg-black/60 px-4 py-2 t-small">{t('camera.starting')}</div>}
        <div className="flex w-full max-w-md items-center justify-around px-8">
          <IconButton label={t('camera.gallery')} onClick={pickFile} className="border-white/30 bg-black/40 text-white">
            <ImageIcon className="h-5 w-5" />
          </IconButton>
          <button
            type="button"
            aria-label={t('camera.shutter')}
            onClick={onShutter}
            disabled={cam.status !== 'live' || busy}
            className="h-[72px] w-[72px] rounded-full border-4 border-white/60 bg-white transition-transform duration-150 active:scale-90 disabled:opacity-50"
            style={{ backgroundClip: 'content-box', padding: 3 }}
          />
          {showFlip ? (
            <IconButton label={t('camera.flip')} onClick={cam.flip} className="border-white/30 bg-black/40 text-white">
              <SwitchCamera className="h-5 w-5" />
            </IconButton>
          ) : (
            <span className="w-11" />
          )}
        </div>
      </div>
      {fileInput}
      {children}
    </div>
  );
}
