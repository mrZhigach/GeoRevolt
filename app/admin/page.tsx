'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import AdminDashboard from '@/components/AdminDashboard';
import AdminMarketsList from '@/components/AdminMarketsList';
import AdminBatchUpload from '@/components/AdminBatchUpload';
import AdminAllowedCountries from '@/components/AdminAllowedCountries';

const ADMIN_WALLET = process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS || '';

const TABS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'markets', label: 'Markets' },
  { key: 'batch', label: 'Batch Upload' },
  { key: 'countries', label: 'Allowed Countries' },
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
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24, color: '#e2e8f0', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', background: '#0f172a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: 0 }}>Admin Dashboard</h1>
        <div>
          {!mounted ? (
            <span style={{ fontSize: 12, color: '#64748b' }}>...</span>
          ) : isConnected ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ color: isAdmin ? '#22c55e' : '#ef4444', fontSize: 12 }}>
                {address?.slice(0, 6)}...{address?.slice(-4)} {isAdmin ? '(admin)' : '(not admin)'}
              </span>
              <button onClick={() => disconnect()} style={{ background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}>
                Disconnect
              </button>
            </div>
          ) : (
            <button onClick={() => connect({ connector: injected() })} style={{ background: '#6366f1', border: 'none', color: '#fff', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #1e293b', paddingBottom: 0 }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: activeTab === tab.key ? '#1e293b' : 'transparent',
              color: activeTab === tab.key ? '#e2e8f0' : '#64748b',
              borderRadius: '8px 8px 0 0', borderBottom: activeTab === tab.key ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.2s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <AdminDashboard />}
      {activeTab === 'markets' && <AdminMarketsList />}
      {activeTab === 'batch' && <AdminBatchUpload />}
      {activeTab === 'countries' && <AdminAllowedCountries />}
    </div>
  );
}
