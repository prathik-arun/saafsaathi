/** Small on-device preferences (stored in localStorage). */
const NOTIF_KEY = 'ss-notifications';

export function notificationsEnabled(): boolean {
  try {
    return localStorage.getItem(NOTIF_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setNotificationsEnabled(on: boolean) {
  try {
    localStorage.setItem(NOTIF_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}
