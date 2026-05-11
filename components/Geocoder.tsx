'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, MapPin, X, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeocoderProps {
  onSelect: (lng: number, lat: number, displayName: string) => void;
}

interface GeocodeResult {
  display_name: string;
  lat: string;
  lon: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function geocode(query: string): Promise<GeocodeResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'GeoRevolt/1.0' },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Geocoder({ onSelect }: GeocoderProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // -----------------------------------------------------------------------
  // Debounced search
  // -----------------------------------------------------------------------
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!value.trim()) {
      setResults([]);
      setOpen(false);
      setHasSearched(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setHasSearched(true);
      const data = await geocode(value);
      setResults(data);
      setOpen(data.length > 0 || value.trim().length >= 3);
      setLoading(false);
    }, 300);
  }, []);

  // -----------------------------------------------------------------------
  // Selection
  // -----------------------------------------------------------------------
  const handleSelect = useCallback(
    (result: GeocodeResult) => {
      const lng = parseFloat(result.lon);
      const lat = parseFloat(result.lat);
      setQuery(result.display_name);
      setOpen(false);
      setResults([]);
      setHasSearched(false);
      onSelect(lng, lat, result.display_name);
    },
    [onSelect]
  );

  // -----------------------------------------------------------------------
  // Clear
  // -----------------------------------------------------------------------
  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setOpen(false);
    setHasSearched(false);
    inputRef.current?.focus();
  }, []);

  // -----------------------------------------------------------------------
  // Click outside detection
  // -----------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // -----------------------------------------------------------------------
  // Cleanup debounce on unmount
  // -----------------------------------------------------------------------
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // -----------------------------------------------------------------------
  // Determine if dropdown should be visible
  // -----------------------------------------------------------------------
  const showDropdown = open && query.trim().length >= 3;

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input */}
      <div className="relative">
        {/* Left search icon or spinner */}
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          {loading ? (
            <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
        </div>

        <Input
          ref={inputRef}
          placeholder="Search address or place..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0 || (hasSearched && query.trim().length >= 3)) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestion
            setTimeout(() => setOpen(false), 200);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          className="pl-8 pr-8 h-9 text-sm bg-background/60 border-border/50 placeholder:text-muted-foreground/60"
        />

        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <Card className="card-glass absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto">
          {results.length > 0 ? (
            results.map((result, index) => (
              <button
                key={`${result.lat}-${result.lon}-${index}`}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(result);
                }}
                className={cn(
                  'w-full text-left px-3 py-2.5 text-sm transition-colors flex items-start gap-2.5',
                  'hover:bg-accent/20 focus-visible:bg-accent/20 focus-visible:outline-none',
                  'border-b border-border/30 last:border-0'
                )}
              >
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">
                    {result.display_name.split(',')[0]}
                  </div>
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {result.display_name}
                  </div>
                </div>
              </button>
            ))
          ) : (
            // Empty state — only show if user typed enough but no results
            !loading && (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                No results found
              </div>
            )
          )}
        </Card>
      )}
    </div>
  );
}
