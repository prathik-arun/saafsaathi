/**
 * Shows a report photo stored in Firestore ("photo:<id>"). While the full
 * photo loads, the small thumbnail (or a skeleton) is shown instead.
 */
import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { loadPhoto } from '../lib/photos';

interface Props extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | null | undefined;
  /** Small data-URL thumbnail shown immediately. */
  thumb?: string;
  /** Lists and the map only need the thumbnail; skip loading the full photo. */
  thumbOnly?: boolean;
}

export function ReportImage({ src, thumb, thumbOnly, className = '', ...rest }: Props) {
  const [full, setFull] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src || (thumbOnly && thumb)) return;
    let alive = true;
    setFull(null);
    setFailed(false);
    loadPhoto(src)
      .then((url) => alive && setFull(url))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [src, thumb, thumbOnly]);

  const shown = (thumbOnly ? thumb : full) ?? thumb;
  if (!shown) return <div className={`${failed ? 'bg-skeleton' : 'skeleton'} ${className}`} aria-hidden={rest.alt === ''} />;
  return <img {...rest} src={shown} className={className} />;
}
