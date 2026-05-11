'use client';

import { useState, useEffect } from 'react';
import { Globe, Plus, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const COMMON_COUNTRIES = [
  'US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU', 'JP', 'CN', 'IN', 'BR',
  'RU', 'KR', 'NL', 'CH', 'SE', 'NO', 'FI', 'DK', 'PL', 'UA', 'IL', 'AE',
  'SG', 'HK', 'TW', 'TH', 'VN', 'MY', 'ID', 'PH', 'NZ', 'ZA', 'NG', 'KE',
  'EG', 'AR', 'MX', 'CO', 'CL', 'PE',
];

export default function AdminAllowedCountries() {
  const [countries, setCountries] = useState<string[]>([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [msgType, setMsgType] = useState<'success' | 'error' | 'info'>('info');
  const [showCommon, setShowCommon] = useState(false);

  const fetchCountries = () => {
    setLoading(true);
    fetch('/api/admin/allowed-countries')
      .then((r) => r.json())
      .then((data) => {
        setCountries(data.countries || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => { fetchCountries(); }, []);

  const showMessage = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => setMsg(''), 3000);
  };

  const addCountry = async () => {
    const code = newCode.toUpperCase().trim();
    if (!code || !/^[A-Z]{2}$/.test(code)) {
      showMessage('Enter a valid ISO-3166-1 alpha-2 code (e.g. US, RU, GB)', 'error');
      return;
    }
    if (countries.includes(code)) {
      showMessage('Country already in list', 'error');
      return;
    }

    const updated = [...countries, code].sort();
    try {
      const res = await fetch('/api/admin/allowed-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setCountries(data.countries);
        setNewCode('');
        showMessage(`Added ${code}`, 'success');
      } else {
        showMessage('Failed to update', 'error');
      }
    } catch {
      showMessage('Network error', 'error');
    }
  };

  const removeCountry = async (code: string) => {
    const updated = countries.filter((c) => c !== code);
    try {
      const res = await fetch('/api/admin/allowed-countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries: updated }),
      });
      if (res.ok) {
        const data = await res.json();
        setCountries(data.countries);
        showMessage(`Removed ${code}`, 'success');
      }
    } catch {
      showMessage('Network error', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-medium text-foreground mb-1">Allowed Countries</h2>
        <p className="text-xs text-muted-foreground">
          Only markets in allowed countries can be created. Uses reverse geocoding to determine country from coordinates.
        </p>
      </div>

      {/* Message */}
      {msg && (
        <div className={`px-4 py-2.5 rounded-lg text-xs font-medium ${
          msgType === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
          msgType === 'error' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
          'bg-blue-500/10 text-blue-400 border border-blue-500/20'
        }`}>
          {msg}
        </div>
      )}

      {/* Add country form */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Country code (e.g. US)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && addCountry()}
            maxLength={2}
            className="pl-8 w-32 text-sm uppercase"
          />
        </div>
        <Button size="sm" onClick={addCountry} className="h-9 gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Add
        </Button>
      </div>

      {/* Countries list */}
      {countries.length === 0 ? (
        <Card className="glass rounded-xl p-8 text-center">
          <Globe className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No countries added yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">All locations will be rejected until you add at least one country.</p>
        </Card>
      ) : (
        <div className="flex flex-wrap gap-2">
          {countries.map((code) => (
            <Badge
              key={code}
              variant="secondary"
              className="px-3 py-1.5 text-sm gap-2 group hover:bg-destructive/10 hover:text-destructive transition-colors cursor-pointer"
              onClick={() => removeCountry(code)}
            >
              {code}
              <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Badge>
          ))}
        </div>
      )}

      {/* Country count */}
      {countries.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {countries.length} {countries.length === 1 ? 'country' : 'countries'} allowed • Click a badge to remove
        </p>
      )}

      {/* Common codes */}
      <details className="mt-4" open={showCommon} onToggle={(e) => setShowCommon((e.target as HTMLDetailsElement).open)}>
        <summary className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
          {showCommon ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Common country codes ({COMMON_COUNTRIES.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {COMMON_COUNTRIES.map((c) => {
            const isAdded = countries.includes(c);
            return (
              <Badge
                key={c}
                variant={isAdded ? 'default' : 'outline'}
                className={`text-[10px] cursor-pointer transition-all ${
                  isAdded ? '' : 'hover:border-primary/50 hover:text-primary'
                }`}
                onClick={() => {
                  if (isAdded) {
                    removeCountry(c);
                  } else {
                    setNewCode(c);
                  }
                }}
              >
                {c}
              </Badge>
            );
          })}
        </div>
      </details>
    </div>
  );
}
