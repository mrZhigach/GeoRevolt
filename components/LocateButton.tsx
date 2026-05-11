'use client';

import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LocateButtonProps {
  onLocate: (lng: number, lat: number) => void;
}

export default function LocateButton({ onLocate }: LocateButtonProps) {
  const [locating, setLocating] = useState(false);

  const handleLocate = () => {
    if (!navigator.geolocation) {
      console.warn('Geolocation not supported');
      return;
    }

    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onLocate(pos.coords.longitude, pos.coords.latitude);
        setLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={handleLocate}
      disabled={locating}
      aria-label="Locate me"
      title="Find my location"
      className={cn(
        'rounded-xl p-2.5 glass shadow-lg',
        'text-muted-foreground hover:text-foreground transition-colors',
        'disabled:opacity-60 disabled:cursor-not-allowed'
      )}
    >
      <Crosshair className={cn('w-5 h-5', locating && 'animate-spin')} />
    </button>
  );
}
