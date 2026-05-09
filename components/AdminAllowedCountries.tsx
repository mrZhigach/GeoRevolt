'use client';

import { useState, useEffect } from 'react';

export default function AdminAllowedCountries() {
  const [countries, setCountries] = useState<string[]>([]);
  const [newCode, setNewCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');

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

  const addCountry = async () => {
    const code = newCode.toUpperCase().trim();
    if (!code || !/^[A-Z]{2}$/.test(code)) {
      setMsg('Enter a valid ISO-3166-1 alpha-2 code (e.g. US, RU, GB)');
      return;
    }
    if (countries.includes(code)) {
      setMsg('Country already in list');
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
        setMsg(`Added ${code}`);
      } else {
        setMsg('Failed to update');
      }
    } catch {
      setMsg('Network error');
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
        setMsg(`Removed ${code}`);
      }
    } catch {
      setMsg('Network error');
    }
  };

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Loading...</div>;
  }

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: 16, color: '#94a3b8' }}>Allowed Countries</h2>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Only markets in allowed countries can be created. Uses reverse geocoding to determine country from coordinates.
        Currently, geocoding returns &quot;XX&quot; (unknown) — integrate Nominatim or BigDataCloud for real resolution.
      </p>

      {msg && (
        <div style={{ padding: 10, background: '#16213e', borderRadius: 8, marginBottom: 12, fontSize: 12 }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          type="text" placeholder="Country code (e.g. US)" value={newCode}
          onChange={(e) => setNewCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && addCountry()}
          maxLength={2}
          style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, width: 100, textTransform: 'uppercase' }}
        />
        <button onClick={addCountry} style={{
          background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
        }}>
          Add
        </button>
      </div>

      {countries.length === 0 ? (
        <div style={{ color: '#64748b', fontSize: 13 }}>No countries added. All locations will be rejected.</div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {countries.map((code) => (
            <div key={code} style={{
              background: '#16213e', borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14, fontWeight: 500 }}>{code}</span>
              <button onClick={() => removeCountry(code)} style={{
                background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1,
              }}>
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <details style={{ marginTop: 24 }}>
        <summary style={{ color: '#64748b', fontSize: 12, cursor: 'pointer' }}>Common country codes</summary>
        <div style={{ marginTop: 8, fontSize: 11, color: '#475569', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU', 'JP', 'CN', 'IN', 'BR', 'RU', 'KR', 'NL', 'CH', 'SE', 'NO', 'FI', 'DK', 'PL', 'UA', 'IL', 'AE', 'SG', 'HK', 'TW', 'TH', 'VN', 'MY', 'ID', 'PH', 'NZ', 'ZA', 'NG', 'KE', 'EG', 'AR', 'MX', 'CO', 'CL', 'PE'].map((c) => (
            <span key={c} onClick={() => { setNewCode(c); }} style={{ cursor: 'pointer', padding: '2px 6px', borderRadius: 4, background: countries.includes(c) ? '#6366f1' : '#1e293b', color: countries.includes(c) ? '#fff' : '#94a3b8' }}>
              {c}
            </span>
          ))}
        </div>
      </details>
    </div>
  );
}
