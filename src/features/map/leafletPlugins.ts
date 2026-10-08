/**
 * leaflet.markercluster and leaflet.heat are older plugins that attach
 * themselves to a global `L`, so we expose Leaflet globally and then load them.
 */
import L from 'leaflet';

let loaded: Promise<void> | null = null;

export function loadLeafletPlugins(): Promise<void> {
  if (!loaded) {
    (window as unknown as { L: typeof L }).L = L;
    loaded = Promise.all([import('leaflet.markercluster'), import('leaflet.heat')]).then(() => undefined);
  }
  return loaded;
}
