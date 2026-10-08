/**
 * Live list of cities on the leaderboard, shared by the whole app through one
 * Firestore listener. A city document appears once it has a member or points.
 */
import { collection, onSnapshot } from 'firebase/firestore';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { cityColourVar } from '../../lib/cities';
import { db } from '../../lib/firebase';
import { currentWeekly } from '../../lib/points';
import type { CityDoc, WithId } from '../../lib/types';

export type CityRecord = WithId<CityDoc>;

interface CitiesState {
  cities: CityRecord[];
  byId: Record<string, CityRecord>;
  /** Cities sorted by this week's points, highest first. */
  weeklyRanking: CityRecord[];
  /** A city's colour, even before its document exists. */
  colourOf: (cityId: string) => string;
  loading: boolean;
  error: boolean;
}

const CitiesContext = createContext<CitiesState>({
  cities: [],
  byId: {},
  weeklyRanking: [],
  colourOf: (id) => `var(${cityColourVar(id)})`,
  loading: true,
  error: false,
});

export function CitiesProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<CityRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(
    () =>
      onSnapshot(
        collection(db, 'cities'),
        (snap) => {
          setCities(snap.docs.map((d) => ({ id: d.id, ...(d.data() as CityDoc) })));
          setLoading(false);
          setError(false);
        },
        () => {
          setLoading(false);
          setError(true);
        },
      ),
    [],
  );

  const value = useMemo<CitiesState>(() => {
    const byId = Object.fromEntries(cities.map((c) => [c.id, c]));
    const weeklyRanking = [...cities].sort((a, b) => currentWeekly(b) - currentWeekly(a));
    const colourOf = (id: string) => byId[id]?.colour ?? `var(${cityColourVar(id)})`;
    return { cities, byId, weeklyRanking, colourOf, loading, error };
  }, [cities, loading, error]);

  return <CitiesContext.Provider value={value}>{children}</CitiesContext.Provider>;
}

export function useCities(): CitiesState {
  return useContext(CitiesContext);
}
