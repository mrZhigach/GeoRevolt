'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Search,
  MapPin,
  SlidersHorizontal,
  Wallet,
  TrendingUp,
  BarChart3,
  Users,
  Grip,
  RefreshCw,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

interface StatsData {
  totalMarkets: number;
  totalLiquidityUSDC: number;
  activeMarkets: number;
  resolvedMarkets: number;
}

interface MapControlsProps {
  /** Current wallet address (from wagmi) */
  walletAddress?: string;
  /** Whether wallet is connected */
  isConnected: boolean;
  /** Connect wallet handler */
  onConnect: () => void;
  /** Disconnect wallet handler */
  onDisconnect: () => void;
  /** Called when user searches for an address */
  onFlyTo: (lng: number, lat: number) => void;
  /** Called when category filter changes */
  onCategoryFilter?: (category: string) => void;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories', icon: '🌐' },
  { value: 'politics', label: 'Politics', icon: '🏛️' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'economics', label: 'Economics', icon: '📈' },
  { value: 'technology', label: 'Technology', icon: '💻' },
  { value: 'general', label: 'General', icon: '📌' },
] as const;

// ---------------------------------------------------------------------------
// Geocoder helpers
// ---------------------------------------------------------------------------

async function geocode(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GeoRevolt/1.0' },
  });
  if (!res.ok) return [];
  return res.json();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapControls({
  walletAddress,
  isConnected,
  onConnect,
  onDisconnect,
  onFlyTo,
  onCategoryFilter,
}: MapControlsProps) {
  // === Search / Geocoder ===
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  // === Filters ===
  const [category, setCategory] = useState('all');

  // === Stats ===
  const [stats, setStats] = useState<StatsData | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // === My Bets sheet ===
  const [myBetsOpen, setMyBetsOpen] = useState(false);

  // -----------------------------------------------------------------------
  // Geocoder debounced search
  // -----------------------------------------------------------------------
  const handleSearchInput = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      const results = await geocode(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setGeocoding(false);
    }, 400);
  }, []);

  const handleSelectSuggestion = useCallback(
    (result: GeocodeResult) => {
      setQuery(result.display_name);
      setShowSuggestions(false);
      setSuggestions([]);
      onFlyTo(parseFloat(result.lon), parseFloat(result.lat));
    },
    [onFlyTo]
  );

  const handleSearchSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      setGeocoding(true);
      const results = await geocode(query);
      setGeocoding(false);
      if (results.length > 0) {
        handleSelectSuggestion(results[0]);
      }
    },
    [query, handleSelectSuggestion]
  );

  // -----------------------------------------------------------------------
  // Stats fetching (every 30s)
  // -----------------------------------------------------------------------
  useEffect(() => {
    const fetchStats = async () => {
      setStatsLoading(true);
      try {
        const res = await fetch('/api/admin/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // silent
      } finally {
        setStatsLoading(false);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30_000);
    return () => clearInterval(interval);
  }, []);

  // -----------------------------------------------------------------------
  // Category filter
  // -----------------------------------------------------------------------
  const handleCategoryChange = useCallback(
    (value: string | null) => {
      const cat = value ?? 'all';
      setCategory(cat);
      onCategoryFilter?.(cat);
    },
    [onCategoryFilter]
  );

  // -----------------------------------------------------------------------
  // Cleanup debounce
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="fixed top-4 left-2 sm:left-4 z-40 w-[280px] sm:w-[340px] flex flex-col gap-2">
      {/* ---- Main Control Card ---- */}
      <Card className="glass rounded-xl shadow-lg p-3 space-y-3 transition-soft">
        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="Search address or place..."
              value={query}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              className="pl-8 h-9 text-sm bg-background/60 border-border/50 placeholder:text-muted-foreground/60"
            />
            {geocoding && (
              <RefreshCw className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Geocoder suggestions */}
          {showSuggestions && (
            <Card className="absolute top-full left-0 right-0 mt-1 z-20 max-h-48 overflow-y-auto rounded-lg shadow-xl border-border/50">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-3 py-2 text-xs text-foreground/80 hover:bg-accent/20 transition-colors flex items-start gap-2 border-b border-border/30 last:border-0"
                >
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{s.display_name}</span>
                </button>
              ))}
            </Card>
          )}
        </form>

        {/* Category filter */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select value={category} onValueChange={handleCategoryChange}>
            <SelectTrigger className="h-8 text-xs flex-1 bg-background/40 border-border/40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value} className="text-xs">
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2">
          {/* Wallet */}
          {isConnected ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
                <Wallet className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary font-medium">
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-3)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                className="h-7 text-[11px] text-muted-foreground hover:text-destructive px-2"
              >
                Exit
              </Button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onConnect}
              className="h-8 text-xs flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Connect
            </Button>
          )}

          {/* My Bets */}
          <Sheet open={myBetsOpen} onOpenChange={setMyBetsOpen}>
            <SheetTrigger className="inline-flex items-center justify-center h-8 px-2.5 text-xs rounded-lg border border-border/50 text-muted-foreground hover:text-foreground bg-transparent hover:bg-accent/10 transition-colors">
              <Grip className="w-3.5 h-3.5 mr-1" />
              My Bets
            </SheetTrigger>
            <SheetContent className="w-[350px] sm:w-[420px]">
              <SheetHeader>
                <SheetTitle className="text-lg font-heading">My Bets</SheetTitle>
              </SheetHeader>
              <div className="mt-6 text-center text-sm text-muted-foreground">
                {isConnected ? (
                  <p>Your active positions will appear here. Connect your wallet to see your bets.</p>
                ) : (
                  <div className="space-y-3">
                    <Wallet className="w-8 h-8 mx-auto text-muted-foreground/50" />
                    <p>Connect your wallet to view your bets.</p>
                    <Button size="sm" onClick={onConnect} className="mt-2">
                      Connect Wallet
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </Card>

      {/* ---- Stats Mini Card ---- */}
      {stats && (
        <Card className="glass rounded-xl shadow-lg p-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center">
              <BarChart3 className="w-3.5 h-3.5 mx-auto text-primary mb-0.5" />
              <div className="text-xs font-semibold text-foreground">
                {stats.totalMarkets}
              </div>
              <div className="text-[10px] text-muted-foreground">Markets</div>
            </div>
            <div className="text-center">
              <TrendingUp className="w-3.5 h-3.5 mx-auto text-green-400 mb-0.5" />
              <div className="text-xs font-semibold text-foreground">
                {stats.activeMarkets}
              </div>
              <div className="text-[10px] text-muted-foreground">Active</div>
            </div>
            <div className="text-center">
              <Users className="w-3.5 h-3.5 mx-auto text-blue-400 mb-0.5" />
              <div className="text-xs font-semibold text-foreground">
                ${(stats.totalLiquidityUSDC || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-muted-foreground">TVL</div>
            </div>
          </div>
        </Card>
      )}

      {/* Loading skeleton for stats */}
      {statsLoading && !stats && (
        <Card className="glass rounded-xl shadow-lg p-3 animate-pulse">
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-5 h-5 bg-muted/30 rounded mx-auto mb-1" />
                <div className="w-8 h-3 bg-muted/30 rounded mx-auto mb-0.5" />
                <div className="w-10 h-2 bg-muted/20 rounded mx-auto" />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
