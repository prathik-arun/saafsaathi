/**
 * Keeps track of who is signed in (Firebase Auth) and their profile
 * document (users/{uid}), live. Any screen can read it with useAuth().
 */
import { onAuthStateChanged, type User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { auth, db } from '../../lib/firebase';
import { DEFAULT_LANGUAGE, setLanguage } from '../../lib/i18n';
import type { UserDoc, WithId } from '../../lib/types';

interface AuthState {
  user: User | null;
  profile: WithId<UserDoc> | null;
  /** True until we know whether someone is signed in and have their profile. */
  loading: boolean;
}

const AuthContext = createContext<AuthState>({ user: null, profile: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    let stopProfile: (() => void) | undefined;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      stopProfile?.();
      stopProfile = undefined;
      clearTimeout(retryTimer);
    };

    // Listen to the profile live. If the listener fails (e.g. the connection
    // drops while signing in), try again instead of treating the profile as
    // missing, which would wrongly send the user to profile setup.
    const listen = (user: User, attempt = 0) => {
      stopProfile = onSnapshot(
        doc(db, 'users', user.uid),
        { includeMetadataChanges: true },
        (snap) => {
          // The phone's cache may not know about the profile yet; only the
          // server can say for sure that it doesn't exist.
          if (!snap.exists() && snap.metadata.fromCache && navigator.onLine) return;
          const profile = snap.exists() ? ({ id: snap.id, ...(snap.data() as UserDoc) } as WithId<UserDoc>) : null;
          if (profile?.language) setLanguage(profile.language);
          setState({ user, profile, loading: false });
        },
        (err) => {
          console.error('Profile listener failed, retrying', err);
          retryTimer = setTimeout(() => listen(user, attempt + 1), Math.min(1000 * 2 ** attempt, 15000));
        },
      );
    };

    const stopAuth = onAuthStateChanged(auth, (user) => {
      stop();
      if (!user) {
        setLanguage(DEFAULT_LANGUAGE); // signed-out screens are always English
        setState({ user: null, profile: null, loading: false });
        return;
      }
      setState((s) => ({ ...s, user, loading: true }));
      listen(user);
    });
    return () => {
      stopAuth();
      stop();
    };
  }, []);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}

/** For screens that are only reachable with a profile (inside the guarded routes). */
export function useProfile(): WithId<UserDoc> {
  const { profile } = useAuth();
  if (!profile) throw new Error('useProfile used outside a signed-in route');
  return profile;
}
