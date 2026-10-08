/**
 * Dark mode. Defaults to the phone's setting ("system"); the user can force
 * light or dark in Settings. We set <html data-theme="..."> and tokens.css
 * swaps every colour.
 */
export type ThemePref = 'system' | 'light' | 'dark';
const KEY = 'ss-theme';

export function getThemePref(): ThemePref {
  try {
    return (localStorage.getItem(KEY) as ThemePref) || 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(pref: ThemePref = getThemePref()) {
  const dark =
    pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0B1220' : '#0F766E');
}

export function setThemePref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {
    /* private mode: still apply for this session */
  }
  applyTheme(pref);
}

/** Re-apply when the phone switches between light and dark. */
export function watchSystemTheme() {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme());
}
