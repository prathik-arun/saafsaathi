/**
 * Image helpers: compress photos before upload, and turn files/blobs into
 * <img> elements the AI models can read.
 */
import imageCompression from 'browser-image-compression';

/** Compress to max 1280 px and about 300 KB (fast uploads on 4G). */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const asFile = file instanceof File ? file : new File([file], 'photo.jpg', { type: file.type || 'image/jpeg' });
  return imageCompression(asFile, {
    maxWidthOrHeight: 1280,
    maxSizeMB: 0.3,
    useWebWorker: true,
    fileType: 'image/jpeg',
  });
}

/** Load a Blob into an HTMLImageElement. */
export function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image-load-failed'));
    };
    img.src = url;
  });
}

/** Grab the current camera frame as a JPEG Blob. */
export function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d')!.drawImage(video, 0, 0);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('capture-failed'))), 'image/jpeg', 0.9),
  );
}
