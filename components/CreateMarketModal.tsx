'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { MARKET_FACTORY_ADDRESS, MarketFactoryABI } from '@/lib/web3';

interface Props {
  coordinates: { lng: number; lat: number };
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateMarketModal({ coordinates, onClose, onCreated }: Props) {
  const { isConnected } = useAccount();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [endTime, setEndTime] = useState('');
  const [resolutionTime, setResolutionTime] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const { writeContractAsync, data: hash } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({ hash });

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

    try {
      const txHash = await writeContractAsync({
        abi: MarketFactoryABI,
        address: MARKET_FACTORY_ADDRESS,
        functionName: 'createMarket',
        args: [name, description || '', BigInt(endTs), BigInt(resTs), BigInt(200000000)],
      });

      await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract_address: '0x0000000000000000000000000000000000000001',
          name,
          description,
          category,
          lng: coordinates.lng,
          lat: coordinates.lat,
          end_time: endTs,
          resolution_time: resTs,
          liquidity: 200,
        }),
      });

      await onCreated();
      onClose();
    } catch (e: any) {
      console.error('Create market failed:', e);
      setError(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 400, height: '100%',
      background: '#1a1a2e', color: '#e2e8f0', padding: 24, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      overflowY: 'auto', zIndex: 10, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Create Market</h2>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer', padding: '4px 8px',
        }}>×</button>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
        Location: {coordinates.lng.toFixed(4)}, {coordinates.lat.toFixed(4)}
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

      {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {isConnected ? (
        <button onClick={handleSubmit} disabled={creating || isConfirming} style={{
          width: '100%', padding: '12px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: creating || isConfirming ? '#334155' : '#6366f1',
          color: '#fff', fontWeight: 500, fontSize: 14,
          opacity: creating || isConfirming ? 0.6 : 1,
        }}>
          {isConfirming ? 'Confirming...' : creating ? 'Deploying...' : 'Create Market (200 USDC)'}
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
