import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { liveQuery } from 'dexie';
import { db, now, uid } from '../db/database';
import type { CustomPageFormat } from '../types/customPageFormats';
import { normalizePortraitDimensions } from '../utils/pageLayout';

interface PageFormatContextValue {
  customPageFormats: CustomPageFormat[];
  customPageFormatMap: Map<string, CustomPageFormat>;
  saveFormat: (name: string, widthMm: number, heightMm: number) => Promise<CustomPageFormat>;
  deleteFormat: (id: string) => Promise<void>;
}

const PageFormatContext = createContext<PageFormatContextValue | null>(null);

export function PageFormatProvider({ children }: { children: ReactNode }) {
  const [customPageFormats, setCustomPageFormats] = useState<CustomPageFormat[]>([]);

  useEffect(() => {
    const sub = liveQuery(() => db.customPageFormats.orderBy('name').toArray()).subscribe({
      next: setCustomPageFormats,
      error: (err) => console.error(err),
    });
    return () => sub.unsubscribe();
  }, []);

  const customPageFormatMap = useMemo(
    () => new Map(customPageFormats.map((f) => [f.id, f])),
    [customPageFormats],
  );

  const saveFormat = useCallback(async (name: string, widthMm: number, heightMm: number) => {
    const normalized = normalizePortraitDimensions(widthMm, heightMm);
    const ts = now();
    const format: CustomPageFormat = {
      id: uid('fmt'),
      name: name.trim() || 'Format personnalisé',
      ...normalized,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.customPageFormats.add(format);
    return format;
  }, []);

  const deleteFormat = useCallback(async (id: string) => {
    await db.customPageFormats.delete(id);
  }, []);

  const value = useMemo(
    () => ({
      customPageFormats,
      customPageFormatMap,
      saveFormat,
      deleteFormat,
    }),
    [customPageFormats, customPageFormatMap, saveFormat, deleteFormat],
  );

  return <PageFormatContext.Provider value={value}>{children}</PageFormatContext.Provider>;
}

export function usePageFormats(): PageFormatContextValue {
  const ctx = useContext(PageFormatContext);
  if (!ctx) {
    return {
      customPageFormats: [],
      customPageFormatMap: new Map(),
      saveFormat: async () => {
        throw new Error('PageFormatProvider manquant');
      },
      deleteFormat: async () => {
        throw new Error('PageFormatProvider manquant');
      },
    };
  }
  return ctx;
}
