'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { createRoot, Root } from 'react-dom/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MarketData {
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

interface MarketPopupProps {
  market: MarketData;
  map: maplibregl.Map;
  lngLat: { lng: number; lat: number };
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Token display helpers
// ---------------------------------------------------------------------------

function formatPrice(p: number | undefined): string {
  if (p === undefined || p === null) return '—';
  return `¢${(p * 100).toFixed(1)}`;
}

// ---------------------------------------------------------------------------
// Inner React component rendered inside the MapLibre popup
// ---------------------------------------------------------------------------

function MarketPopupContent({
  market,
  onClose,
  onBuy,
}: {
  market: MarketData;
  onClose: () => void;
  onBuy: (side: 'YES' | 'NO') => void;
}) {
  const categoryColors: Record<string, string> = {
    politics: '#ef4444',
    sports: '#3b82f6',
    economics: '#f59e0b',
    technology: '#8b5cf6',
    general: '#6366f1',
  };

  return (
    <div className="min-w-[260px] max-w-[300px]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: categoryColors[market.category] || '#6366f1' }}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {market.category}
            </span>
            {market.status === 'resolved' && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                Resolved
              </span>
            )}
          </div>
          <h3 className="text-sm font-semibold text-foreground leading-tight line-clamp-2">
            {market.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      {/* Address */}
      {market.address && (
        <p className="text-[11px] text-muted-foreground/70 mb-2 line-clamp-1">
          📍 {market.address}
        </p>
      )}

      {/* Price indicators */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1 rounded-lg border border-green-500/30 bg-green-500/5 p-2 text-center">
          <div className="text-[10px] text-green-400 font-medium uppercase tracking-wide">YES</div>
          <div className="text-lg font-bold text-green-400">
            {formatPrice(market.price_yes)}
          </div>
          <div className="text-[10px] text-muted-foreground">per share</div>
        </div>
        <div className="flex-1 rounded-lg border border-red-500/30 bg-red-500/5 p-2 text-center">
          <div className="text-[10px] text-red-400 font-medium uppercase tracking-wide">NO</div>
          <div className="text-lg font-bold text-red-400">
            {formatPrice(market.price_no)}
          </div>
          <div className="text-[10px] text-muted-foreground">per share</div>
        </div>
      </div>

      {/* Liquidity info */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-3">
        <span>💰 {market.liquidity.toLocaleString()} USDC</span>
        <a
          href={`/market/${market.contract_address}`}
          className="text-primary hover:underline font-medium"
        >
          Details →
        </a>
      </div>

      {/* Quick buy buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onBuy('YES')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
            bg-green-500/20 text-green-400 border border-green-500/30
            hover:bg-green-500/30 hover:border-green-500/50 active:scale-[0.97]"
        >
          💰 Buy YES
        </button>
        <button
          onClick={() => onBuy('NO')}
          className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150
            bg-red-500/20 text-red-400 border border-red-500/30
            hover:bg-red-500/30 hover:border-red-500/50 active:scale-[0.97]"
        >
          💰 Buy NO
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MarketPopup: manages a MapLibre Popup and renders React content into it
// ---------------------------------------------------------------------------

export default function MarketPopup({ market, map, lngLat, onClose }: MarketPopupProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const rootRef = useRef<Root | null>(null);
  const mountedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const contractRef = useRef(market.contract_address);
  // Keep refs up to date without triggering re-render
  onCloseRef.current = onClose;
  contractRef.current = market.contract_address;

  useEffect(() => {
    if (!map) return;

    let cancelled = false;
    const safeRender = (
      el: React.ReactElement
    ) => {
      if (cancelled || !rootRef.current) return;
      try {
        rootRef.current.render(el);
      } catch {
        // Root was unmounted between check and render — ignore
      }
    };

    // Create a container div for React
    const container = document.createElement('div');
    container.className = 'market-popup-content';

    // Create the MapLibre popup
    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: '320px',
      offset: 10,
      className: 'georevolt-marker-popup',
    } as maplibregl.PopupOptions)
      .setLngLat([lngLat.lng, lngLat.lat])
      .setDOMContent(container)
      .addTo(map);

    popupRef.current = popup;
    const root = createRoot(container);
    rootRef.current = root;

    // Popup close handler (MapLibre close button or outside click)
    popup.on('close', () => {
      cancelled = true;
      onCloseRef.current();
    });

    // Helper to render popup content (safe against unmounted root)
    const renderContent = (
      overrides: Partial<{
        price_yes: number;
        price_no: number;
        onBuy: (side: 'YES' | 'NO') => void;
      }> = {}
    ) => {
      if (cancelled) return;
      safeRender(
        <MarketPopupContent
          market={{ ...market, ...overrides }}
          onClose={onCloseRef.current}
          onBuy={overrides.onBuy ?? (() => {
            window.location.href = `/market/${contractRef.current}`;
          })}
        />
      );
    };

    // Initial render
    renderContent();

    // Fetch current prices if available
    const fetchPrices = async () => {
      try {
        const res = await fetch(`/api/price-history/${contractRef.current}`);
        if (res.ok) {
          const data = await res.json();
          const prices = data.prices || data;
          const latest = Array.isArray(prices) ? prices[prices.length - 1] : prices;
          if (latest && !cancelled) {
            renderContent({
              price_yes: latest.price_yes,
              price_no: latest.price_no,
              onBuy: (side) => {
                window.location.href = `/market/${contractRef.current}?buy=${side}`;
              },
            });
            return;
          }
        }
      } catch {
        // silent
      }
      if (!cancelled) {
        renderContent({
          onBuy: (side) => {
            window.location.href = `/market/${contractRef.current}?buy=${side}`;
          },
        });
      }
    };

    // Fetch prices in background
    fetchPrices();

    // Cleanup
    return () => {
      cancelled = true;
      if (rootRef.current) {
        try {
          rootRef.current.unmount();
        } catch {
          // silent
        }
        rootRef.current = null;
      }
      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }
    };
  }, [map, lngLat.lng, lngLat.lat, market]); // NOTE: onClose intentionally omitted — stored in ref to avoid re-run

  // This component doesn't render anything directly
  return null;
}
