/**
 * Cleanliness Map (PRD 4.9): live report markers by status, clustering,
 * filter chips, hotspot heat layer, my location, list view, marker sheet,
 * and a city stats strip.
 */
import { Flame, List, LocateFixed, Map as MapIcon, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, TileLayer, ZoomControl } from 'react-leaflet';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button, IconButton } from '../../components/Button';
import { Card } from '../../components/Card';
import { Chip } from '../../components/Chip';
import { EmptyState } from '../../components/EmptyState';
import { ErrorCard } from '../../components/ErrorCard';
import { Sheet } from '../../components/Sheet';
import { SkeletonCards } from '../../components/Skeleton';
import { StatusTag, TypeTag } from '../../components/Tags';
import { useToast } from '../../components/Toast';
import { toDate, timeAgo } from '../../lib/format';
import { distanceMeters, findLocality, getCurrentPosition, type LatLng } from '../../lib/geo';
import { DEFAULT_CITY, findCity } from '../../lib/cities';
import { currentLanguage } from '../../lib/i18n';
import { useIsDesktop } from '../../lib/useMediaQuery';
import type { ReportDoc, WithId } from '../../lib/types';
import { useProfile } from '../auth/AuthProvider';
import { findHotspots } from './hotspots';
import { loadLeafletPlugins } from './leafletPlugins';
import { ClusteredMarkers, FlyTo, HeatLayer } from './MapLayers';
import { meIcon, TILE_ATTRIBUTION, TILE_URL } from './markers';
import { useRecentReports } from './useReports';

type Filter = 'all' | 'open' | 'cleaned' | 'dump' | 'drain' | 'bin' | 'mine';
const FILTERS: Filter[] = ['all', 'open', 'cleaned', 'dump', 'drain', 'bin', 'mine'];

function matches(r: ReportDoc, f: Filter, uid: string): boolean {
  switch (f) {
    case 'all':
      return true;
    case 'open':
      return r.status !== 'cleaned';
    case 'cleaned':
      return r.status === 'cleaned';
    case 'mine':
      return r.uid === uid;
    default:
      return r.type === f;
  }
}

