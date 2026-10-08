/**
 * Photos are saved in Firestore instead of Cloud Storage, because Cloud
 * Storage needs Firebase's paid (Blaze) plan and the PRD rules out anything
 * that needs a billing card.
 *
 *   photos/{photoId}            full report photo (before / after), public
 *   correctionPhotos/{photoId}  photos shared to retrain the AI, owner + admins only
 *
 * Each photo is a JPEG already compressed to ~300 KB, stored as a
 * "data:image/jpeg;base64,..." string (Firestore's limit is 1 MB per document).
 * Reports point at their photo with "photo:<photoId>" and also carry a tiny
 * thumbnail (~6 KB) so lists and the map load fast.
 */
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { blobToImage } from './image';

export type PhotoCollection = 'photos' | 'correctionPhotos';

/** Firestore allows 1 MiB per document; keep a safety margin for the other fields. */
const MAX_DATA_URL_CHARS = 950_000;

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/** Redraw an image at a smaller size as a JPEG data URL. */
async function drawJpeg(blob: Blob, maxSide: number, quality: number): Promise<string> {
  const img = await blobToImage(blob);
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(img.src);
  return canvas.toDataURL('image/jpeg', quality);
}

/** Small thumbnail stored on the report itself (~6 KB). */
export function makeThumbnail(blob: Blob): Promise<string> {
  return drawJpeg(blob, 160, 0.6);
}

/** Save a photo once. If a retry finds it already saved, it is reused. Returns the "photo:<id>" reference. */
export async function savePhoto(col: PhotoCollection, id: string, blob: Blob, uid: string): Promise<string> {
  const ref = doc(db, col, id);
  if (!(await getDoc(ref)).exists()) {
    let data = await blobToDataUrl(blob);
    if (data.length > MAX_DATA_URL_CHARS) data = await drawJpeg(blob, 1024, 0.7); // shrink an unusually large photo
    await setDoc(ref, { uid, data, createdAt: serverTimestamp() });
  }
  return photoRef(col, id);
}

export function photoRef(col: PhotoCollection, id: string): string {
  return col === 'photos' ? `photo:${id}` : `correction:${id}`;
}

/** Turn a "photo:<id>" reference back into its collection and id. */
export function parsePhotoRef(src: string): { col: PhotoCollection; id: string } | null {
  if (src.startsWith('photo:')) return { col: 'photos', id: src.slice(6) };
  if (src.startsWith('correction:')) return { col: 'correctionPhotos', id: src.slice(11) };
  return null;
}

// Photos never change once saved, so keep the ones already loaded.
const cache = new Map<string, Promise<string>>();

/** Get a displayable image URL for a photo reference (or pass ordinary URLs through). */
export function loadPhoto(src: string): Promise<string> {
  const parsed = parsePhotoRef(src);
  if (!parsed) return Promise.resolve(src);
  let p = cache.get(src);
  if (!p) {
    p = getDoc(doc(db, parsed.col, parsed.id)).then((snap) => {
      if (!snap.exists()) throw new Error('photo-missing');
      return snap.data().data as string;
    });
    p.catch(() => cache.delete(src));
    cache.set(src, p);
  }
  return p;
}

/** Download a photo as a Blob (admin corrections ZIP). */
export async function photoBlob(src: string): Promise<Blob> {
  return (await fetch(await loadPhoto(src))).blob();
}

export async function deletePhoto(src: string | null | undefined): Promise<void> {
  const parsed = src ? parsePhotoRef(src) : null;
  if (parsed) await deleteDoc(doc(db, parsed.col, parsed.id)).catch(() => undefined);
}
