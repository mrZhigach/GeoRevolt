'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { MarketABI, MOCK_USDC_ADDRESS } from '@/lib/web3';
import CommentsSection from './CommentsSection';
import dynamic from 'next/dynamic';

const PriceChart = dynamic(
  () => import('./PriceChart'),
  { ssr: false }
);

interface Props {
  market: {
    id: number;
    contract_address: string;
    name: string;
    description: string;
    category: string;
    status: string;
    address?: string | null;
  };
  onClose: () => void;
}

interface PricePoint {
  timestamp: number;
  price_yes: number;
  price_no: number;
}

export default function MarketSidebar({ market, onClose }: Props) {
  const { address, isConnected } = useAccount();
  const [usdcAmount, setUsdcAmount] = useState('');
  const [buySide, setBuySide] = useState<'yes' | 'no'>('yes');
  const [approving, setApproving] = useState(false);
  const [priceHistory, setPriceHistory] = useState<PricePoint[]>([]);
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const marketAddr = market.contract_address as `0x${string}`;

  const { data: reserveUSDC } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveUSDC' });
  const { data: reserveYES } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveYES' });
  const { data: reserveNO } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'reserveNO' });
  const { data: balanceYES } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'balanceYES', args: [address!], query: { enabled: !!address } });
  const { data: balanceNO } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'balanceNO', args: [address!], query: { enabled: !!address } });
  const { data: resolved } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'resolved' });
  const { data: outcome } = useReadContract({ abi: MarketABI, address: marketAddr, functionName: 'outcome' });

  const { writeContractAsync: writeMarket } = useWriteContract();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/price-history/${market.contract_address}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: PricePoint[]) => {
        if (Array.isArray(data)) setPriceHistory(data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [market.contract_address]);

  const rUsdc = Number(reserveUSDC ?? 0n);
  const rYes = Number(reserveYES ?? 0n);
  const rNo = Number(reserveNO ?? 0n);
  const priceYes = rYes > 0 ? rUsdc / rYes : 0;
  const priceNo = rNo > 0 ? rUsdc / rNo : 0;
  const bYes = Number(balanceYES ?? 0n);
  const bNo = Number(balanceNO ?? 0n);
  const isResolved = Boolean(resolved);

  const handleBuy = async () => {
    if (!address || !usdcAmount) return;
    const amount = parseUnits(usdcAmount, 6);
    if (amount <= 0n) return;

    setApproving(true);
    try {
      await writeMarket({
        abi: [
          {
            type: 'function',
            name: 'approve',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'spender', type: 'address' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [{ type: 'bool' }],
          },
        ],
        address: MOCK_USDC_ADDRESS,
        functionName: 'approve',
        args: [marketAddr, amount],
      });

      await writeMarket({
        abi: MarketABI,
        address: marketAddr,
        functionName: 'buy',
        args: [buySide === 'yes', amount],
      });
    } catch (e) {
      console.error('Buy failed:', e);
    } finally {
      setApproving(false);
    }
  };

  const handleSell = async (isYes: boolean) => {
    if (!address) return;
    const balance = isYes ? bYes : bNo;
    if (balance <= 0) return;

    try {
      await writeMarket({
        abi: MarketABI,
        address: marketAddr,
        functionName: 'sell',
        args: [isYes, BigInt(balance)],
      });
    } catch (e) {
      console.error('Sell failed:', e);
    }
  };

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, width: 420, height: '100%',
      background: '#1a1a2e', color: '#e2e8f0', padding: 24, boxShadow: '-4px 0 20px rgba(0,0,0,0.5)',
      overflowY: 'auto', zIndex: 30, fontFamily: 'system-ui, sans-serif',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{market.name}</h2>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            {market.category} &middot; {market.contract_address.slice(0, 14)}...
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: '#94a3b8', fontSize: 24, cursor: 'pointer', padding: '0 0 0 12px', lineHeight: 1,
        }}>×</button>
      </div>

      <div style={{ marginBottom: 12 }}>
        <span style={{
          display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 12,
          background: market.status === 'open' ? '#166534' : '#854d0e', color: '#bbf7d0',
        }}>
          {isResolved ? `Resolved (${outcome ? 'YES' : 'NO'})` : market.status}
        </span>
      </div>

      <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5, marginBottom: 8 }}>{market.description}</p>

      {market.address && (
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16, fontStyle: 'italic' }}>
          📍 {market.address}
        </div>
      )}

      {/* Price chart (client-side only) */}
      {mounted && priceHistory.length > 0 && (
        <div style={{ background: '#16213e', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Price History</div>
          <PriceChart data={priceHistory} />
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <PriceBox label="YES Price" value={priceYes.toFixed(4)} color="#22c55e" />
        <PriceBox label="NO Price" value={priceNo.toFixed(4)} color="#ef4444" />
      </div>

      {isConnected && !isResolved && (
        <div style={{ background: '#16213e', borderRadius: 8, padding: 16, marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#94a3b8' }}>Trade</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button onClick={() => setBuySide('yes')} style={{
              flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: buySide === 'yes' ? '#22c55e' : '#334155', color: '#fff', fontWeight: 500,
            }}>YES</button>
            <button onClick={() => setBuySide('no')} style={{
              flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: buySide === 'no' ? '#ef4444' : '#334155', color: '#fff', fontWeight: 500,
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
          {(bYes > 0 || bNo > 0) && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Your Position</div>
              {bYes > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: '#22c55e' }}>YES: {formatUnits(BigInt(bYes), 6)}</span>
                  <button onClick={() => handleSell(true)} style={{
                    background: 'none', border: '1px solid #22c55e', borderRadius: 4, color: '#22c55e',
                    cursor: 'pointer', padding: '2px 8px', fontSize: 11,
                  }}>Sell</button>
                </div>
              )}
              {bNo > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#ef4444' }}>NO: {formatUnits(BigInt(bNo), 6)}</span>
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
        <div style={{ padding: 16, background: '#16213e', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
          Connect wallet to trade
        </div>
      )}

      {isResolved && (
        <RedeemSection marketAddr={marketAddr} outcome={Boolean(outcome)} isYesHolder={bYes > 0} isNoHolder={bNo > 0} />
      )}

      {/* Discussions */}
      <div style={{ marginTop: 24, borderTop: '1px solid #1e293b', paddingTop: 16 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#e2e8f0', fontWeight: 600 }}>Discussions</h3>
        <CommentsSection marketAddress={market.contract_address} />
      </div>
    </div>
  );
}

function PriceBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ flex: 1, background: '#16213e', borderRadius: 8, padding: 12, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color }}>${value}</div>
    </div>
  );
}

function RedeemSection({ marketAddr, outcome, isYesHolder, isNoHolder }: {
  marketAddr: `0x${string}`;
  outcome: boolean;
  isYesHolder: boolean;
  isNoHolder: boolean;
}) {
  const { writeContractAsync } = useWriteContract();
  const canRedeem = (outcome && isYesHolder) || (!outcome && isNoHolder);

  if (!canRedeem) {
    return (
      <div style={{ padding: 16, background: '#16213e', borderRadius: 8, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
        {outcome ? 'NO' : 'YES'} tokens have no value
      </div>
    );
  }

  const handleRedeem = async () => {
    try {
      await writeContractAsync({
        abi: MarketABI,
        address: marketAddr,
        functionName: 'redeem',
      });
    } catch (e) {
      console.error('Redeem failed:', e);
    }
  };

  return (
    <div style={{ padding: 16, background: '#16213e', borderRadius: 8, marginTop: 12 }}>
      <div style={{ fontSize: 13, color: '#22c55e', marginBottom: 8, fontWeight: 500 }}>
        Market resolved — {outcome ? 'YES' : 'NO'} won
      </div>
      <button onClick={handleRedeem} style={{
        width: '100%', padding: '10px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
        background: '#22c55e', color: '#fff', fontWeight: 500, fontSize: 14,
      }}>
        Redeem Winnings
      </button>
    </div>
  );
}
