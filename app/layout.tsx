import type { Metadata } from 'next';
import { Inter, DM_Sans } from 'next/font/google';
import './globals.css';
import Web3Provider from '@/components/Web3Provider';
import AppHeader from '@/components/AppHeader';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GeoRevolt',
  description: 'Decentralized prediction markets on an interactive map',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable} dark`}>
      <body className="font-sans antialiased" style={{ margin: 0, padding: 0 }}>
        <Web3Provider>
          <AppHeader />
          {children}
        </Web3Provider>
      </body>
    </html>
  );
}
