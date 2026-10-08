/**
 * Offline outbox. Scans and reports made without internet are saved in the
 * phone's IndexedDB and sent when the connection comes back (PRD "Offline").
 *
 * Each queued job has a `kind`; handlers for each kind are registered by the
 * feature that owns it (scan, report) with registerOutboxHandler().
 */
import { createStore, del, entries, set } from 'idb-keyval';

export interface OutboxJob {
  id: string;
  kind: 'scan' | 'report';
  createdAt: number;
  payload: unknown;
}

/** A handler returns the points earned (for the "synced" toast). */
type Handler = (job: OutboxJob) => Promise<number>;

const store = createStore('saafsaathi-outbox', 'jobs');
const handlers: Partial<Record<OutboxJob['kind'], Handler>> = {};
const listeners = new Set<(pending: number, syncedPoints: number) => void>();
let flushing = false;

export function registerOutboxHandler(kind: OutboxJob['kind'], handler: Handler) {
  handlers[kind] = handler;
}

/** Listen for queue changes: (number still pending, points just synced). */
export function onOutboxChange(cb: (pending: number, syncedPoints: number) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

async function notify(syncedPoints = 0) {
  const pending = (await entries(store)).length;
  listeners.forEach((cb) => cb(pending, syncedPoints));
}

export async function enqueue(kind: OutboxJob['kind'], payload: unknown): Promise<void> {
  const job: OutboxJob = { id: crypto.randomUUID(), kind, createdAt: Date.now(), payload };
  await set(job.id, job, store);
  await notify();
}

export async function pendingCount(): Promise<number> {
  return (await entries(store)).length;
}

/** True for errors that mean "try again later" rather than "this job is bad". */
export function isNetworkError(e: unknown): boolean {
  const code = (e as { code?: string })?.code ?? '';
  return !navigator.onLine || ['unavailable', 'deadline-exceeded', 'storage/retry-limit-exceeded', 'storage/unknown'].some((c) => code.includes(c));
}

/** Try to send every queued job, oldest first. */
export async function flushOutbox(): Promise<void> {
  if (flushing || !navigator.onLine) return;
  flushing = true;
  let synced = 0;
  try {
    const jobs = (await entries<string, OutboxJob>(store)).map(([, j]) => j).sort((a, b) => a.createdAt - b.createdAt);
    for (const job of jobs) {
      const handler = handlers[job.kind];
      if (!handler) continue;
      try {
        synced += await handler(job);
        await del(job.id, store);
      } catch (e) {
        if (isNetworkError(e)) break; // still offline: keep everything for later
        console.error('Dropping outbox job that cannot succeed', job.kind, e);
        await del(job.id, store);
      }
    }
  } finally {
    flushing = false;
    await notify(synced);
  }
}

window.addEventListener('online', () => void flushOutbox());
