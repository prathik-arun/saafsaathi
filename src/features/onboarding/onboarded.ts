/** Whether this phone has already seen the 3 onboarding slides. */
export const ONBOARDED_KEY = 'ss-onboarded';

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(ONBOARDED_KEY) === '1';
  } catch {
    return false;
  }
}
