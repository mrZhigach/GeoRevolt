'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Wallet, LogOut, Shield, Globe, Upload, LayoutDashboard, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminDashboard from '@/components/AdminDashboard';
import AdminMarketsList from '@/components/AdminMarketsList';
import AdminBatchUpload from '@/components/AdminBatchUpload';
import AdminAllowedCountries from '@/components/AdminAllowedCountries';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';

const TABS_CONFIG = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'markets', label: 'Markets', icon: List },
  { key: 'batch', label: 'Batch Upload', icon: Upload },
  { key: 'countries', label: 'Allowed Countries', icon: Globe },
];

export default function AdminPage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const isAdmin = !ADMIN_WALLET || (address && address.toLowerCase() === ADMIN_WALLET.toLowerCase());

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-heading font-semibold text-foreground">Admin Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-0.5">Manage prediction markets and platform settings</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {mounted && (
              isConnected ? (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                    <Wallet className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-primary font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                    <Badge variant={isAdmin ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                      {isAdmin ? 'admin' : 'user'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => disconnect()}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Disconnect
                  </Button>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => connect({ connector: injected() })}
                  className="h-9"
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet
                </Button>
              )
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-transparent border-b border-border/40 rounded-none p-0 h-auto mb-6" variant="line">
            {TABS_CONFIG.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.key}
                  value={tab.key}
                  className="rounded-none border-b-2 border-transparent data-active:border-primary data-active:bg-transparent px-4 py-2.5 text-sm gap-2"
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="dashboard" className="mt-0">
            <AdminDashboard />
          </TabsContent>
          <TabsContent value="markets" className="mt-0">
            <AdminMarketsList />
          </TabsContent>
          <TabsContent value="batch" className="mt-0">
            <AdminBatchUpload />
          </TabsContent>
          <TabsContent value="countries" className="mt-0">
            <AdminAllowedCountries />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
