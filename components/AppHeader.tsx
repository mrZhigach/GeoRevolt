'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  Map,
  BarChart3,
  Wallet,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV_ITEMS = [
  { href: '/', label: 'Map', icon: Map },
  { href: '/admin', label: 'Admin', icon: BarChart3 },
] as const;

export default function AppHeader() {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  // Hide header on the main map page (it has its own controls)
  if (pathname === '/') return null;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-4 sm:px-6 gap-4 max-w-7xl mx-auto">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-heading text-base font-semibold text-foreground tracking-tight">
            GeoRevolt
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Wallet */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-xs">
                <Wallet className="w-3 h-3 text-primary" />
                <span className="text-primary font-medium">
                  {address?.slice(0, 4)}...{address?.slice(-3)}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => disconnect()}
                className="h-7 text-xs text-muted-foreground hover:text-destructive"
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => connect({ connector: injected() })}
              className="h-8 text-xs"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Connect
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
