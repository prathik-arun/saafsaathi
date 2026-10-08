/** True while a CSS media query matches, e.g. useIsDesktop() for screens 1024 px and wider. */
import { useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
  );
}

/** Matches Tailwind's `lg` breakpoint, where the sidebar layout starts. */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1024px)');
}
