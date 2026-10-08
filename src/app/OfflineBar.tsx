/** Thin amber bar shown while offline. */
import { WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOnline } from '../lib/useOnline';

export function OfflineBar() {
  const { t } = useTranslation();
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="fixed inset-x-0 top-0 z-[95] flex items-center justify-center gap-2 bg-warning px-4 py-1.5 pt-[calc(env(safe-area-inset-top)+6px)] t-caption text-black">
      <WifiOff className="h-3.5 w-3.5" aria-hidden />
      {t('common.offline')}
    </div>
  );
}
