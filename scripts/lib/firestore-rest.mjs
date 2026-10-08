/**
 * Minimal Firestore REST client for the seed scripts' --live mode.
 * It uses the Google login of the Firebase CLI (`firebase login`), so no
 * service-account key file is needed. Only used from your own computer.
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';

/** A timestamp value (converted to Firestore's timestamp type when written). */
export class Ts {
  constructor(ms) {
    this.ms = ms;
  }
}

/** The project id from .firebaserc ("default"). */
export function defaultProject() {
  return JSON.parse(readFileSync('.firebaserc', 'utf8')).projects.default;
}

/** A fresh access token from the Firebase CLI login. */
export function accessToken() {
  // Any CLI call refreshes the stored token if it has expired.
  execSync('firebase projects:list --json', { stdio: 'ignore' });
  const cfg = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, 'utf8'));
  const token = cfg.tokens?.access_token;
  if (!token) throw new Error('Not logged in to the Firebase CLI. Run: firebase login');
  return token;
}

function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (v instanceof Ts) return { timestampValue: new Date(v.ms).toISOString() };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'string') return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode) } };
  return { mapValue: { fields: encodeFields(v) } };
}
const encodeFields = (obj) => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, encode(v)]));

function decode(v) {
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return new Ts(Date.parse(v.timestampValue));
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('arrayValue' in v) return (v.arrayValue.values ?? []).map(decode);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, decode(x)]));
  return undefined;
}

export function restClient(project, token) {
  const base = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'x-goog-user-project': project };
  const docName = (path) => `projects/${project}/databases/(default)/documents/${path}`;

  /** Send writes in batches (max 400 writes and ~8 MB per request). */
  async function commit(writes) {
    let batch = [];
    let bytes = 0;
    const send = async () => {
      if (!batch.length) return;
      const res = await fetch(`${base}:commit`, { method: 'POST', headers, body: JSON.stringify({ writes: batch }) });
      if (!res.ok) throw new Error(`Firestore commit failed (${res.status}): ${(await res.text()).slice(0, 400)}`);
      batch = [];
      bytes = 0;
    };
    for (const w of writes) {
      const size = JSON.stringify(w).length;
      if (batch.length >= 400 || bytes + size > 8_000_000) await send();
      batch.push(w);
      bytes += size;
    }
    await send();
  }

  return {
    /** Collects set() calls and writes them all on flush(). */
    writer() {
      const writes = [];
      return {
        set: (path, data) => writes.push({ update: { name: docName(path), fields: encodeFields(data) } }),
        get count() {
          return writes.length;
        },
        flush: () => commit(writes),
      };
    },

    /** List every document in a collection (or subcollection path), optionally only some fields. */
    async list(collectionPath, fields) {
      const out = [];
      let pageToken = '';
      do {
        const params = new URLSearchParams({ pageSize: '300' });
        if (pageToken) params.set('pageToken', pageToken);
        for (const f of fields ?? []) params.append('mask.fieldPaths', f);
        const res = await fetch(`${base}/${collectionPath}?${params}`, { headers });
        if (!res.ok) throw new Error(`Firestore list failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
        const body = await res.json();
        for (const d of body.documents ?? []) {
          out.push({ path: d.name.split('/documents/')[1], id: d.name.split('/').pop(), data: decode({ mapValue: { fields: d.fields ?? {} } }) });
        }
        pageToken = body.nextPageToken ?? '';
      } while (pageToken);
      return out;
    },

    deleteAll: (paths) => commit(paths.map((p) => ({ delete: docName(p) }))),
  };
}
