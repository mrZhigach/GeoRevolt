'use client';

import { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { MARKET_FACTORY_ADDRESS, MOCK_USDC_ADDRESS, MarketFactoryABI, anvilChain } from '@/lib/web3';
import { createPublicClient, http, decodeEventLog, parseAbiItem } from 'viem';

interface Props {
  coordinates: { lng: number; lat: number };
  onClose: () => void;
  onCreated: () => void;
}

const ERC20_APPROVE_ABI = [{
  type: 'function' as const,
  name: 'approve',
  stateMutability: 'nonpayable' as const,
  inputs: [
    { name: 'spender', type: 'address' as const },
    { name: 'amount', type: 'uint256' as const },
  ],
  outputs: [{ type: 'bool' as const }],
}];

export default function CreateMarketModal({ coordinates, onClose, onCreated }: Props) {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [endTime, setEndTime] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [statusText, setStatusText] = useState('');

  // Address-based geocoding
  const [radius, setRadius] = useState(100);
  const [addressQuery, setAddressQuery] = useState('');
  const [geocoding, setGeocoding] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);
  const [coords, setCoords] = useState(coordinates);

  const publicClient = createPublicClient({
    chain: anvilChain,
    transport: http('http://127.0.0.1:8545'),
  });

  const handleGeocode = async () => {
    if (!addressQuery.trim()) return;
    setGeocoding(true);
    setError('');
    try {
      const q = encodeURIComponent(addressQuery.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`,
        { headers: { 'User-Agent': 'GeoRevolt/1.0' } }
      );
      if (!res.ok) throw new Error('Geocoding request failed');
      const data = await res.json();
      if (!data.length) throw new Error('Address not found');
      const { lat, lon, display_name } = data[0];
      setCoords({ lng: parseFloat(lon), lat: parseFloat(lat) });
      setResolvedAddress(display_name);
    } catch (e: any) {
      setError(e?.message || 'Geocoding failed');
    } finally {
      setGeocoding(false);
    }
  };

  const handleSubmit = async () => {
    if (!name || !endTime || !resolutionTime) {
      setError('Fill required fields');
      return;
    }

    const endTs = Math.floor(new Date(endTime).getTime() / 1000);
    const resTs = Math.floor(new Date(resolutionTime).getTime() / 1000);

    if (endTs <= Math.floor(Date.now() / 1000)) {
      setError('End time must be in the future');
      return;
    }
    if (resTs <= endTs) {
      setError('Resolution time must be after end time');
      return;
    }

    setCreating(true);
    setError('');
    setStatusText('');

    try {
      const initialLiquidity = BigInt(200000000);

      setStatusText('Approving USDC...');
      const approveHash = await writeContractAsync({
        abi: ERC20_APPROVE_ABI,
        address: MOCK_USDC_ADDRESS,
        functionName: 'approve',
        args: [MARKET_FACTORY_ADDRESS, initialLiquidity],
      });
      await publicClient.waitForTransactionReceipt({ hash: approveHash });

      setStatusText('Creating market...');
      const txHash = await writeContractAsync({
        abi: MarketFactoryABI,
        address: MARKET_FACTORY_ADDRESS,
        functionName: 'createMarket',
        args: [name, description || '', BigInt(endTs), BigInt(resTs), initialLiquidity],
      });

      setStatusText('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      const marketCreatedEvent = parseAbiItem('event MarketCreated(address indexed marketAddress, uint256 indexed index, string name)');

      let marketAddress = '';
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [marketCreatedEvent],
            data: log.data,
            topics: log.topics,
          });
          marketAddress = decoded.args.marketAddress;
          break;
        } catch {
          // not a MarketCreated event, skip
        }
      }

      if (!marketAddress) throw new Error('Could not find MarketCreated event');

      setStatusText('Saving to database...');
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: marketAddress,
          name,
          description,
          category,
          lng: coords.lng,
          lat: coords.lat,
          end_time: endTs,
          resolution_time: resTs,
          liquidity: 200,
          radius,
          address: resolvedAddress,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save market');
      }

      await onCreated();
      onClose();
    } catch (e: any) {
      console.error('Create market failed:', e);
      setError(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setCreating(false);
      setStatusText('');
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 400, height: '100%',
      background: '#1a1a2e', color: '#e2e8f0', padding: 24, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      overflowY: 'auto', zIndex: 10, fontFamily: 'system-ui, sans-serif',
    }}>
      <div className="flex justify-between items-center mb-5">
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: '#e2e8f0' }}>Create Market</h2>
        <button onClick={onClose} style={{
          width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 8, background: 'rgba(148,163,184,0.15)', border: 'none',
          color: '#94a3b8', fontSize: 20, cursor: 'pointer', transition: 'all 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.3)'; e.currentTarget.style.color = '#e2e8f0'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(148,163,184,0.15)'; e.currentTarget.style.color = '#94a3b8'; }}
        >×</button>
      </div>

      {/* Address search */}
      <label style={labelStyle}>Address (optional)</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        <input
          value={addressQuery}
          onChange={(e) => setAddressQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGeocode()}
          style={{ ...inputStyle, flex: 1 }}
          placeholder="Search address or place..."
        />
        <button onClick={handleGeocode} disabled={geocoding || !addressQuery.trim()} style={{
          padding: '8px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: geocoding || !addressQuery.trim() ? '#334155' : '#6366f1',
          color: '#fff', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap',
        }}>
          {geocoding ? '...' : 'Find'}
        </button>
      </div>

      {resolvedAddress && (
        <div style={{ fontSize: 11, color: '#22c55e', marginBottom: 8 }}>
          ✓ {resolvedAddress}
        </div>
      )}

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16, background: '#16213e', padding: '8px 12px', borderRadius: 6 }}>
        Coordinates: {coords.lng.toFixed(4)}, {coords.lat.toFixed(4)}
      </div>

      <label style={labelStyle}>Name *</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Who will win?" />

      <label style={labelStyle}>Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Describe the market" />

      <label style={labelStyle}>Category</label>
      <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
        <option value="general">General</option>
        <option value="politics">Politics</option>
        <option value="sports">Sports</option>
        <option value="economics">Economics</option>
        <option value="technology">Technology</option>
      </select>

      <label style={labelStyle}>End Time *</label>
      <input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Resolution Time *</label>
      <input type="datetime-local" value={resolutionTime} onChange={(e) => setResolutionTime(e.target.value)} style={inputStyle} />

      <label style={labelStyle}>Radius (meters)</label>
      <input type="number" value={radius} onChange={(e) => setRadius(Number(e.target.value))} style={inputStyle} min={10} max={5000} />
      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, marginBottom: 8 }}>Display circle radius on map (10–5000 m)</div>

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {statusText && <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 12 }}>{statusText}</div>}

      {isConnected ? (
        <button onClick={handleSubmit} disabled={creating} style={{
          width: '100%', padding: '12px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: creating ? '#334155' : '#6366f1',
          color: '#fff', fontWeight: 500, fontSize: 14,
          opacity: creating ? 0.6 : 1,
        }}>
          {creating ? statusText || 'Deploying...' : 'Create Market (200 USDC)'}
        </button>
      ) : (
        <div style={{ padding: 12, background: '#16213e', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Connect wallet to create a market
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 4, marginTop: 12,
};

const inputStyle: React.CSSProperties = {
  width: '92%', padding: '10px 12px', borderRadius: 6, border: '1px solid #334155',
  background: '#0f172a', color: '#e2e8f0', fontSize: 13, display: 'block',
};
