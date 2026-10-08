/**
 * Developer-only warning: when the app is set to use the local Firebase
 * emulators but they aren't running, sign-in and data loading fail with
 * confusing errors. This checks every few seconds and shows how to fix it.
 * It never appears in a production build.
 */
import { ServerCrash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usingEmulators } from '../lib/firebase';

async function emulatorsUp(): Promise<boolean> {
  const host = window.location.hostname;
  try {
    // no-cors: we only care whether something answers on the Auth emulator port.
    await fetch(`http://${host}:9099/`, { mode: 'no-cors', cache: 'no-store' });
    return true;
  } catch {
    return false;
  }
}

export function EmulatorCheck() {
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!import.meta.env.DEV || !usingEmulators) return;
    let alive = true;
    const check = async () => {
      const up = await emulatorsUp();
      if (alive) setDown(!up);
    };
    check();
    const id = setInterval(check, 5000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  if (!down) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[96] flex items-start gap-3 bg-error px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] text-white">
      <ServerCrash className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <p className="t-small">
        <strong>Firebase emulators aren't running</strong>, so sign-in and data won't work. In the project folder run{' '}
        <code className="rounded bg-black/25 px-1">npm run emulators:persist</code> in a second terminal, or stop this dev server and run{' '}
        <code className="rounded bg-black/25 px-1">npm run local</code> to start both together.
      </p>
    </div>
  );
}
