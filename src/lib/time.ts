/**
 * Date helpers. Everything uses India Standard Time (UTC+5:30) so that
 * "today" and the Monday 00:00 IST weekly reset are the same for every user.
 */
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** A Date shifted so its UTC fields read as IST wall-clock time. */
function istNow(d: Date = new Date()): Date {
  return new Date(d.getTime() + IST_OFFSET_MS);
}

/** IST calendar date as "YYYY-MM-DD". */
export function istDate(d: Date = new Date()): string {
  return istNow(d).toISOString().slice(0, 10);
}

/** IST date of the day before `date` ("YYYY-MM-DD"). */
export function previousDate(date: string): string {
  return new Date(Date.parse(date) - DAY_MS).toISOString().slice(0, 10);
}

/** Week id = IST date of that week's Monday, e.g. "2026-09-28". */
export function weekId(d: Date = new Date()): string {
  const ist = istNow(d);
  const dayFromMonday = (ist.getUTCDay() + 6) % 7;
  return new Date(ist.getTime() - dayFromMonday * DAY_MS).toISOString().slice(0, 10);
}

/** Week id of the week before the current one. */
export function lastWeekId(d: Date = new Date()): string {
  return weekId(new Date(d.getTime() - 7 * DAY_MS));
}

/** Days left until the next Monday 00:00 IST (at least 1). */
export function daysLeftInWeek(d: Date = new Date()): number {
  const dayFromMonday = (istNow(d).getUTCDay() + 6) % 7;
  return 7 - dayFromMonday;
}

export function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY_MS);
}

/** Hour of the day in IST, for the "Good morning" greeting. */
export function istHour(d: Date = new Date()): number {
  return istNow(d).getUTCHours();
}
