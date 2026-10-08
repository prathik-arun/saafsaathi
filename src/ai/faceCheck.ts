/**
 * Face check (PRD Section 5, "Face check"). Runs Google's MediaPipe Face
 * Detector in the browser on every report and "after" photo BEFORE upload.
 * Any face with confidence over 50% blocks the upload, so photos of people
 * never reach the server. The model and its WebAssembly runtime are served
 * from /public, so no outside service is called.
 */
import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

const MIN_CONFIDENCE = 0.5;
let detectorPromise: Promise<FaceDetector> | null = null;

function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks('/mediapipe');
      return FaceDetector.createFromOptions(vision, {
        baseOptions: { modelAssetPath: '/models/face/blaze_face_short_range.tflite' },
        runningMode: 'IMAGE',
        minDetectionConfidence: MIN_CONFIDENCE,
      });
    })();
    detectorPromise.catch(() => (detectorPromise = null));
  }
  return detectorPromise;
}

/** Start loading early (e.g. when the Report camera opens). */
export function preloadFaceCheck() {
  getDetector().catch(() => undefined);
}

/** True if the photo contains at least one face. Throws if the check could not run. */
export async function hasFace(image: HTMLImageElement | HTMLCanvasElement): Promise<boolean> {
  const detector = await getDetector();
  const { detections } = detector.detect(image);
  return detections.some((d) => (d.categories[0]?.score ?? 0) > MIN_CONFIDENCE);
}
