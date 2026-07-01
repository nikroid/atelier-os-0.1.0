import type { CustomFont, CustomFontBackup, FontFileFormat } from '../types/customFonts';
import type { BuiltinFontFamily, DocBlock, DocTemplate, FontFamily } from '../types/templates';
import { BUILTIN_FONT_FAMILIES, buildGoogleFontsStylesheetUrl, getGoogleFont } from './googleFontCatalog';

/** Taille de corps par défaut pour l'impression (pt). */
export const DEFAULT_FONT_SIZE_PT = 11;

export const FONT_SIZE_PT_MIN = 4;
export const FONT_SIZE_PT_MAX = 96;

export function formatFontSizePt(size?: number): string {
  const pt = size ?? DEFAULT_FONT_SIZE_PT;
  return `${pt}pt`;
}

export function parseFontSizePt(raw: string, fallback = DEFAULT_FONT_SIZE_PT): number {
  const value = parseFloat(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(FONT_SIZE_PT_MAX, Math.max(FONT_SIZE_PT_MIN, value));
}

/** @deprecated Utiliser BUILTIN_FONT_FAMILIES depuis googleFontCatalog. */
export const FONT_FAMILIES = BUILTIN_FONT_FAMILIES;

export function isBuiltinFontFamily(value: string): value is BuiltinFontFamily {
  return value === 'serif' || value === 'sans' || value === 'mono';
}

export function isGoogleFontRef(value: string): value is `google:${string}` {
  return value.startsWith('google:');
}

export function isCustomFontRef(value: string): value is `custom:${string}` {
  return value.startsWith('custom:');
}

export function parseGoogleFontId(ref: string): string | undefined {
  return isGoogleFontRef(ref) ? ref.slice('google:'.length) : undefined;
}

export function parseCustomFontId(ref: string): string | undefined {
  return isCustomFontRef(ref) ? ref.slice('custom:'.length) : undefined;
}

export function detectFontFormat(filename: string): FontFileFormat | null {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'woff2') return 'woff2';
  if (ext === 'woff') return 'woff';
  if (ext === 'ttf') return 'truetype';
  if (ext === 'otf') return 'opentype';
  return null;
}

export function fontFormatMime(format: FontFileFormat): string {
  switch (format) {
    case 'woff2':
      return 'font/woff2';
    case 'woff':
      return 'font/woff';
    case 'truetype':
      return 'font/ttf';
    case 'opentype':
      return 'font/otf';
  }
}

