'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWatchContractEvent } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { MarketABI, MOCK_USDC_ADDRESS } from '@/lib/web3';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
    <div className="absolute top-0 right-0 w-[380px] lg:w-[420px] h-full overflow-y-auto z-30 bg-card text-foreground p-6 shadow-2xl border-l border-border/40">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-foreground m-0">{market.name}</h2>
          <div className="text-[11px] text-muted-foreground mt-1">
            {market.category} &middot; {market.contract_address.slice(0, 14)}...
          </div>
        </div>
        <button onClick={onClose} className="bg-transparent border-none text-muted-foreground hover:text-foreground text-2xl cursor-pointer p-0 pl-3 leading-none">
          &times;
        </button>
      </div>

      <Badge variant={isResolved ? 'destructive' : 'default'} className="text-xs mb-3">
        {isResolved ? `Resolved (${outcome ? 'YES' : 'NO'})` : market.status}
      </Badge>

      <p className="text-muted-foreground text-sm leading-relaxed mb-2">{market.description}</p>

      {market.address && (
        <div className="text-[11px] text-muted-foreground mb-4 italic">
          📍 {market.address}
        </div>
      )}

      {/* Price chart (client-side only) */}
      {mounted && priceHistory.length > 0 && (
        <div className="card-glass p-3 mb-4">
          <div className="text-xs text-muted-foreground mb-2">Price History</div>
          <PriceChart data={priceHistory} />
        </div>
      )}

      <div className="flex gap-3 mb-4">
        <PriceBox label="YES Price" value={priceYes.toFixed(4)} color="#22c55e" />
        <PriceBox label="NO Price" value={priceNo.toFixed(4)} color="#ef4444" />
      </div>

      {isConnected && !isResolved && (
        <div className="card-glass p-4 mb-4">
          <h3 className="m-0 mb-3 text-sm text-muted-foreground">Trade</h3>
          <div className="flex gap-2 mb-3">
            <Button
              onClick={() => setBuySide('yes')}
              variant={buySide === 'yes' ? 'default' : 'outline'}
              className={`flex-1 ${buySide === 'yes' ? 'bg-green-600 text-white hover:bg-green-700' : ''}`}
            >
              YES
            </Button>
            <Button
              onClick={() => setBuySide('no')}
              variant={buySide === 'no' ? 'default' : 'outline'}
              className={`flex-1 ${buySide === 'no' ? 'bg-red-600 text-white hover:bg-red-700' : ''}`}
            >
              NO
            </Button>
          </div>
          <Input
            type="number"
            placeholder="USDC amount"
            value={usdcAmount}
            onChange={(e) => setUsdcAmount(e.target.value)}
            className="mb-3"
          />
          <Button
            onClick={handleBuy}
            disabled={approving || !usdcAmount}
            className={`w-full ${buySide === 'yes' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
          >
            {approving ? 'Approving...' : `Buy ${buySide.toUpperCase()}`}
          </Button>
          {(bYes > 0 || bNo > 0) && (
            <div className="mt-3">
              <div className="text-xs text-muted-foreground mb-2">Your Position</div>
              {bYes > 0 && (
                <div className="flex justify-between mb-1">
                  <span className="text-green-500">YES: {formatUnits(BigInt(bYes), 6)}</span>
                  <Button onClick={() => handleSell(true)} variant="outline" size="xs" className="border-green-600 text-green-600 hover:bg-green-600/10">
                    Sell
                  </Button>
                </div>
              )}
              {bNo > 0 && (
                <div className="flex justify-between">
                  <span className="text-red-500">NO: {formatUnits(BigInt(bNo), 6)}</span>
                  <Button onClick={() => handleSell(false)} variant="outline" size="xs" className="border-red-600 text-red-600 hover:bg-red-600/10">
                    Sell
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!isConnected && (
        <div className="card-glass p-4 text-center text-muted-foreground text-sm">
          Connect wallet to trade
        </div>
      )}

      {isResolved && (
        <RedeemSection marketAddr={marketAddr} outcome={Boolean(outcome)} isYesHolder={bYes > 0} isNoHolder={bNo > 0} />
      )}

      {/* Discussions */}
      <div className="mt-6 border-t border-border/40 pt-4">
        <h3 className="m-0 mb-3 text-sm text-foreground font-semibold">Discussions</h3>
        <CommentsSection marketAddress={market.contract_address} />
      </div>
    </div>
  );
}

function PriceBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card-glass flex-1 p-3 text-center">
      <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-bold" style={{ color }}>${value}</div>
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
      <Card className="card-glass">
        <CardContent className="text-center text-muted-foreground text-sm py-4">
          {outcome ? 'NO' : 'YES'} tokens have no value
        </CardContent>
      </Card>
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
    <Card className="card-glass">
      <CardContent className="py-4">
        <div className="text-sm text-green-500 mb-2 font-medium">
          Market resolved &mdash; {outcome ? 'YES' : 'NO'} won
        </div>
        <Button onClick={handleRedeem} className="w-full bg-green-600 hover:bg-green-700 text-white">
          Redeem Winnings
        </Button>
      </CardContent>
    </Card>
  );
}
