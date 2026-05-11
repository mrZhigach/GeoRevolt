'use client';

import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import MarketsList from '@/components/MarketsList';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

function HomeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const view = searchParams.get('view') || 'map';
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only render the active view on client to avoid hydration mismatch
  if (!mounted) {
    return (
      <main className="w-full h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </main>
    );
  }

  if (view === 'list') {
    return (
      <main className="min-h-screen bg-background pt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <MarketsList />
        </div>
      </main>
    );
  }

  // Default: map view
  return (
    <main style={{ width: '100vw', height: '100vh' }}>
      <Map />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="w-full h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
