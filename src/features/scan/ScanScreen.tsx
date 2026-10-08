/**
 * Scan & Sort (PRD 4.6). Live camera with a guide frame; the Waste Sorter
 * model labels the live frame about 5 times a second, and the shutter
 * classifies the captured photo and opens the result sheet.
 * Classification runs on the phone, so this works offline too.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CameraView } from '../../components/Camera';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { useToast } from '../../components/Toast';
import { classifyWaste, loadWasteModel, type WasteResult } from '../../ai/classifyWaste';
import type { LoadedModel } from '../../ai/loadModel';
import { blobToImage, captureVideoFrame } from '../../lib/image';
import { perceptualHash } from '../../lib/phash';
import { ScanResultSheet, type CapturedScan } from './ScanResultSheet';

const LIVE_INTERVAL_MS = 200; // ~5 predictions per second

export default function ScanScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [model, setModel] = useState<LoadedModel | null>(null);
  const [progress, setProgress] = useState(0);
  const [modelError, setModelError] = useState(false);
  const [live, setLive] = useState<WasteResult | null>(null);
  const [capture, setCapture] = useState<CapturedScan | null>(null);
  const [busy, setBusy] = useState(false);

  // Load the model (cached after the first time).
  const load = () => {
    setModelError(false);
    loadWasteModel(setProgress)
      .then(setModel)
      .catch(() => setModelError(true));
  };
  useEffect(load, []);

  // Live prediction loop while the camera is showing.
  useEffect(() => {
    if (!model || capture) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (v && v.readyState >= 2 && v.videoWidth > 0) setLive(classifyWaste(model, v));
    }, LIVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [model, capture]);

  const handlePhoto = async (photo: Blob) => {
    if (!model) return;
    setBusy(true);
    try {
      const img = await blobToImage(photo);
      const ai = classifyWaste(model, img);
      const hash = perceptualHash(img);
      setCapture({ photo, previewUrl: img.src, ai, hash });
    } catch {
      toast.error(t('common.genericError'));
    } finally {
      setBusy(false);
    }
  };

  const onShutter = async () => {
    if (!videoRef.current) return;
    handlePhoto(await captureVideoFrame(videoRef.current));
  };

  const close = () => navigate(-1);

  const liveLabel =
    model && live ? (
      <span>
        {t('scan.looksLike', {
          category: t(`category.${live.category}`),
          pct: Math.round(live.confidence * 100),
        })}
      </span>
    ) : null;

  return (
    <CameraView
      videoRef={videoRef}
      guide
      hint={t('scan.hint')}
      onClose={close}
      onShutter={onShutter}
      onGallery={handlePhoto}
      liveLabel={liveLabel}
      busy={busy || !model}
    >
      {/* Model loading / error overlay */}
      {!model && (
        <div className="absolute inset-x-0 top-1/2 z-20 mx-auto w-[80%] max-w-xs -translate-y-1/2 rounded-[16px] bg-surface p-4 text-center text-text shadow-card" role="status">
          {modelError ? (
            <>
              <p className="mb-3 t-small">{t('scan.modelError')}</p>
              <Button variant="secondary" onClick={load}>
                {t('common.tryAgain')}
              </Button>
            </>
          ) : (
            <>
              <p className="mb-3 t-strong">{t('scan.modelLoading')}</p>
              <ProgressBar value={progress} label={t('scan.modelLoading')} />
            </>
          )}
        </div>
      )}
      {model?.placeholder && !capture && (
        <p className="absolute top-[calc(env(safe-area-inset-top)+72px)] right-4 left-4 z-10 rounded-[12px] bg-warning/90 px-3 py-1.5 text-center t-caption text-black">
          {t('scan.placeholderModel')}
        </p>
      )}
      {capture && <ScanResultSheet capture={capture} onScanAnother={() => setCapture(null)} onClose={close} />}
    </CameraView>
  );
}
