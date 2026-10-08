/**
 * Location helpers: distances, geohash cells for hotspots, GPS fix and
 * the nearest named locality. Users' own locations are never stored;
 * only the pin of a reported spot is saved, when the report is submitted.
 */
import ngeohash from 'ngeohash';
import { CITIES, findCity, type City, type Locality } from './cities';

export interface LatLng {
  lat: number;
  lng: number;
}

/** Distance in metres between two points (haversine formula). */
export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Geohash precision 7 is a cell of roughly 150 m x 150 m: the hotspot grid. */
export function geohash7(p: LatLng): string {
  return ngeohash.encode(p.lat, p.lng, 7);
}

export function geohashCenter(hash: string): LatLng {
  const { latitude, longitude } = ngeohash.decode(hash);
  return { lat: latitude, lng: longitude };
}

/** A spot belongs to the nearest city if it is within this distance of its centre. */
const CITY_RADIUS_M = 40_000;

/** The nearest listed city within 40 km, or null if the point is outside all of them. */
export function nearestCity(p: LatLng): City | null {
  let best: City | null = null;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = distanceMeters(p, c);
    if (d < bestD) {
      best = c;
      bestD = d;
    }
  }
  return bestD <= CITY_RADIUS_M ? best : null;
}

/** The named locality of a city closest to a point (used to label a report). */
export function nearestLocality(p: LatLng, city: City): Locality {
  let best = city.localities[0];
  let bestD = Infinity;
  for (const l of city.localities) {
    const d = distanceMeters(p, l);
    if (d < bestD) {
      best = l;
      bestD = d;
    }
  }
  return best;
}

/** Find a locality by name inside a city. */
export function findLocality(cityId: string, name: string): Locality | undefined {
  return findCity(cityId)?.localities.find((l) => l.name === name);
}

/** Ask the browser for one GPS fix. Rejects if permission is denied or it times out. */
export function getCurrentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('no-geolocation'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}
