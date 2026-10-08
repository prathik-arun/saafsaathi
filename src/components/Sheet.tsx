/**
 * Bottom sheet: slides up, has a drag handle, closes on swipe down,
 * on tapping the dim background, or with the Escape key.
 * On tablets and desktop (md, 768 px+) it shows as a centred dialog instead.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Hide the dim background (used on the map so pins stay visible). */
  noOverlay?: boolean;
}

export function Sheet({ open, onClose, title, children, noOverlay }: Props) {
  const [dragY, setDragY] = useState(0);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onTouchStart = (e: React.TouchEvent) => (startY.current = e.touches[0].clientY);
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current === null) return;
    setDragY(Math.max(0, e.touches[0].clientY - startY.current));
  };
  const onTouchEnd = () => {
    if (dragY > 80) onClose();
    setDragY(0);
    startY.current = null;
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-label={title}>
      {!noOverlay && <div className="anim-fade-in absolute inset-0 bg-overlay" onClick={onClose} />}
      {noOverlay && <div className="absolute inset-0" onClick={onClose} />}
      <div
        className="anim-sheet relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-surface px-4 pb-6 pb-safe md:max-h-[85dvh] md:max-w-md md:rounded-[24px] md:px-6"
        style={{ boxShadow: 'var(--shadow-sheet)', transform: `translateY(${dragY}px)` }}
      >
        <div
          className="sticky top-0 z-10 -mx-4 flex cursor-grab justify-center bg-surface pt-3 pb-2 md:-mx-6 md:cursor-default md:pt-5 md:pb-1"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="h-1.5 w-10 rounded-full bg-border md:hidden" aria-hidden />
        </div>
        {title && <h2 className="t-h2 mb-3">{title}</h2>}
        {children}
      </div>
    </div>,
    document.body,
  );
}
