'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl, { GeoJSONSource } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MarketSidebar from './MarketSidebar';
import CreateMarketModal from './CreateMarketModal';
import EventFeed from './EventFeed';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

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
}

export default function Map() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const restoreAttempts = useRef(0);
  const [selectedMarket, setSelectedMarket] = useState<MarketProperties | null>(null);
  const [createCoords, setCreateCoords] = useState<{ lng: number; lat: number } | null>(null);
  const [markets, setMarkets] = useState<MarketProperties[]>([]);
  const [webglReady, setWebglReady] = useState(true);
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    const m = new maplibregl.Map({
      container: mapContainer.current,
      style: '/data/style-demo.json',
      center: [40, 55],
      zoom: 3,
      failIfMajorPerformanceCaveat: false,
    });

    // WebGL context loss/restore handling
    const canvas = m.getCanvas();
    const handleContextLost = (e: Event) => {
      e.preventDefault();
      console.warn('[Map] WebGL context lost — attempting to restore...');
      setWebglReady(false);
    };
    const handleContextRestored = () => {
      console.log('[Map] WebGL context restored');
      setWebglReady(true);
      restoreAttempts.current = 0;
      m.resize();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);

    // If context was already lost before we attached listeners, try restoring
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

        // Click on circle → open sidebar (same as marker click)
        m.on('click', 'markets-radius', (e) => {
          const props = e.features?.[0]?.properties as Record<string, any>;
          if (props?.contract_address) {
            setCreateCoords(null);
            setSelectedMarket(props as unknown as MarketProperties);
          }
        });

        m.on('click', 'markets-layer', (e) => {
          const props = e.features?.[0]?.properties as Record<string, any>;
          if (props?.contract_address) {
            setCreateCoords(null);
            setSelectedMarket(props as unknown as MarketProperties);
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
            setCreateCoords({ lng: e.lngLat.lng, lat: e.lngLat.lat });
          }
        });

        m.on('mouseenter', 'markets-layer', () => {
          m.getCanvas().style.cursor = 'pointer';
        });
        m.on('mouseleave', 'markets-layer', () => {
          m.getCanvas().style.cursor = '';
        });

        setMarkets(features.map((f: any) => f.properties));
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
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 5, background: '#1a1a2e', padding: '8px 16px', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#22c55e', fontSize: 12 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <button onClick={() => disconnect()} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Disconnect</button>
          </div>
        ) : (
          <button onClick={() => connect({ connector: injected() })} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Connect Wallet
          </button>
        )}
      </div>
      <div style={{ position: 'absolute', bottom: 12, left: 12, zIndex: 5, display: 'flex', gap: 8 }}>
        <button onClick={() => { setSelectedMarket(null); setCreateCoords({ lng: 37.62, lat: 55.75 }); }} style={{
          background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px',
          cursor: 'pointer', fontSize: 13, fontWeight: 500,
        }}>
          + New Market
        </button>
      </div>
      <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 5, background: '#1a1a2e', padding: '6px 12px', borderRadius: 6, color: '#64748b', fontSize: 11 }}>
        Double-click map to create market
      </div>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

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
            Attempting to restore... Try refreshing the page if this persists.
          </div>
          <button onClick={() => window.location.reload()} style={{
            marginTop: 8, padding: '8px 20px', borderRadius: 6, border: 'none',
            background: '#6366f1', color: '#fff', cursor: 'pointer', fontSize: 13,
          }}>
            Reload Page
          </button>
        </div>
      )}

      {selectedMarket && (
        <MarketSidebar market={selectedMarket} onClose={() => setSelectedMarket(null)} />
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
