import type { Metadata } from 'next';
import './globals.css';
import Web3Provider from '@/components/Web3Provider';

export const metadata: Metadata = {
  title: 'GeoRevolt',
  description: 'Decentralized prediction markets on an interactive map',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
