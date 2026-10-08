/** Sign in: Google, or email + password (with create account and forgot password). */
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/Button';
import { BinsIllustration } from '../../components/Illustrations';
import { Logo } from '../../components/Logo';
import { Camera, ScanLine, Trophy } from 'lucide-react';
import { useToast } from '../../components/Toast';
import { auth } from '../../lib/firebase';

/** Turn a Firebase auth error code into a friendly message key. */
function errorKey(code: string): string {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'signin.errWrong';
  if (code.includes('email-already-in-use')) return 'signin.errExists';
  if (code.includes('weak-password')) return 'signin.errWeak';
  if (code.includes('invalid-email')) return 'signin.errEmail';
  // A network error while the device is online means the server couldn't be reached.
  if (code.includes('network')) return navigator.onLine ? 'signin.errServer' : 'common.offlineShort';
  if (code.includes('popup-closed')) return '';
  return 'common.genericError';
}

export default function SignIn() {
  const { t } = useTranslation();
  const toast = useToast();
  const [mode, setMode] = useState<'choose' | 'signin' | 'create'>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'google' | 'email' | 'reset' | null>(null);
  const [error, setError] = useState('');

  const fail = (e: unknown) => {
    const key = errorKey((e as { code?: string }).code ?? '');
    setError(key ? t(key) : '');
  };

  const google = async () => {
    setBusy('google');
    setError('');
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy('email');
    setError('');
    try {
      if (mode === 'create') await createUserWithEmailAndPassword(auth, email.trim(), password);
      else await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(null);
    }
  };

  const forgot = async () => {
    if (!email.trim()) return setError(t('signin.errEmail'));
    setBusy('reset');
    try {
      await sendPasswordResetEmail(auth, email.trim());
      toast.success(t('signin.resetSent'));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(null);
    }
  };

  return (
    // Desktop: brand panel on the left, sign-in form on the right. Phones: form only.
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-2">
      <BrandPanel />
      <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-center gap-8 bg-bg px-4 py-10 lg:max-w-md">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-[24px] bg-primary p-4">
            <Logo size={56} bubble="var(--on-primary)" leaf="var(--primary)" />
          </div>
          <h1 className="t-display">SaafSaathi</h1>
          <p className="t-body text-muted">{t('signin.pitch')}</p>
        </div>

        {mode === 'choose' ? (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={google} loading={busy === 'google'} icon={<GoogleLogo />}>
              {t('signin.google')}
            </Button>
            <Button onClick={() => setMode('signin')}>{t('signin.email')}</Button>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted">{t('signin.emailLabel')}</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-[52px] rounded-[12px] border border-border bg-surface px-4 t-body outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="t-caption text-muted">{t('signin.passwordLabel')}</span>
              <input
                type="password"
                autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-[52px] rounded-[12px] border border-border bg-surface px-4 t-body outline-none focus:border-primary"
              />
            </label>
            {error && (
              <p role="alert" className="t-small text-error">
                {error}
              </p>
            )}
            <Button type="submit" loading={busy === 'email'} disabled={!email || password.length < 6}>
              {mode === 'create' ? t('signin.createAccount') : t('signin.signIn')}
            </Button>
            <div className="flex items-center justify-between">
              <Button type="button" variant="ghost" className="px-2" onClick={() => setMode(mode === 'create' ? 'signin' : 'create')}>
                {mode === 'create' ? t('signin.haveAccount') : t('signin.newHere')}
              </Button>
              {mode === 'signin' && (
                <Button type="button" variant="ghost" className="px-2" onClick={forgot} loading={busy === 'reset'}>
                  {t('signin.forgot')}
                </Button>
              )}
            </div>
            <Button type="button" variant="ghost" onClick={() => setMode('choose')}>
              {t('common.back')}
            </Button>
          </form>
        )}

        {mode === 'choose' && error && (
          <p role="alert" className="text-center t-small text-error">
            {error}
          </p>
        )}

        <p className="text-center t-caption text-muted">
          {t('signin.agreePrefix')}{' '}
          <Link to="/terms" className="text-primary underline">
            {t('legal.terms')}
          </Link>{' '}
          {t('signin.and')}{' '}
          <Link to="/privacy" className="text-primary underline">
            {t('legal.privacy')}
          </Link>
        </p>
      </div>
    </div>
  );
}

/** Google's multicolour "G" (brand mark colours are part of the logo, not the theme). */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** Left half of the desktop sign-in screen: what the app does, at a glance. */
function BrandPanel() {
  const { t } = useTranslation();
  const features = [
    { Icon: ScanLine, text: t('onboarding.slide1') },
    { Icon: Camera, text: t('onboarding.slide2') },
    { Icon: Trophy, text: t('onboarding.slide3') },
  ];
  return (
    <div
      className="hidden flex-col justify-between p-12 text-white lg:flex"
      style={{ background: 'linear-gradient(160deg, var(--hero-from), var(--hero-to))' }}
    >
      <div className="flex items-center gap-3">
        <Logo size={40} bubble="white" leaf="var(--hero-from)" />
        <span className="font-heading text-2xl font-bold">SaafSaathi</span>
      </div>
      <div className="flex flex-col gap-8">
        <h2 className="font-heading text-4xl leading-tight font-bold">Sort it. Report it. Clean it.</h2>
        <ul className="flex flex-col gap-4">
          {features.map(({ Icon, text }) => (
            <li key={text} className="flex items-center gap-3 t-body">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              {text}
            </li>
          ))}
        </ul>
      </div>
      <div className="w-fit rounded-[24px] bg-surface p-4">
        <BinsIllustration />
      </div>
    </div>
  );
}
