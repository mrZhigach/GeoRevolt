'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAccount, useReadContract, useWriteContract } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { MarketABI, MOCK_USDC_ADDRESS } from '@/lib/web3';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import Link from 'next/link';

interface MarketData {
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
  created_at: string;
}

interface PricePoint {
  timestamp: number;
  price_yes: number;
  price_no: number;
  liquidity: number | null;
}

export default function MarketDetailPage() {
  const params = useParams();
  const address = params.address as string;
  const { address: userAddress, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [market, setMarket] = useState<MarketData | null>(null);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [usdcAmount, setUsdcAmount] = useState('');
  const [buySide, setBuySide] = useState<'yes' | 'no'>('yes');
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);

  const marketAddr = address as `0x${string}`;

  const { data: reserveUSDC } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveUSDC', query: { enabled: !!address } });
  const { data: reserveYES } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveYES', query: { enabled: !!address } });
  const { data: reserveNO } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveNO', query: { enabled: !!address } });
  const { data: balanceYES } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'balanceYES', args: [userAddress!], query: { enabled: !!userAddress } });
  const { data: balanceNO } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'balanceNO', args: [userAddress!], query: { enabled: !!userAddress } });
  const { data: resolved } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'resolved', query: { enabled: !!address } });

  const rUsdc = Number(reserveUSDC ?? 0n);
  const rYes = Number(reserveYES ?? 0n);
  const rNo = Number(reserveNO ?? 0n);
  const priceYes = rYes > 0 ? rUsdc / rYes : 0;
  const priceNo = rNo > 0 ? rUsdc / rNo : 0;
  const isResolved = Boolean(resolved);

  const fetchMarket = useCallback(async () => {
    try {
      const res = await fetch(`/api/markets/by-address/${address}`);
      if (res.ok) {
        const data = await res.json();
        setMarket(data);
      }
    } catch (e) {
      console.error('fetchMarket error:', e);
    }
  }, [address]);

  const fetchPriceHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/price-history/${address}`);
      if (res.ok) {
        const data = await res.json();
        setPriceHistory(data);
      }
    } catch (e) {
      console.error('fetchPriceHistory error:', e);
    }
  }, [address]);

  const saveSnapshot = useCallback(async () => {
    try {
      await fetch('/api/price-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          market_id: address,
          price_yes: priceYes,
          price_no: priceNo,
          liquidity: market?.liquidity ?? null,
        }),
      });
    } catch (e) {
      console.error('saveSnapshot error:', e);
    }
  }, [address, priceYes, priceNo, market?.liquidity]);

  useEffect(() => {
    if (address) {
      Promise.all([fetchMarket(), fetchPriceHistory()]).finally(() => setLoading(false));
    }
  }, [address, fetchMarket, fetchPriceHistory]);

  useEffect(() => {
    if (!address || !reserveUSDC || !reserveYES || !reserveNO) return;
    const interval = setInterval(() => {
      saveSnapshot();
      fetchPriceHistory();
    }, 60000);
    saveSnapshot();
    return () => clearInterval(interval);
  }, [address, reserveUSDC, reserveYES, reserveNO, saveSnapshot, fetchPriceHistory]);

  const handleBuy = async () => {
    if (!userAddress || !usdcAmount) return;
    const amount = parseUnits(usdcAmount, 6);
    if (amount <= 0n) return;

    setApproving(true);
    try {
      await writeContractAsync({
        abi: [{
          type: 'function', name: 'approve', stateMutability: 'nonpayable',
          inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
          outputs: [{ type: 'bool' }],
        }],
        address: MOCK_USDC_ADDRESS,
        functionName: 'approve',
        args: [marketAddr, amount],
      });

      await writeContractAsync({
        abi: MarketABI,
        address: marketAddr,
        functionName: 'buy',
        args: [buySide === 'yes', amount],
      });

      await saveSnapshot();
      setTimeout(fetchPriceHistory, 2000);
    } catch (e) {
      console.error('Buy failed:', e);
    } finally {
      setApproving(false);
    }
  };

  const handleSell = async (isYes: boolean) => {
    if (!userAddress) return;
    const balance = isYes ? Number(balanceYES ?? 0n) : Number(balanceNO ?? 0n);
    if (balance <= 0) return;

    try {
      await writeContractAsync({
        abi: MarketABI,
        address: marketAddr,
        functionName: 'sell',
        args: [isYes, BigInt(balance)],
      });

      await saveSnapshot();
      setTimeout(fetchPriceHistory, 2000);
    } catch (e) {
      console.error('Sell failed:', e);
    }
  };

  const chartData = [...priceHistory].reverse().map((p) => ({
    time: new Date(p.timestamp * 1000).toLocaleTimeString(),
    YES: Number(p.price_yes.toFixed(6)),
    NO: Number(p.price_no.toFixed(6)),
  }));

  if (loading) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (!market) {
    return (
      <div style={{ background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h2>Market not found</h2>
        <Link href="/" style={{ color: '#6366f1', marginTop: 12 }}>Back to map</Link>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f172a', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>
        <Link href="/" style={{ color: '#6366f1', fontSize: 14, textDecoration: 'none' }}>
          ← Back to map
        </Link>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24, marginTop: 16 }}>
          <div>
            <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{market.name}</h1>
                  <span style={{
                    display: 'inline-block', marginTop: 8, padding: '3px 10px', borderRadius: 12, fontSize: 12,
                    background: isResolved ? '#854d0e' : market.end_time * 1000 < Date.now() ? '#451a03' : '#166534',
                    color: isResolved ? '#fef08a' : '#bbf7d0',
                  }}>
                    {isResolved ? 'Resolved' : market.end_time * 1000 < Date.now() ? 'Closed' : 'Open'}
                  </span>
                  <span style={{ marginLeft: 8, padding: '3px 10px', borderRadius: 12, fontSize: 12, background: '#1e293b', color: '#94a3b8' }}>
                    {market.category}
                  </span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12, color: '#64748b' }}>
                  <div>Liquidity: ${market.liquidity.toFixed(2)}</div>
                  <div>Contract: {market.contract_address.slice(0, 10)}...</div>
                </div>
              </div>
              <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, margin: '12px 0 0' }}>{market.description}</p>
            </div>

            <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 24 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 600, color: '#94a3b8' }}>Price History</h2>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
                    <YAxis stroke="#64748b" fontSize={11} domain={[0, 'auto']} />
                    <Tooltip
                      contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="YES" stroke="#22c55e" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="NO" stroke="#ef4444" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign: 'center', padding: 40, color: '#64748b', fontSize: 14 }}>
                  No price history yet. Prices will appear as trades are made.
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, marginBottom: 16 }}>
              <h2 style={{ margin: '0 0 16px', fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Current Prices</h2>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1, background: '#16213e', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>YES Price</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>${priceYes.toFixed(4)}</div>
                </div>
                <div style={{ flex: 1, background: '#16213e', borderRadius: 8, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>NO Price</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>${priceNo.toFixed(4)}</div>
                </div>
              </div>
            </div>

            {isConnected && !isResolved && (
              <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20 }}>
                <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>Trade</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <button onClick={() => setBuySide('yes')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: buySide === 'yes' ? '#22c55e' : '#334155', color: '#fff', fontWeight: 500, fontSize: 14,
                  }}>YES</button>
                  <button onClick={() => setBuySide('no')} style={{
                    flex: 1, padding: '10px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: buySide === 'no' ? '#ef4444' : '#334155', color: '#fff', fontWeight: 500, fontSize: 14,
                  }}>NO</button>
                </div>
                <input
                  type="number"
                  placeholder="USDC amount"
                  value={usdcAmount}
                  onChange={(e) => setUsdcAmount(e.target.value)}
                  style={{
                    width: '92%', padding: '10px 12px', borderRadius: 6, border: '1px solid #334155',
                    background: '#0f172a', color: '#e2e8f0', fontSize: 14, marginBottom: 12,
                  }}
                />
                <button onClick={handleBuy} disabled={approving || !usdcAmount} style={{
                  width: '100%', padding: '10px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                  background: approving ? '#334155' : buySide === 'yes' ? '#22c55e' : '#ef4444',
                  color: '#fff', fontWeight: 500, fontSize: 14, opacity: approving || !usdcAmount ? 0.6 : 1,
                }}>
                  {approving ? 'Approving...' : `Buy ${buySide.toUpperCase()}`}
                </button>
                {(Number(balanceYES ?? 0n) > 0 || Number(balanceNO ?? 0n) > 0) && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Your Position</div>
                    {Number(balanceYES ?? 0n) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: '#22c55e' }}>YES: {formatUnits(BigInt(balanceYES as any || 0n), 6)}</span>
                        <button onClick={() => handleSell(true)} style={{
                          background: 'none', border: '1px solid #22c55e', borderRadius: 4, color: '#22c55e',
                          cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                        }}>Sell</button>
                      </div>
                    )}
                    {Number(balanceNO ?? 0n) > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#ef4444' }}>NO: {formatUnits(BigInt(balanceNO as any || 0n), 6)}</span>
                        <button onClick={() => handleSell(false)} style={{
                          background: 'none', border: '1px solid #ef4444', borderRadius: 4, color: '#ef4444',
                          cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                        }}>Sell</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {!isConnected && (
              <div style={{ background: '#1a1a2e', borderRadius: 12, padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                Connect wallet to trade
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
