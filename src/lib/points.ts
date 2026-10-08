/**
 * Points engine and the city scoring rubric.
 *
 * Every point a user earns is written as ONE document in `pointsLog`, in the
 * same Firestore transaction that adds the points to the user and to a city.
 * Which city?
 *   - your HOME city for things you do anywhere: scans, quiz, streaks, challenges
 *   - the SPOT's city for things about a place: reporting, confirming, cleaning
 * So a city climbs the leaderboard when garbage there is reported and cleaned.
 *
 * firestore.rules checks that:
 *   - the log entry's points match the rubric below,
 *   - the user's and city's totals go up by exactly that entry's points,
 *   - each log id is used only once (so nothing can be earned twice).
 * Log ids are built as  <uid>_<action>_<refId>, e.g. a scan's refId is the
 * photo's perceptual hash, so the same photo can't earn points twice.
 */
import { doc, runTransaction, serverTimestamp, type Transaction } from 'firebase/firestore';
import { db } from './firebase';
import { earnedBadges } from './badges';
import { istDate, previousDate, weekId } from './time';
import { cityColourVar, findCity, tokenValue } from './cities';
import type { CityDoc, DailyCounts, PointsAction, ReportDoc, Severity, UserDoc, UserStats } from './types';

/** Base points per action. Keep in sync with pointsFor() in firestore.rules. */
export const POINTS: Record<PointsAction, number> = {
  scan: 5,
  report: 20,
  confirm: 5,
  cleaned: 30, // plus the cleanup bonuses below
  cleanedReporter: 10,
  quiz: 2,
  streak: 10,
  challenge: 50, // default; a challenge can set its own reward
};

/**
 * Cleanup bonuses: cleaning is the goal, so it earns the most.
 * Bigger messes and fast cleanups earn extra. Keep in sync with cleanupOk() in firestore.rules.
 */
export const SEVERITY_BONUS: Record<Severity, number> = { low: 0, medium: 10, high: 20 };
export const FAST_CLEANUP_BONUS = 15;
/** "Fast" = cleaned within this many hours of being reported. */
export const FAST_CLEANUP_HOURS = 72;

/** Points for cleaning a spot, with the bonuses that apply right now. */
export function cleanupPoints(report: Pick<ReportDoc, 'severity' | 'createdAt'>, now = Date.now()) {
  const severity = SEVERITY_BONUS[report.severity] ?? 0;
  const created = report.createdAt?.toMillis?.() ?? now;
  // One hour of slack so the phone's clock never claims a bonus the server would refuse.
  const fast = now - created < (FAST_CLEANUP_HOURS - 1) * 3600 * 1000 ? FAST_CLEANUP_BONUS : 0;
  return { base: POINTS.cleaned, severity, fast, total: POINTS.cleaned + severity + fast };
}

/** Actions whose points go to the city where the spot is, not the user's home city. */
export const SPOT_ACTIONS: PointsAction[] = ['report', 'confirm', 'cleaned', 'cleanedReporter'];

/** Daily limits: only the first N of these actions per day earn points. */
export const DAILY_LIMITS: Partial<Record<PointsAction, number>> = {
  scan: 20,
  report: 5,
  quiz: 5,
};

/** Which lifetime counter (for badges) each action bumps. */
const STAT_FOR_ACTION: Partial<Record<PointsAction, keyof UserStats>> = {
  scan: 'scans',
  report: 'reports',
  cleaned: 'cleaned',
  quiz: 'quizCorrect',
  confirm: 'confirms',
};

/** Actions that count as "activity" for the daily streak. */
const STREAK_ACTIONS: PointsAction[] = ['scan', 'report'];

export interface AwardResult {
  points: number;
  /** Why no points were given, if points is 0. */
  reason?: 'duplicate' | 'daily-limit';
  newBadges: string[];
  /** True when this action extended the streak to a new day (bonus is awarded separately). */
  streakContinued: boolean;
  streakDays: number;
}

export interface AwardOptions {
  action: PointsAction;
  /** What the points are for: report id, photo hash, quiz question, ... */
  refId: string;
  /** Override the default points (used by challenges). */
  points?: number;
  /**
   * Extra work done in the same transaction (e.g. creating the report).
   * It may read first; it returns its writes, and optionally which city gets
   * the points (the spot's city) and how many (cleanup bonuses).
   */
  extra?: (tx: Transaction, user: UserDoc) => Promise<ExtraResult>;
}

export interface ExtraResult {
  write: () => void;
  cityId?: string;
  points?: number;
}

export function pointsLogId(uid: string, action: PointsAction, refId: string): string {
  return `${uid}_${action}_${refId.replace(/[^A-Za-z0-9-]/g, '-')}`;
}

/**
 * Award points for one action, atomically updating pointsLog, the user and
 * a city. Returns how many points were actually given.
 */
