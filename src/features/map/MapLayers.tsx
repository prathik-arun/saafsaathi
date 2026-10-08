/** Leaflet layers used by the map screen: clustered report markers and the hotspot heat layer. */
import L from 'leaflet';
import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { tokenValue } from '../../lib/cities';
import type { ReportDoc, WithId } from '../../lib/types';
import { statusIcon } from './markers';
import type { Hotspot } from './hotspots';

/** Report markers, clustered with a count when they are close together. */
export function ClusteredMarkers({ reports, onSelect }: { reports: WithId<ReportDoc>[]; onSelect: (r: WithId<ReportDoc>) => void }) {
  const map = useMap();
  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      iconCreateFunction: (c) =>
        L.divIcon({ html: String(c.getChildCount()), className: 'marker-cluster-custom', iconSize: [36, 36] }),
    });
    for (const r of reports) {
      const m = L.marker([r.lat, r.lng], { icon: statusIcon(r.status), keyboard: true, title: r.type });
      m.on('click', () => onSelect(r));
      group.addLayer(m);
    }
    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, reports, onSelect]);
  return null;
}

/** Heat layer over hotspot cells. */
export function HeatLayer({ hotspots }: { hotspots: Hotspot[] }) {
  const map = useMap();
  useEffect(() => {
    if (!hotspots.length) return;
    const max = Math.max(...hotspots.map((h) => h.count));
    const layer = L.heatLayer(
      hotspots.map((h) => [h.lat, h.lng, h.count / max] as [number, number, number]),
      {
        radius: 45,
        blur: 20,
        max: 1,
        minOpacity: 0.55,
        gradient: { 0.3: tokenValue('--warning'), 0.7: tokenValue('--accent'), 1: tokenValue('--error') },
      },
    );
    layer.addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, hotspots]);
  return null;
}

/** Fly the map to a point when it changes. */
export function FlyTo({ at, zoom }: { at: { lat: number; lng: number } | null; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    if (at) map.flyTo([at.lat, at.lng], zoom ?? Math.max(map.getZoom(), 16), { duration: 0.6 });
  }, [map, at, zoom]);
  return null;
}
