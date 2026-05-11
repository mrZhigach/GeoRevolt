'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect, useBalance } from 'wagmi';
import { injected } from 'wagmi/connectors';
import {
  Globe,
  Map,
  LayoutList,
  BarChart3,
  Wallet,
  Menu,
  Search,
  Moon,
  Sun,
  ChevronDown,
  LogOut,
  User,
  Settings,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';

// ---------------------------------------------------------------------------
// Navigation items
// ---------------------------------------------------------------------------
const NAV_ITEMS = [
  { href: '/', label: 'Map', icon: Map },
  { href: '/?view=list', label: 'Markets List', icon: LayoutList },
  { href: '/admin', label: 'Admin', icon: BarChart3 },
] as const;

const MOBILE_NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutList },
  { href: '/?view=map', label: 'Map', icon: Map },
  { href: '/?view=list', label: 'Markets List', icon: LayoutList },
  { href: '/admin', label: 'Admin', icon: BarChart3 },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Theme = 'dark' | 'light';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });

  // Theme state (default: dark)
  const [theme, setTheme] = useState<Theme>('dark');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Restore theme from localStorage
    const saved = localStorage.getItem('georevolt-theme') as Theme | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light', saved === 'light');
    }
  }, []);

  // Header is always visible in Sprint 8

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('georevolt-theme', next);
    document.documentElement.classList.toggle('light', next === 'light');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  const formatAddress = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-3)}`;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/60">
      <div className="flex h-14 items-center px-3 sm:px-6 gap-2 sm:gap-4 max-w-7xl mx-auto">
        {/* ---- Hamburger (mobile) ---- */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger className="md:hidden inline-flex items-center justify-center h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] sm:w-[320px]">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 font-heading">
                <Globe className="w-5 h-5 text-primary" />
                GeoRevolt
              </SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {MOBILE_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 ${
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
              <hr className="my-2 border-border/40" />
              {/* Wallet info in mobile menu */}
              <div className="px-4 py-2">
                {isConnected ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Wallet className="w-4 h-4 text-primary" />
                    <span>{formatAddress(address || '')}</span>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      connect({ connector: injected() });
                      setMobileMenuOpen(false);
                    }}
                  >
                    <Wallet className="w-4 h-4 mr-2" />
                    Connect Wallet
                  </Button>
                )}
              </div>
            </nav>
          </SheetContent>
        </Sheet>

        {/* ---- Brand ---- */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-heading text-base font-semibold text-foreground tracking-tight hidden sm:block">
            GeoRevolt
          </span>
          <span className="font-heading text-base font-semibold text-foreground tracking-tight sm:hidden">
            GR
          </span>
        </Link>

        {/* ---- Desktop Navigation ---- */}
        <nav className="hidden md:flex items-center gap-1">
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

        {/* ---- Spacer ---- */}
        <div className="flex-1" />

        {/* ---- Global Search (desktop) ---- */}
        <form onSubmit={handleSearch} className="hidden sm:block relative max-w-[200px] lg:max-w-[280px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs bg-background/60 border-border/50 placeholder:text-muted-foreground/60 w-full"
          />
        </form>

        {/* ---- Right-side controls ---- */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-muted-foreground" />
            ) : (
              <Moon className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>

          {/* Language Selector (stub) */}
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden sm:inline-flex items-center justify-center h-8 px-2 text-xs gap-1 text-muted-foreground rounded-lg hover:text-foreground hover:bg-muted/50 transition-colors">
              EN
              <ChevronDown className="w-3 h-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>🇬🇧 English</DropdownMenuItem>
              <DropdownMenuItem disabled>🇷🇺 Русский</DropdownMenuItem>
              <DropdownMenuItem disabled>🇪🇸 Español</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-muted-foreground text-xs">
                More languages coming soon
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Wallet / Profile */}
          {mounted && (
            isConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center justify-center h-8 gap-1.5 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20">
                    <Wallet className="w-3 h-3 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      {formatAddress(address || '')}
                    </span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="gap-2" disabled>
                    <User className="w-4 h-4" />
                    <span className="text-xs text-muted-foreground">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </DropdownMenuItem>
                  {balanceData && (
                    <DropdownMenuItem className="gap-2 text-xs" disabled>
                      <Wallet className="w-4 h-4" />
                      {parseFloat(balanceData.formatted).toFixed(4)} {balanceData.symbol}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="gap-2 text-destructive focus:text-destructive"
                    onClick={() => disconnect()}
                  >
                    <LogOut className="w-4 h-4" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                size="sm"
                onClick={() => connect({ connector: injected() })}
                className="h-8 text-xs"
              >
                <Wallet className="w-3.5 h-3.5 mr-1.5" />
                <span className="hidden sm:inline">Connect</span>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
