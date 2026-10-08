/**
 * "Add to home screen" prompt, shown from the 2nd visit (PRD non-functional
 * requirements). Android Chrome gives us an install event; on iPhone we show
 * the Share -> Add to Home Screen hint instead.
 */
import { Download, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../components/Button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const VISITS_KEY = 'ss-visits';
const DISMISSED_KEY = 'ss-install-dismissed';

function countVisit(): number {
  try {
    if (sessionStorage.getItem('ss-counted')) return Number(localStorage.getItem(VISITS_KEY) ?? '1');
    sessionStorage.setItem('ss-counted', '1');
    const n = Number(localStorage.getItem(VISITS_KEY) ?? '0') + 1;
    localStorage.setItem(VISITS_KEY, String(n));
    return n;
  } catch {
    return 1;
  }
}

export function InstallPrompt() {
  const { t } = useTranslation();
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  useEffect(() => {
    const visits = countVisit();
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (visits < 2 || dismissed || standalone) return;
    if (isIos) setShow(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [isIos, standalone]);

  if (!show) return null;
  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="anim-slide-up fixed inset-x-0 bottom-24 z-40 mx-auto max-w-lg px-4 lg:right-6 lg:bottom-6 lg:left-auto lg:mx-0 lg:w-[440px] lg:px-0">
      <div className="flex items-center gap-3 rounded-[16px] border border-border bg-surface p-3 shadow-card">
        <Download className="h-6 w-6 shrink-0 text-primary" aria-hidden />
        <p className="flex-1 t-small">{isIos ? t('install.ios') : t('install.text')}</p>
        {event && (
          <Button
            block={false}
            className="h-11 min-h-11 px-4"
            onClick={async () => {
              await event.prompt();
              dismiss();
            }}
          >
            {t('install.button')}
          </Button>
        )}
        <IconButton label={t('common.close')} onClick={dismiss} className="border-none">
          <X className="h-5 w-5" />
        </IconButton>
      </div>
    </div>
  );
}
