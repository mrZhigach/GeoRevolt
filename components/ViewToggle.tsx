'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Map, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// ViewToggle — switches between map view and list view via URL
// ---------------------------------------------------------------------------

export type ViewMode = 'map' | 'list';

interface ViewToggleProps {
  /** Optional overrides for controlled mode */
  view?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
}

export default function ViewToggle({ view: controlledView, onViewChange }: ViewToggleProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const currentView: ViewMode =
    controlledView || (searchParams.get('view') as ViewMode) || 'map';

  const setView = (view: ViewMode) => {
    if (controlledView && onViewChange) {
      onViewChange(view);
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (view === 'map') {
      params.delete('view');
    } else {
      params.set('view', view);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="inline-flex items-center rounded-lg bg-muted p-0.5 gap-0.5" role="tablist">
      <button
        role="tab"
        aria-selected={currentView === 'map'}
        onClick={() => setView('map')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
          currentView === 'map'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Map className="w-3.5 h-3.5" />
        <span>Map</span>
      </button>
      <button
        role="tab"
        aria-selected={currentView === 'list'}
        onClick={() => setView('list')}
        className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
          currentView === 'list'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <LayoutList className="w-3.5 h-3.5" />
        <span>List</span>
      </button>
    </div>
  );
}