export function sanitizeFontFamilyName(name: string): string {
  return name.replace(/['"]/g, '').trim().slice(0, 80) || 'Police importée';
}

export function defaultFamilyNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
  return sanitizeFontFamilyName(base || 'Police importée');
}

export function resolveFontFamilyCss(
  family: FontFamily | undefined,
  customFonts: Map<string, CustomFont>,
): string {
  if (!family || isBuiltinFontFamily(family)) {
    return BUILTIN_FONT_FAMILIES.find((f) => f.value === family)?.css ?? BUILTIN_FONT_FAMILIES[0].css;
  }
  if (isGoogleFontRef(family)) {
    const id = parseGoogleFontId(family);
    const entry = id ? getGoogleFont(id) : undefined;
    if (entry) return `'${entry.cssFamily}', ${entry.category}`;
  }
  if (isCustomFontRef(family)) {
    const id = parseCustomFontId(family);
    const custom = id ? customFonts.get(id) : undefined;
    if (custom) return `'${custom.familyName}', sans-serif`;
  }
  return BUILTIN_FONT_FAMILIES[0].css;
}

/** Rétrocompat — préférer resolveFontFamilyCss avec le registre custom. */
export function fontFamilyCss(family?: FontFamily): string {
  return resolveFontFamilyCss(family, new Map());
}

export function collectFontRefsFromRoot(root: DocBlock): Set<string> {
  const refs = new Set<string>();
  collectFontRefsFromBlock(root, refs);
  return refs;
}

export function collectFontRefsFromBlock(block: DocBlock, out: Set<string>): void {
  if (block.fontFamily) out.add(block.fontFamily);
  block.children?.forEach((child) => collectFontRefsFromBlock(child, out));
}

export function collectFontRefsFromTemplate(template: DocTemplate): Set<string> {
  const refs = new Set<string>();
  for (const page of template.pages ?? []) {
    if (page.root) collectFontRefsFromBlock(page.root, refs);
  }
  return refs;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function customFontToBackup(font: CustomFont): CustomFontBackup {
  return {
    id: font.id,
    name: font.name,
    familyName: font.familyName,
    format: font.format,
    dataBase64: arrayBufferToBase64(font.data),
    createdAt: font.createdAt,
    updatedAt: font.updatedAt,
  };
}

export function customFontFromBackup(backup: CustomFontBackup): CustomFont {
  return {
    id: backup.id,
    name: backup.name,
    familyName: backup.familyName,
    format: backup.format,
    data: base64ToArrayBuffer(backup.dataBase64),
    createdAt: backup.createdAt,
    updatedAt: backup.updatedAt,
  };
}

const customBlobUrls = new Map<string, string>();
const loadedGoogleFontIds = new Set<string>();

export function resetFontRegistryForTests(): void {
  customBlobUrls.forEach((url) => URL.revokeObjectURL(url));
  customBlobUrls.clear();
  loadedGoogleFontIds.clear();
  document.getElementById('atelier-google-fonts')?.remove();
}

export function createCustomFontBlobUrl(font: CustomFont): string {
  const existing = customBlobUrls.get(font.id);
  if (existing) return existing;
  const blob = new Blob([font.data], { type: fontFormatMime(font.format) });
  const url = URL.createObjectURL(blob);
  customBlobUrls.set(font.id, url);
  return url;
}

export function revokeCustomFontBlobUrl(fontId: string): void {
  const url = customBlobUrls.get(fontId);
  if (url) {
    URL.revokeObjectURL(url);
    customBlobUrls.delete(fontId);
  }
}

export async function registerCustomFontFace(font: CustomFont): Promise<void> {
  const url = createCustomFontBlobUrl(font);
  const face = new FontFace(font.familyName, `url(${url}) format('${font.format}')`);
  await face.load();
  document.fonts.add(face);
}

export async function ensureGoogleFontsLoaded(fontIds: string[]): Promise<void> {
  const toLoad = fontIds.filter((id) => getGoogleFont(id) && !loadedGoogleFontIds.has(id));
  if (toLoad.length === 0) return;

  toLoad.forEach((id) => loadedGoogleFontIds.add(id));
  const url = buildGoogleFontsStylesheetUrl([...loadedGoogleFontIds]);
  if (!url) return;

  let link = document.getElementById('atelier-google-fonts') as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.id = 'atelier-google-fonts';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }

  if (link.href === url) {
    await document.fonts.ready;
    return;
  }

  await new Promise<void>((resolve, reject) => {
    link!.onload = () => resolve();
    link!.onerror = () => reject(new Error('Échec du chargement Google Fonts'));
    link!.href = url;
  });
  await document.fonts.ready;
}

export async function ensureFontRefsLoaded(
  refs: Iterable<string>,
  customFonts: Map<string, CustomFont>,
): Promise<void> {
  const googleIds: string[] = [];
  const customToRegister: CustomFont[] = [];

  for (const ref of refs) {
    if (isGoogleFontRef(ref)) {
      const id = parseGoogleFontId(ref);
      if (id) googleIds.push(id);
    } else if (isCustomFontRef(ref)) {
      const id = parseCustomFontId(ref);
      const font = id ? customFonts.get(id) : undefined;
      if (font) customToRegister.push(font);
    }
  }

  await ensureGoogleFontsLoaded(googleIds);
  await Promise.all(customToRegister.map((f) => registerCustomFontFace(f)));
  await document.fonts.ready;
}

export async function parseCustomFontFile(
  file: File,
  displayName?: string,
): Promise<Pick<CustomFont, 'name' | 'familyName' | 'format' | 'data'>> {
  const format = detectFontFormat(file.name);
  if (!format) throw new Error('Format non supporté. Utilisez .woff2, .woff, .ttf ou .otf.');

  const familyName = sanitizeFontFamilyName(displayName ?? defaultFamilyNameFromFilename(file.name));
  const data = await file.arrayBuffer();

  return { name: familyName, familyName, format, data };
}
