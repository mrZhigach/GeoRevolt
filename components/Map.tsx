'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapControls from './MapControls';
import MarketPopup from './MarketPopup';
import MarketSidebar from './MarketSidebar';
import CreateMarketModal from './CreateMarketModal';
import EventFeed from './EventFeed';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Plus } from 'lucide-react';

const WEBGL_RESTORE_MAX_ATTEMPTS = 5;
const WEBGL_RESTORE_RETRY_MS = 2000;

interface MarketProperties {
  id: number;
  contract_address: string;
  name: string;
  description: string;
  category: string;
  status: string;
  liquidity: number;
  radius: number;
  address: string | null;
  lng?: number;
  lat?: number;
  price_yes?: number;
  price_no?: number;
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const restoreAttempts = useRef(0);
  const categoryFilterRef = useRef<string>('all');
  const [selectedMarket, setSelectedMarket] = useState<MarketProperties | null>(null);
  const [clickedLngLat, setClickedLngLat] = useState<{ lng: number; lat: number } | null>(null);
  const [createCoords, setCreateCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [markets, setMarkets] = useState<MarketProperties[]>([]);
  const [webglReady, setWebglReady] = useState(true);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // ---- Fly-to handler (from geocoder) ----
  const handleFlyTo = useCallback((lng: number, lat: number) => {
    if (map.current) {
      map.current.flyTo({ center: [lng, lat], zoom: 12, duration: 1500 });
    }
  }, []);

  // ---- Category filter handler ----
  const handleCategoryFilter = useCallback((category: string) => {
    categoryFilterRef.current = category;
    if (!map.current) return;

    const layers = ['markets-radius', 'markets-layer'];
    for (const layerId of layers) {
      const layer = map.current.getLayer(layerId);
      if (!layer) continue;

      if (category === 'all') {
        map.current.setFilter(layerId, ['!', ['has', 'point_count']]);
      } else {
        map.current.setFilter(layerId, [
          'all',
          ['!', ['has', 'point_count']],
          ['==', ['get', 'category'], category],
        ]);
      }
    }
  }, []);

  // ---- Map initialization ----
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: '/data/style-demo.json',
      center: [40, 55],
      zoom: 3,
    } as maplibregl.MapOptions);

    // WebGL context loss/restore handling
    // NOTE: we do NOT call e.preventDefault() — let the browser auto-restore
    // the context. MapLibre GL JS 4.x handles internal re-initialization
    // of painting resources after restore.
    const canvas = m.getCanvas();
    const handleContextLost = (e: Event) => {
      restoreAttempts.current += 1;
      console.warn(
        `[Map] WebGL context lost (attempt ${restoreAttempts.current}/${WEBGL_RESTORE_MAX_ATTEMPTS})`
      );
      setWebglReady(false);

      if (restoreAttempts.current >= WEBGL_RESTORE_MAX_ATTEMPTS) {
        console.error('[Map] WebGL context repeatedly lost — showing reload overlay');
      }
    };
    const handleContextRestored = () => {
      console.log(
        '[Map] WebGL context restored after', restoreAttempts.current, 'loss(es)'
      );
      setWebglReady(true);
      restoreAttempts.current = 0;

      // Resize triggers MapLibre's internal re-render
      m.resize();

      // Re-fetch market data and re-populate the GeoJSON source
      // because all WebGL resources (buffers, textures) were lost
      fetchMarkets().then((features) => {
        const source = m.getSource('markets') as GeoJSONSource | undefined;
        if (source) {
          source.setData({
            type: 'FeatureCollection',
            features,
          });
        }
      });
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    if (m.getCanvas().getContext('webgl')?.isContextLost() ?? false) {
      console.warn('[Map] Context already lost on init — will retry');
      setWebglReady(false);
    }

    m.addControl(new maplibregl.NavigationControl(), 'top-right');

    m.on('load', () => {
      fetchMarkets().then((features) => {
        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features,
        };

        m.addSource('markets', {
          type: 'geojson',
          data: geojson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 50,
        });

        m.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'markets',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#6366f1',
            'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
            'circle-opacity': 0.7,
          },
        });

        m.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'markets',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': ['get', 'point_count_abbreviated'],
            'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
            'text-size': 12,
          },
          paint: { 'text-color': '#ffffff' },
        });

        // Radius circle overlay (behind markers)
        m.addLayer({
          id: 'markets-radius',
          type: 'circle',
          source: 'markets',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate', ['exponential', 2], ['zoom'],
              8, ['/', ['coalesce', ['get', 'radius'], 100], 610],
              10, ['/', ['coalesce', ['get', 'radius'], 100], 152],
              12, ['/', ['coalesce', ['get', 'radius'], 100], 38],
              14, ['/', ['coalesce', ['get', 'radius'], 100], 9.5],
              16, ['/', ['coalesce', ['get', 'radius'], 100], 2.4],
            ],
            'circle-color': ['match', ['get', 'category'],
              'politics', '#ef4444',
              'sports', '#3b82f6',
              'economics', '#f59e0b',
              'technology', '#8b5cf6',
              '#6366f1'
            ],
            'circle-opacity': 0.12,
            'circle-stroke-width': 1.5,
            'circle-stroke-color': ['match', ['get', 'category'],
              'politics', '#ef4444',
              'sports', '#3b82f6',
              'economics', '#f59e0b',
              'technology', '#8b5cf6',
              '#6366f1'
            ],
            'circle-stroke-opacity': 0.5,
          },
        });

        m.addLayer({
          id: 'markets-layer',
          type: 'circle',
          source: 'markets',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-radius': [
              'interpolate', ['linear'], ['number', ['get', 'liquidity'], 0],
              0, 6,
              200, 10,
              1000, 16,
              5000, 22,
              10000, 30,
            ],
            'circle-color': [
              'interpolate', ['linear'], ['number', ['get', 'liquidity'], 0],
              0, '#94a3b8',
              200, '#22c55e',
              1000, '#16a34a',
              5000, '#15803d',
            ],
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ffffff',
            'circle-opacity': 0.9,
          },
        });

        // Helper: enrich feature properties with lat/lng from geometry
        const enrichMarket = (feature: GeoJSON.Feature | undefined) => {
          if (!feature) return null;
          const props = feature.properties as Record<string, any> || {};
          const coords = (feature.geometry as GeoJSON.Point)?.coordinates;
          return {
            ...props,
            lng: coords?.[0] ?? 0,
            lat: coords?.[1] ?? 0,
          } as MarketProperties;
        };

        // Click on circle → open popup
        m.on('click', 'markets-radius', (e) => {
          const enriched = enrichMarket(e.features?.[0]);
          if (enriched?.contract_address) {
            setClickedLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            setCreateCoords(null);
            setSelectedMarket(enriched);
          }
        });

        m.on('click', 'markets-layer', (e) => {
          const enriched = enrichMarket(e.features?.[0]);
          if (enriched?.contract_address) {
            setClickedLngLat({ lng: e.lngLat.lng, lat: e.lngLat.lat });
            setCreateCoords(null);
            setSelectedMarket(enriched);
          }
        });

        // Hover cursor on radius circles
        m.on('mouseenter', 'markets-radius', () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', 'markets-radius', () => {
          m.getCanvas().style.cursor = '';
        });

        m.on('click', 'clusters', (e) => {
          const features = m.queryRenderedFeatures(e.point, { layers: ['clusters'] });
          const clusterId = features[0].properties?.cluster_id;
          const source = m.getSource('markets') as maplibregl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId).then((zoom) => {
            const geometry = features[0].geometry as GeoJSON.Point;
            m.easeTo({ center: geometry.coordinates as [number, number], zoom });
          });
        });

        m.on('dblclick', (e) => {
          if (e.lngLat) {
            setSelectedMarket(null);
            setClickedLngLat(null);
            setCreateCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          }
        });

        m.on('mouseenter', 'markets-layer', () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', 'markets-layer', () => {
          m.getCanvas().style.cursor = '';
        });

        setMarkets(features.map((f: any) => ({
          ...f.properties,
          lng: f.geometry?.coordinates?.[0] ?? 0,
          lat: f.geometry?.coordinates?.[1] ?? 0,
        })));
      });
    });

    map.current = m;
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
      m.remove();
      map.current = null;
    };
  }, []);

  const handleMarketCreated = useCallback(() => {
    setCreateCoords(null);
    window.location.reload();
  }, []);

  const handleMarketClosed = useCallback(() => {
    setSelectedMarket(null);
    setClickedLngLat(null);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      {/* ---- New-style MapControls (top-left) ---- */}
      <MapControls
        walletAddress={address}
        isConnected={isConnected}
        onConnect={() => connect({ connector: injected() })}
        onDisconnect={() => disconnect()}
        onFlyTo={handleFlyTo}
        onCategoryFilter={handleCategoryFilter}
      />

      {/* ---- New Market button (bottom-left) ---- */}
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 45, display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            setSelectedMarket(null);
            setCreateCoords({ lng: 37.62, lat: 55.75 });
          }}
          className="glass rounded-xl shadow-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/20 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Market
        </button>
      </div>

      {/* ---- Hint (bottom-right) ---- */}
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 45 }} className="glass rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground">
        Double-click map to create market
      </div>

      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* ---- WebGL lost overlay ---- */}
      {!webglReady && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(15, 23, 42, 0.85)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 20, gap: 12,
        }}>
          <div style={{ fontSize: 14, color: '#f59e0b', fontWeight: 500 }}>
            ⚠ Map unavailable — WebGL context lost
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>
            Restore attempt {restoreAttempts.current}/{WEBGL_RESTORE_MAX_ATTEMPTS}
            {restoreAttempts.current >= WEBGL_RESTORE_MAX_ATTEMPTS
              ? ' — please reload the page.'
              : ' — auto-retrying...'}
          </div>
          {restoreAttempts.current >= WEBGL_RESTORE_MAX_ATTEMPTS && (
            <div style={{ fontSize: 11, color: '#f87171', maxWidth: 320, textAlign: 'center' }}>
              This may be caused by a browser extension (e.g. MetaMask) conflicting with WebGL.
              Try disabling extensions or using a different browser.
            </div>
          )}
          <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
            Reload Page
          </button>
        </div>
      )}

      {/* Marker popup (overrides sidebar for map clicks) */}
      {selectedMarket && clickedLngLat && map.current && (
        <MarketPopup
          market={selectedMarket}
          map={map.current}
          lngLat={clickedLngLat}
          onClose={() => {
            setSelectedMarket(null);
            setClickedLngLat(null);
          }}
        />
      )}
      {createCoords && (
        <CreateMarketModal coordinates={createCoords} onClose={() => setCreateCoords(null)} onCreated={handleMarketCreated} />
      )}
      <EventFeed />
    </div>
  );
}

async function fetchMarkets(): Promise<GeoJSON.Feature[]> {
  try {
    const res = await fetch('/api/markets');
    if (!res.ok) return [];
    const data: GeoJSON.FeatureCollection = await res.json();
    return data.features;
  } catch {
    return [];
  }
}
