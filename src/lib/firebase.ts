/**
 * Firebase setup. Reads the web config from .env (VITE_FIREBASE_*).
 * When VITE_USE_EMULATORS=true it talks to the local emulators instead
 * (run `npm run emulators`), so you can develop without a real project.
 */
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const env = import.meta.env;

export const firebaseApp = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
});

export const auth = getAuth(firebaseApp);

// Local cache means lists and the map still show data offline,
// and simple writes are queued until the phone is back online.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

export const storage = getStorage(firebaseApp);

export const usingEmulators = env.VITE_USE_EMULATORS === 'true';

if (usingEmulators) {
  const host = window.location.hostname;
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectStorageEmulator(storage, host, 9199);
}
