import type { CustomPageFormat } from '../types/customPageFormats';
import type { DocTemplate, PageFormat, PageFormatRef, PageOrientation } from '../types/templates';
import { PAGE_FORMATS } from '../types/templates';

const DIM_TOLERANCE = 0.5;

export function getPresetDimensions(
  ref: PageFormat | `custom:${string}`,
  customMap?: Map<string, CustomPageFormat>,
): { w: number; h: number; label: string } | null {
  const builtin = PAGE_FORMATS.find((f) => f.value === ref);
  if (builtin) return { w: builtin.w, h: builtin.h, label: builtin.label };
  if (typeof ref === 'string' && ref.startsWith('custom:')) {
    const id = ref.slice('custom:'.length);
    const custom = customMap?.get(id);
    if (custom) return { w: custom.widthMm, h: custom.heightMm, label: custom.name };
  }
  return null;
}

/** @deprecated Préférer getTemplatePageDimensions */
export function getPageDimensions(format: string): { w: number; h: number } {
  const found = PAGE_FORMATS.find((f) => f.value === format);
  if (found) return { w: found.w, h: found.h };
  return { w: 210, h: 297 };
}

export function getOrientation(w: number, h: number): PageOrientation {
  return w > h ? 'landscape' : 'portrait';
}

export function toggleOrientation(w: number, h: number): { w: number; h: number } {
  return { w: h, h: w };
}

export function formatAspectRatio(w: number, h: number): string {
  const min = Math.min(w, h);
  const max = Math.max(w, h);
  const ratio = max / min;
  return ratio.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
}

export function dimensionsMatch(a: number, b: number): boolean {
  return Math.abs(a - b) <= DIM_TOLERANCE;
}

export function matchesPreset(
  w: number,
  h: number,
  ref: PageFormatRef,
  customMap?: Map<string, CustomPageFormat>,
): boolean {
  if (ref === 'free') return false;
  const preset = getPresetDimensions(ref as PageFormat | `custom:${string}`, customMap);
  if (!preset) return false;
  const orientation = getOrientation(w, h);
  const pw = orientation === 'portrait' ? preset.w : preset.h;
  const ph = orientation === 'portrait' ? preset.h : preset.w;
  return dimensionsMatch(w, pw) && dimensionsMatch(h, ph);
}

export function resolveFormatRef(
  w: number,
  h: number,
  currentRef: PageFormatRef | undefined,
  customMap?: Map<string, CustomPageFormat>,
): PageFormatRef {
  if (currentRef && currentRef !== 'free' && matchesPreset(w, h, currentRef, customMap)) {
    return currentRef;
  }
  for (const f of PAGE_FORMATS) {
    if (matchesPreset(w, h, f.value, customMap)) return f.value;
  }
  if (customMap) {
    for (const [id] of customMap) {
      if (matchesPreset(w, h, `custom:${id}`, customMap)) return `custom:${id}`;
    }
  }
  return 'free';
}

export function applyPreset(
  ref: PageFormatRef,
  orientation: PageOrientation,
  customMap?: Map<string, CustomPageFormat>,
): { widthMm: number; heightMm: number; formatRef: PageFormatRef } | null {
  if (ref === 'free') return null;
  const preset = getPresetDimensions(ref as PageFormat | `custom:${string}`, customMap);
  if (!preset) return null;
  const widthMm = orientation === 'portrait' ? preset.w : preset.h;
  const heightMm = orientation === 'portrait' ? preset.h : preset.w;
  return { widthMm, heightMm, formatRef: ref };
}

export function migrateTemplatePageSize(template: DocTemplate): DocTemplate {
  if (template.widthMm != null && template.heightMm != null) {
    const formatRef =
      template.formatRef ??
      resolveFormatRef(template.widthMm, template.heightMm, template.format, undefined);
    return { ...template, formatRef };
  }
  const preset = PAGE_FORMATS.find((f) => f.value === template.format) ?? PAGE_FORMATS[0];
  return {
    ...template,
    formatRef: preset.value,
    widthMm: preset.w,
    heightMm: preset.h,
  };
}

export function getTemplatePageDimensions(
  template: Pick<DocTemplate, 'format' | 'formatRef' | 'widthMm' | 'heightMm'>,
  customMap?: Map<string, CustomPageFormat>,
): { w: number; h: number; label: string } {
  const migrated = migrateTemplatePageSize(template as DocTemplate);
  const w = migrated.widthMm!;
  const h = migrated.heightMm!;
  const ref = migrated.formatRef ?? migrated.format;
  if (ref !== 'free') {
    const preset = getPresetDimensions(ref as PageFormat | `custom:${string}`, customMap);
    if (preset && matchesPreset(w, h, ref, customMap)) {
      const orientation = getOrientation(w, h);
      const suffix = orientation === 'landscape' ? ' paysage' : '';
      return { w, h, label: `${preset.label}${suffix}` };
    }
  }
  const orientation = getOrientation(w, h);
  const suffix = orientation === 'landscape' ? ' paysage' : '';
  return { w, h, label: `${Math.round(w)} × ${Math.round(h)} mm${suffix}` };
}

/** Normalise les dimensions en portrait pour l'enregistrement d'un format custom. */
export function normalizePortraitDimensions(
  w: number,
  h: number,
): { widthMm: number; heightMm: number } {
  return w <= h ? { widthMm: w, heightMm: h } : { widthMm: h, heightMm: w };
}