export async function awardPoints(uid: string, opts: AwardOptions): Promise<AwardResult> {
  const { action, refId } = opts;
  const userRef = doc(db, 'users', uid);
  const logId = pointsLogId(uid, action, refId);
  const logRef = doc(db, 'pointsLog', logId);

  const result = await runTransaction(db, async (tx) => {
    // 1. Reads (Firestore requires all reads before any writes).
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('no-profile');
    const user = userSnap.data() as UserDoc;
    const logSnap = await tx.get(logRef);
    const extra = opts.extra ? await opts.extra(tx, user) : undefined;
    const cityId = extra?.cityId ?? user.cityId;
    const cityRef = doc(db, 'cities', cityId);
    const citySnap = await tx.get(cityRef);

    // 2. Decide the points.
    const today = istDate();
    const week = weekId();
    const daily: DailyCounts =
      user.daily?.date === today ? { ...user.daily } : { date: today, scan: 0, report: 0, quiz: 0 };
    const limit = DAILY_LIMITS[action];
    const limitKey = action as keyof Omit<DailyCounts, 'date'>;

    let points = extra?.points ?? opts.points ?? POINTS[action];
    let reason: AwardResult['reason'];
    if (logSnap.exists()) {
      points = 0;
      reason = 'duplicate';
    } else if (limit !== undefined && daily[limitKey] >= limit) {
      points = 0;
      reason = 'daily-limit';
    }

    // 3. Streak: any scan or report on consecutive IST days.
    let streakDays = user.streakDays ?? 0;
    let lastActiveDate = user.lastActiveDate ?? '';
    let streakContinued = false;
    if (STREAK_ACTIONS.includes(action) && lastActiveDate !== today) {
      streakContinued = lastActiveDate === previousDate(today);
      streakDays = streakContinued ? streakDays + 1 : 1;
      lastActiveDate = today;
    }

    // 4. Counters and badges.
    const stats: UserStats = { scans: 0, reports: 0, cleaned: 0, quizCorrect: 0, confirms: 0, ...(user.stats as Partial<UserStats>) };
    const statKey = STAT_FOR_ACTION[action];
    if (statKey && reason !== 'duplicate') stats[statKey] += 1;
    if (limit !== undefined && points > 0) daily[limitKey] += 1;
    const badges = earnedBadges({ stats, streakDays, badges: user.badges });
    const newBadges = badges.filter((b) => !(user.badges ?? []).includes(b));

    // 5. Writes.
    extra?.write();
    const userUpdate: Record<string, unknown> = { stats, daily, streakDays, lastActiveDate, badges };
    if (points > 0) {
      tx.set(logRef, {
        uid,
        cityId,
        action,
        points,
        refId,
        createdAt: serverTimestamp(),
      });
      userUpdate.points = user.points + points;
      userUpdate.weeklyPoints = user.weekId === week ? user.weeklyPoints + points : points;
      userUpdate.weekId = week;
      userUpdate.lastLogId = logId;

      // City totals. The first point of a new week archives last week's total
      // (used for the "last week's winner" banner) and starts the week at 0.
      if (!citySnap.exists()) {
        // First points ever for this city (e.g. a report in a city with no members yet).
        tx.set(cityRef, {
          name: findCity(cityId)?.name.en ?? cityId,
          colour: tokenValue(cityColourVar(cityId)),
          points,
          weeklyPoints: points,
          weekId: week,
          prevWeekId: '',
          prevWeeklyPoints: 0,
          memberCount: 0,
          lastLogId: logId,
        });
      } else {
        const city = citySnap.data() as CityDoc;
        const cityUpdate: Record<string, unknown> = { points: city.points + points, lastLogId: logId };
        if (city.weekId === week) {
          cityUpdate.weeklyPoints = city.weeklyPoints + points;
        } else {
          cityUpdate.prevWeekId = city.weekId;
          cityUpdate.prevWeeklyPoints = city.weeklyPoints;
          cityUpdate.weekId = week;
          cityUpdate.weeklyPoints = points;
        }
        tx.update(cityRef, cityUpdate);
      }
    }
    tx.update(userRef, userUpdate);

    return { points, reason, newBadges, streakContinued, streakDays };
  });

  return result;
}

/**
 * The +10 daily streak bonus. Called after a scan or report that continued
 * the streak; refId is today's date so it can only be earned once a day.
 */
export async function awardStreakBonus(uid: string): Promise<number> {
  const r = await awardPoints(uid, { action: 'streak', refId: istDate() });
  return r.points;
}

/** Weekly points only count if they belong to the current week. */
export function currentWeekly(d: { weekId?: string; weeklyPoints?: number }): number {
  return d.weekId === weekId() ? (d.weeklyPoints ?? 0) : 0;
}
