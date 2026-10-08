/**
 * Translations (English, Hindi, Kannada) with i18next.
 * All UI text lives in src/i18n/<lang>.ts; components call t('some.key').
 *
 * The app always starts in English. A signed-in user's choice is saved in
 * their profile (users/{uid}.language) and applied after they sign in
 * (see AuthProvider); signing out goes back to English.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../i18n/en';
import hi from '../i18n/hi';
import kn from '../i18n/kn';
import type { Lang } from './types';

export const DEFAULT_LANGUAGE: Lang = 'en';

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, kn: { translation: kn } },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
});
document.documentElement.lang = DEFAULT_LANGUAGE;

// Older versions saved the language on the device; clear it so it can't override English.
try {
  localStorage.removeItem('ss-lang');
} catch {
  /* ignore */
}

export function setLanguage(lang: Lang) {
  if (i18n.language !== lang) i18n.changeLanguage(lang);
  document.documentElement.lang = lang;
}

export function currentLanguage(): Lang {
  return (i18n.language as Lang) ?? DEFAULT_LANGUAGE;
}

export default i18n;
