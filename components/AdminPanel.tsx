'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useWriteContract } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { MarketFactoryABI, MARKET_FACTORY_ADDRESS } from '@/lib/web3';

interface AdminMarket {
  id: number;
  contract_address: string;
  name: string;
  description: string;
  category: string;
  lng: number;
  lat: number;
  end_time: number;
  resolution_time: number;
  resolved: boolean;
  outcome: boolean | null;
  created_at: string;
}

export default function AdminPanel() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { writeContractAsync } = useWriteContract();
  const [markets, setMarkets] = useState<AdminMarket[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/markets')
      .then((r) => r.json())
      .then((data: any) => {
        if (data.features) {
          setMarkets(data.features.map((f: any) => f.properties));
        }
      })
      .catch(console.error);
  }, []);

  const handleResolve = async (m: AdminMarket, outcome: boolean) => {
    setLoading(true);
    setMsg('');
    try {
      await writeContractAsync({
        abi: MarketFactoryABI,
        address: MARKET_FACTORY_ADDRESS,
        functionName: 'resolveMarket',
        args: [m.contract_address as `0x${string}`, outcome],
      });

      const res = await fetch(`/api/markets/${m.id}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome }),
      });

      if (res.ok) {
        const updated = await res.json();
        setMarkets((prev) =>
          prev.map((x) => (x.id === updated.id ? { ...x, resolved: true, outcome: updated.outcome } : x))
        );
        setMsg(`Market "${m.name}" resolved as ${outcome ? 'YES' : 'NO'}`);
      } else {
        setMsg('Failed to update DB');
      }
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24, color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Admin Panel</h1>

      <div style={{ marginBottom: 20 }}>
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: '#22c55e', fontSize: 13 }}>{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            <button onClick={() => disconnect()} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>Disconnect</button>
          </div>
        ) : (
          <button onClick={() => connect({ connector: injected() })} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
            Connect as Admin (Factory Owner)
          </button>
        )}
      </div>

      {msg && (
        <div style={{ padding: 12, background: '#16213e', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
          {msg}
        </div>
      )}

      {markets.length === 0 && (
        <div style={{ color: '#64748b', fontSize: 14 }}>No markets found.</div>
      )}

      {markets.map((m) => (
        <div
          key={m.id}
          style={{
            background: '#16213e', borderRadius: 8, padding: 16, marginBottom: 12,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{m.name}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {m.contract_address.slice(0, 10)}... | {m.category} |{' '}
              {m.resolved
                ? `Resolved: ${m.outcome ? 'YES' : 'NO'}`
                : 'Active'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!m.resolved && isConnected && Date.now() / 1000 >= m.resolution_time && (
              <>
                <button
                  onClick={() => handleResolve(m, true)}
                  disabled={loading}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: '#22c55e', color: '#fff', fontWeight: 500, fontSize: 12,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  Resolve YES
                </button>
                <button
                  onClick={() => handleResolve(m, false)}
                  disabled={loading}
                  style={{
                    padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: '#ef4444', color: '#fff', fontWeight: 500, fontSize: 12,
                    opacity: loading ? 0.6 : 1,
                  }}
                >
                  Resolve NO
                </button>
              </>
            )}
            {m.resolved && (
              <span style={{ color: '#64748b', fontSize: 12 }}>Resolved</span>
            )}
            {!m.resolved && isConnected && Date.now() / 1000 < m.resolution_time && (
              <span style={{ color: '#64748b', fontSize: 12 }}>
                Resolvable after {new Date(m.resolution_time * 1000).toLocaleDateString()}
              </span>
            )}
            {!isConnected && (
              <span style={{ color: '#64748b', fontSize: 12 }}>Connect wallet</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
