import { useEffect, useState } from 'react';
import type { ViewMode } from '../components/ViewModeToggle';

export function loadViewMode(storageKey: string, fallback: ViewMode = 'grid'): ViewMode {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {
    /* ignore */
  }
  return fallback;
}

export function usePersistedViewMode(
  storageKey: string,
  fallback: ViewMode = 'grid',
): [ViewMode, (mode: ViewMode) => void] {
  const [viewMode, setViewMode] = useState<ViewMode>(() => loadViewMode(storageKey, fallback));

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, viewMode);
    } catch {
      /* ignore */
    }
  }, [storageKey, viewMode]);

  return [viewMode, setViewMode];
}
