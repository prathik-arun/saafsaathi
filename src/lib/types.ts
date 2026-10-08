/**
 * Shared TypeScript types that mirror the Firestore data model (PRD Section 5).
 */
import type { Timestamp } from 'firebase/firestore';

export type Category = 'wet' | 'dry' | 'hazardous';
export type WasteLabel = Category | 'notwaste';
export type ReportType = 'dump' | 'bin' | 'drain' | 'littering' | 'other';
export type Severity = 'low' | 'medium' | 'high';
export type ReportStatus = 'open' | 'verified' | 'cleaned';
export type Role = 'member' | 'captain' | 'admin';
export type Lang = 'en' | 'hi' | 'kn';
export type AgeGroup = '13-17' | '18+';

/** Every action that can earn points. Must match POINTS in src/lib/points.ts and firestore.rules. */
export type PointsAction =
  | 'scan'
  | 'report'
  | 'confirm'
  | 'cleaned'
  | 'cleanedReporter'
  | 'quiz'
  | 'streak'
  | 'challenge';

/** Per-day counters used for daily limits (reset when `date` changes). */
export interface DailyCounts {
  date: string; // IST date, e.g. "2026-10-02"
  scan: number;
  report: number;
  quiz: number;
}

/** Lifetime counters used for badges and the profile stats row. */
export interface UserStats {
  scans: number;
  reports: number;
  cleaned: number;
  quizCorrect: number;
  confirms: number;
}

export interface UserDoc {
  nickname: string;
  ageGroup: AgeGroup;
  /** Home city. */
  cityId: string;
  locality: string;
  language: Lang;
  role: Role;
  points: number;
  weeklyPoints: number;
  weekId: string;
  streakDays: number;
  lastActiveDate: string;
  badges: string[];
  stats: UserStats;
  daily: DailyCounts;
  joinedChallenges: string[];
  lastLogId: string;
  cityChangedAt: Timestamp | null;
  createdAt: Timestamp;
}

/** A city on the leaderboard: cities/{cityId}. Created when its first member joins. */
export interface CityDoc {
  name: string;
  colour: string;
  points: number;
  weeklyPoints: number;
  weekId: string;
  /** Last completed week, saved when the first point of a new week arrives. */
  prevWeekId: string;
  prevWeeklyPoints: number;
  memberCount: number;
  lastLogId: string;
  announcement?: string;
}

export interface ScanDoc {
  uid: string;
  cityId: string;
  category: WasteLabel;
  aiCategory: WasteLabel;
  confidence: number;
  corrected: boolean;
  source: 'phone' | 'bin';
  createdAt: Timestamp;
}

export interface ReportDoc {
  uid: string;
  nickname: string;
  /** The city the spot is in (from its pin), which gets the report's points. */
  cityId: string;
  type: ReportType;
  severity: Severity;
  aiType: ReportType | null;
  aiConfidence: number;
  imageUrl: string;
  afterImageUrl: string | null;
  lat: number;
  lng: number;
  geohash: string;
  locality: string;
  note: string;
  status: ReportStatus;
  confirmCount: number;
  flagged: boolean;
  createdAt: Timestamp;
  verifiedAt: Timestamp | null;
  cleanedAt: Timestamp | null;
  cleanedBy: string | null;
  reporterBonusClaimed: boolean;
}

export interface PointsLogDoc {
  uid: string;
  /** The city these points count for (home city, or the spot's city for report actions). */
  cityId: string;
  action: PointsAction;
  points: number;
  refId: string;
  createdAt: Timestamp;
}

export interface ChallengeDoc {
  title: string;
  description: string;
  action: 'scan' | 'report' | 'cleaned' | 'confirm' | 'quiz';
  target: number;
  rewardPoints: number;
  startDate: Timestamp;
  endDate: Timestamp;
}

export interface QuizQuestionDoc {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  language: Lang;
}

export interface CorrectionDoc {
  uid: string;
  imageUrl: string;
  imagePath: string;
  aiCategory: WasteLabel;
  userCategory: WasteLabel;
  createdAt: Timestamp;
}

/** A Firestore document together with its id. */
export type WithId<T> = T & { id: string };