export default function MapScreen() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const profile = useProfile();
  const [params] = useSearchParams();
  const { reports, state, retry } = useRecentReports();
  const [pluginsReady, setPluginsReady] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [hot, setHot] = useState(false);
  const [listView, setListView] = useState(false);
  const [selected, setSelected] = useState<WithId<ReportDoc> | null>(null);
  const [me, setMe] = useState<LatLng | null>(null);
  const [flyTo, setFlyTo] = useState<LatLng | null>(null);
  const isDesktop = useIsDesktop();

  const homeCity = findCity(profile.cityId) ?? DEFAULT_CITY;
  const home = findLocality(homeCity.id, profile.locality) ?? { name: homeCity.name.en, lat: homeCity.lat, lng: homeCity.lng };

  useEffect(() => {
    loadLeafletPlugins().then(() => setPluginsReady(true));
  }, []);

  // Opened from "View on map": centre on that report and open its sheet.
  const focusId = params.get('focus');
  useEffect(() => {
    const r = focusId ? reports.find((x) => x.id === focusId) : undefined;
    if (r) {
      setFlyTo({ lat: r.lat, lng: r.lng });
      setSelected(r);
    }
  }, [focusId, reports]);

  const visible = useMemo(() => reports.filter((r) => matches(r, filter, profile.id)), [reports, filter, profile.id]);
  const hotspots = useMemo(() => (hot ? findHotspots(reports) : []), [hot, reports]);
  const onSelect = useCallback((r: WithId<ReportDoc>) => setSelected(r), []);

  const locateMe = async () => {
    try {
      const at = await getCurrentPosition();
      setMe(at);
      setFlyTo(at);
    } catch {
      toast.error(t('map.locationFailed'));
    }
  };

  // City stats: open vs cleaned this month in the user's home city.
  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const mine = reports.filter((r) => r.cityId === homeCity.id);
    return {
      open: mine.filter((r) => r.status !== 'cleaned').length,
      cleaned: mine.filter((r) => r.status === 'cleaned' && (toDate(r.cleanedAt)?.getTime() ?? Date.now()) >= monthStart.getTime()).length,
    };
  }, [reports, homeCity.id]);

  const origin = me ?? home;
  const sortedList = useMemo(() => [...visible].sort((a, b) => distanceMeters(a, origin) - distanceMeters(b, origin)), [visible, origin]);

  const listPanel = (
    <div className="h-full overflow-y-auto bg-bg px-4 pt-16 pb-24 lg:px-4 lg:pt-4 lg:pb-4">
      {state === 'loading' && <SkeletonCards count={5} />}
      {state === 'error' && <ErrorCard onRetry={retry} />}
      {state === 'ok' && sortedList.length === 0 && (
        <EmptyState text={t('map.empty')} actionLabel={t('nav.report')} onAction={() => navigate('/report')} />
      )}
      <ul className="flex flex-col gap-3">
        {sortedList.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => (isDesktop ? (setSelected(r), setFlyTo({ lat: r.lat, lng: r.lng })) : navigate(`/r/${r.id}`))}
              className="w-full text-left"
            >
              <Card
                className={`flex gap-3 p-3 transition-colors hover:border-primary ${selected?.id === r.id ? 'border-primary bg-primary-soft' : ''}`}
              >
                {!r.flagged ? (
                  <img src={r.imageUrl} alt="" className="h-16 w-16 shrink-0 rounded-[12px] object-cover" loading="lazy" />
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-[12px] bg-skeleton" />
                )}
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap gap-1.5">
                    <TypeTag type={r.type} />
                    <StatusTag status={r.status} />
                  </div>
                  <p className="truncate t-small text-muted">
                    {formatDistance(t, distanceMeters(r, origin))} · {r.locality} · {timeAgo(r.createdAt)}
                  </p>
                </div>
              </Card>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );

  const selectedDetails = selected && (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3">
        {!selected.flagged ? (
          <img src={selected.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-[12px] object-cover" />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-[12px] bg-skeleton" />
        )}
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap gap-1.5">
            <TypeTag type={selected.type} />
            <StatusTag status={selected.status} />
          </div>
          <p className="t-small text-muted">
            {selected.locality} · {timeAgo(selected.createdAt)}
          </p>
        </div>
      </div>
      <Button onClick={() => navigate(`/r/${selected.id}`)}>{t('map.viewDetails')}</Button>
    </div>
  );

  const showList = isDesktop || listView;
  const showMap = isDesktop || !listView;

  return (
    // Phones: map OR list (toggle). Desktop: list on the left, map on the right.
    <div className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+64px)] bottom-[calc(env(safe-area-inset-bottom)+64px)] mx-auto flex max-w-lg md:max-w-2xl lg:bottom-0 lg:left-64 lg:max-w-none">
      {showList && <aside className="h-full w-full lg:w-96 lg:shrink-0 lg:border-r lg:border-border">{listPanel}</aside>}

      <div className={`relative h-full flex-1 ${showMap ? '' : 'hidden'}`}>
        {/* Filter chips + hotspot toggle */}
        <div className="absolute inset-x-0 top-0 z-[500] flex gap-2 overflow-x-auto px-4 py-3 no-scrollbar">
          {FILTERS.map((f) => (
            <Chip key={f} selected={filter === f} onClick={() => setFilter(f)} className="shadow-card">
              {t(`map.filter.${f}`)}
            </Chip>
          ))}
          <Chip selected={hot} onClick={() => setHot(!hot)} icon={<Flame className="h-4 w-4" aria-hidden />} className="shadow-card">
            {t('map.hotspots')}
          </Chip>
        </div>

        {showMap && (
          <MapContainer center={home} zoom={15} className="ss-map h-full w-full" zoomControl={false}>
            <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
            {isDesktop && <ZoomControl position="bottomright" />}
            {pluginsReady && <ClusteredMarkers reports={visible} onSelect={onSelect} />}
            {pluginsReady && hot && <HeatLayer hotspots={hotspots} />}
            {me && <Marker position={me} icon={meIcon} interactive={false} />}
            <FlyTo at={flyTo} />
          </MapContainer>
        )}

        {state === 'error' && (
          <div className="absolute inset-x-4 top-16 z-[500]">
            <ErrorCard onRetry={retry} />
          </div>
        )}
        {state === 'ok' && hot && hotspots.length === 0 && (
          <p className="absolute inset-x-4 top-16 z-[500] rounded-[12px] bg-surface p-2 text-center t-caption text-muted shadow-card">
            {t('map.noHotspots')}
          </p>
        )}

        {/* Desktop: the selected report floats over the map instead of a sheet. */}
        {isDesktop && selected && (
          <div className="absolute top-16 right-4 z-[600] w-80">
            <Card>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label={t('common.close')}
                className="absolute top-2 right-2 rounded-full p-1 text-muted hover:bg-bg"
              >
                <X className="h-4 w-4" />
              </button>
              {selectedDetails}
            </Card>
          </div>
        )}
      </div>

      {/* Bottom controls + city stats */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] flex flex-col gap-2 p-4 pb-3 lg:left-96">
        <div className="pointer-events-auto flex justify-between">
          {!isDesktop ? (
            <IconButton
              label={listView ? t('map.mapView') : t('map.listView')}
              onClick={() => setListView(!listView)}
              className="shadow-card"
            >
              {listView ? <MapIcon className="h-5 w-5" /> : <List className="h-5 w-5" />}
            </IconButton>
          ) : (
            <span />
          )}
          {showMap && (
            <IconButton label={t('map.myLocation')} onClick={locateMe} className="shadow-card">
              <LocateFixed className="h-5 w-5" />
            </IconButton>
          )}
        </div>
        <div className="pointer-events-auto rounded-[12px] border border-border bg-surface px-4 py-2 text-center t-small shadow-card lg:mx-auto lg:w-max lg:min-w-96">
          {state === 'loading' ? (
            <span className="skeleton inline-block h-4 w-48 rounded" />
          ) : (
            t('map.localityStats', { locality: homeCity.name[currentLanguage()], open: stats.open, cleaned: stats.cleaned })
          )}
        </div>
      </div>

      {!isDesktop && (
        <Sheet open={!!selected} onClose={() => setSelected(null)} noOverlay>
          {selectedDetails}
        </Sheet>
      )}
    </div>
  );
}

/** "350 m away" or "12.4 km away". */
function formatDistance(t: (k: string, o?: Record<string, unknown>) => string, meters: number): string {
  return meters < 1000
    ? t('map.distance', { m: Math.round(meters) })
    : t('map.distanceKm', { km: (meters / 1000).toFixed(meters < 10000 ? 1 : 0) });
}
