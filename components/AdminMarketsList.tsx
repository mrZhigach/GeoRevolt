'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
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
  liquidity: number;
  simulated: boolean;
  created_at: string;
}

interface PageData {
  markets: AdminMarket[];
  total: number;
  page: number;
  limit: number;
}

export default function AdminMarketsList() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<number | null>(null);
  const [msg, setMsg] = useState('');

  const [status, setStatus] = useState<string>('');
  const [category, setCategory] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const fetchMarkets = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (category) params.set('category', category);
    if (search) params.set('search', search);
    params.set('page', String(page));
    params.set('limit', '10');

    fetch(`/api/admin/markets?${params.toString()}`)
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [status, category, search, page]);

  useEffect(() => { fetchMarkets(); }, [fetchMarkets]);

  const handleResolve = async (m: AdminMarket, outcome: boolean) => {
    if (!isConnected) { setMsg('Connect wallet first'); return; }
    setResolving(m.id);
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
        setMsg(`"${m.name}" resolved as ${outcome ? 'YES' : 'NO'}`);
        fetchMarkets();
      } else {
        setMsg('Failed to update DB');
      }
    } catch (e: any) {
      setMsg(e?.shortMessage || e?.message || 'Transaction failed');
    } finally {
      setResolving(null);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1;

  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, color: '#94a3b8' }}>Markets ({data?.total ?? '...'})</h2>

      {msg && (
        <div style={{ padding: 12, background: '#16213e', borderRadius: 8, marginBottom: 12, fontSize: 13 }}>{msg}</div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13 }}>
          <option value="">All Categories</option>
          <option value="general">General</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="economics">Economics</option>
          <option value="technology">Technology</option>
        </select>
        <input
          type="text" placeholder="Search by name..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', borderRadius: 6, padding: '8px 12px', fontSize: 13, flex: 1, minWidth: 150 }}
        />
      </div>

      {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: 20 }}>Loading...</div>}

      {data && !loading && (
        <div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155', color: '#64748b' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Name</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Category</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px' }}>Status</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Liquidity</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px' }}>Deadline</th>
                  <th style={{ textAlign: 'center', padding: '8px 12px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.markets.map((m) => (
                  <tr key={m.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{m.simulated ? 'simulated' : m.contract_address.slice(0, 10)}...</div>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#94a3b8' }}>{m.category}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 11,
                        background: m.resolved ? '#854d0e' : m.end_time * 1000 < Date.now() ? '#451a03' : '#166534',
                        color: m.resolved ? '#fef08a' : '#bbf7d0',
                      }}>
                        {m.resolved ? (m.outcome ? 'YES' : 'NO') : m.end_time * 1000 < Date.now() ? 'Closed' : 'Open'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#22c55e' }}>${m.liquidity.toFixed(2)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontSize: 11 }}>
                      {new Date(m.end_time * 1000).toLocaleDateString()}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {!m.resolved && isConnected && Date.now() / 1000 >= m.resolution_time && (
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                          <button onClick={() => handleResolve(m, true)} disabled={resolving === m.id}
                            style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#22c55e', color: '#fff', fontSize: 11, fontWeight: 500, opacity: resolving === m.id ? 0.6 : 1 }}>
                            YES
                          </button>
                          <button onClick={() => handleResolve(m, false)} disabled={resolving === m.id}
                            style={{ padding: '4px 10px', borderRadius: 4, border: 'none', cursor: 'pointer', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 500, opacity: resolving === m.id ? 0.6 : 1 }}>
                            NO
                          </button>
                        </div>
                      )}
                      {!m.resolved && (!isConnected || Date.now() / 1000 < m.resolution_time) && (
                        <span style={{ color: '#64748b', fontSize: 11 }}>
                          {!isConnected ? 'Connect wallet' : new Date(m.resolution_time * 1000).toLocaleDateString()}
                        </span>
                      )}
                      {m.resolved && <span style={{ color: '#64748b', fontSize: 11 }}>Done</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.markets.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 }}>No markets found</div>
          )}

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: page <= 1 ? '#475569' : '#e2e8f0', cursor: page <= 1 ? 'default' : 'pointer', fontSize: 12 }}>
              Previous
            </button>
            <span style={{ color: '#64748b', fontSize: 12, padding: '6px 8px' }}>
              Page {data.page} of {Math.max(1, totalPages)}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #334155', background: '#0f172a', color: page >= totalPages ? '#475569' : '#e2e8f0', cursor: page >= totalPages ? 'default' : 'pointer', fontSize: 12 }}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
