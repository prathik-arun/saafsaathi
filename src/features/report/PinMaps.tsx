/** Small map preview with the report pin, and the full-screen "Adjust pin" map. */
import { Check, X } from 'lucide-react';
import { useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../components/Button';
import type { LatLng } from '../../lib/geo';
import { pinIcon, TILE_ATTRIBUTION, TILE_URL } from '../map/markers';

export function MiniMap({ at, className = 'h-36' }: { at: LatLng; className?: string }) {
  return (
    <MapContainer
      key={`${at.lat},${at.lng}`}
      center={at}
      zoom={17}
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      keyboard={false}
      attributionControl={false}
      className={`${className} w-full rounded-[12px]`}
    >
      <TileLayer url={TILE_URL} />
      <Marker position={at} icon={pinIcon} interactive={false} />
    </MapContainer>
  );
}

/** Full-screen map: drag the pin or tap the map to move it. */
export function PinPicker({ start, onDone, onCancel }: { start: LatLng; onDone: (p: LatLng) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [pos, setPos] = useState(start);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-bg">
      <div className="flex items-center gap-3 border-b border-border bg-surface p-3 pt-[calc(env(safe-area-inset-top)+12px)]">
        <IconButton label={t('common.cancel')} onClick={onCancel}>
          <X className="h-5 w-5" />
        </IconButton>
        <p className="t-small text-muted">{t('report.adjustHint')}</p>
      </div>
      <MapContainer center={start} zoom={18} className="flex-1" attributionControl>
        <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
        <Marker
          position={pos}
          icon={pinIcon}
          draggable
          eventHandlers={{ dragend: (e) => setPos(e.target.getLatLng()) }}
        />
        <TapToMove onTap={setPos} />
      </MapContainer>
      <div className="border-t border-border bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <Button onClick={() => onDone(pos)} icon={<Check className="h-5 w-5" />}>
          {t('report.usePin')}
        </Button>
      </div>
    </div>
  );
}

function TapToMove({ onTap }: { onTap: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onTap({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}
