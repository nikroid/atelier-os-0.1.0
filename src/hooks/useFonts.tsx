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
import type { CustomFont } from '../types/customFonts';
import type { FontFamily } from '../types/templates';
import { getGoogleFontCatalogSorted, googleFontRef } from '../utils/googleFontCatalog';
import {
  ensureFontRefsLoaded,
  parseCustomFontFile,
  registerCustomFontFace,
  resolveFontFamilyCss,
  revokeCustomFontBlobUrl,
} from '../utils/fontRegistry';
import { BUILTIN_FONT_FAMILIES } from '../utils/googleFontCatalog';

export interface FontOption {
  value: FontFamily;
  label: string;
  group: 'builtin' | 'google' | 'custom';
  previewCss?: string;
}

interface FontContextValue {
  customFonts: CustomFont[];
  customFontMap: Map<string, CustomFont>;
  fontOptions: FontOption[];
  resolveCss: (family?: FontFamily) => string;
  ensureLoaded: (refs: Iterable<string>) => Promise<void>;
  importFont: (file: File, displayName?: string) => Promise<CustomFont>;
  deleteFont: (id: string) => Promise<void>;
}

const FontContext = createContext<FontContextValue | null>(null);

export function FontProvider({ children }: { children: ReactNode }) {
  const [customFonts, setCustomFonts] = useState<CustomFont[]>([]);

  useEffect(() => {
    const sub = liveQuery(() => db.customFonts.orderBy('name').toArray()).subscribe({
      next: setCustomFonts,
      error: (err) => console.error(err),
    });
    return () => sub.unsubscribe();
  }, []);

  const customFontMap = useMemo(
    () => new Map(customFonts.map((f) => [f.id, f])),
    [customFonts],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (const font of customFonts) {
        if (cancelled) return;
        try {
          await registerCustomFontFace(font);
        } catch (err) {
          console.warn('Police custom non chargée:', font.name, err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customFonts]);

  const fontOptions = useMemo<FontOption[]>(() => {
    const builtin: FontOption[] = BUILTIN_FONT_FAMILIES.map((f) => ({
      value: f.value,
      label: f.label,
      group: 'builtin',
      previewCss: f.css,
    }));
    const google: FontOption[] = getGoogleFontCatalogSorted().map((f) => ({
      value: googleFontRef(f.id),
      label: f.label,
      group: 'google',
      previewCss: `'${f.cssFamily}', ${f.category}`,
    }));
    const custom: FontOption[] = customFonts.map((f) => ({
      value: `custom:${f.id}` as FontFamily,
      label: f.name,
      group: 'custom',
      previewCss: `'${f.familyName}', sans-serif`,
    }));
    return [...builtin, ...google, ...custom];
  }, [customFonts]);

  const resolveCss = useCallback(
    (family?: FontFamily) => resolveFontFamilyCss(family, customFontMap),
    [customFontMap],
  );

  const ensureLoaded = useCallback(
    async (refs: Iterable<string>) => ensureFontRefsLoaded(refs, customFontMap),
    [customFontMap],
  );

  const importFont = useCallback(async (file: File, displayName?: string) => {
    const parsed = await parseCustomFontFile(file, displayName);
    const ts = now();
    const font: CustomFont = {
      id: uid('font'),
      ...parsed,
      createdAt: ts,
      updatedAt: ts,
    };
    await db.customFonts.add(font);
    await registerCustomFontFace(font);
    return font;
  }, []);

  const deleteFont = useCallback(async (id: string) => {
    revokeCustomFontBlobUrl(id);
    await db.customFonts.delete(id);
  }, []);

  const value = useMemo<FontContextValue>(
    () => ({
      customFonts,
      customFontMap,
      fontOptions,
      resolveCss,
      ensureLoaded,
      importFont,
      deleteFont,
    }),
    [customFonts, customFontMap, fontOptions, resolveCss, ensureLoaded, importFont, deleteFont],
  );

  return <FontContext.Provider value={value}>{children}</FontContext.Provider>;
}

export function useFonts(): FontContextValue {
  const ctx = useContext(FontContext);
  if (!ctx) {
    throw new Error('useFonts doit être utilisé dans FontProvider');
  }
  return ctx;
}

/** Hook tolérant hors provider (ex. tests) — retombe sur les polices classiques. */
export function useFontsOptional(): FontContextValue {
  const ctx = useContext(FontContext);
  const fallback = useMemo<FontContextValue>(
    () => ({
      customFonts: [],
      customFontMap: new Map(),
      fontOptions: [
        ...BUILTIN_FONT_FAMILIES.map((f) => ({
          value: f.value,
          label: f.label,
          group: 'builtin' as const,
          previewCss: f.css,
        })),
        ...getGoogleFontCatalogSorted().map((f) => ({
          value: googleFontRef(f.id),
          label: f.label,
          group: 'google' as const,
          previewCss: `'${f.cssFamily}', ${f.category}`,
        })),
      ],
      resolveCss: (family) => resolveFontFamilyCss(family, new Map()),
      ensureLoaded: async () => {},
      importFont: async () => {
        throw new Error('FontProvider requis');
      },
      deleteFont: async () => {
        throw new Error('FontProvider requis');
      },
    }),
    [],
  );
  return ctx ?? fallback;
}
