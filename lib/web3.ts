import { http, createConfig } from 'wagmi';
import { anvil, polygonAmoy } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';
import { defineChain } from 'viem';

export const anvilChain = defineChain({
  id: 31337,
  name: 'Anvil',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: { default: { http: ['http://127.0.0.1:8545'] } },
});

export function getConfig() {
  return createConfig({
    chains: [anvilChain, polygonAmoy],
    connectors: [injected()],
    transports: {
      [anvilChain.id]: http('http://127.0.0.1:8545'),
      [polygonAmoy.id]: http('https://rpc-amoy.polygon.technology'),
    },
    ssr: true,
  });
}

export const MARKET_FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDRESS || '0x34A1D3fff3958843C43aD80F30b94c510645C316') as `0x${string}`;
export const MOCK_USDC_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || '0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519') as `0x${string}`;

import MarketABI from '@/lib/abi/Market.json';
import MockUSDCABI from '@/lib/abi/MockUSDC.json';
import MarketFactoryABI from '@/lib/abi/MarketFactory.json';

export { MarketABI, MockUSDCABI, MarketFactoryABI };
