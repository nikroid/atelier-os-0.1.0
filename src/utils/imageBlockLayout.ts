import type { CSSProperties } from 'react';
import type { DocBlock, ImageDropShadow } from '../types/templates';
import { isImageField } from './templateFields';

export function resolveImageWidth(raw: string | number | undefined): string | number {
  if (raw === undefined || raw === null) return '100%';
  if (typeof raw === 'number') return raw;
  return raw;
}

export function resolveImageHeight(raw: string | number | undefined): string | number {
  if (raw === undefined || raw === null) return 100;
  if (typeof raw === 'number') return raw;
  return raw;
}

export const DEFAULT_IMAGE_DROP_SHADOW: Required<ImageDropShadow> = {
  enabled: true,
  offsetX: 3,
  offsetY: 6,
  blur: 5,
  color: '#000000',
  opacity: 35,
};

/** @deprecated Anciens préréglages avant éditeur détaillé */
type LegacyImageShadowPreset = 'none' | 'soft' | 'medium' | 'strong';

const LEGACY_IMAGE_SHADOW_PRESETS: Record<
  Exclude<LegacyImageShadowPreset, 'none'>,
  Required<ImageDropShadow>
> = {
  soft: { enabled: true, offsetX: 0, offsetY: 2, blur: 8, color: '#000000', opacity: 12 },
  medium: { enabled: true, offsetX: 0, offsetY: 4, blur: 16, color: '#000000', opacity: 18 },
  strong: { enabled: true, offsetX: 0, offsetY: 8, blur: 24, color: '#000000', opacity: 28 },
};

export function normalizeImageDropShadow(
  raw?: ImageDropShadow | LegacyImageShadowPreset | string,
): ImageDropShadow | undefined {
  if (raw == null) return undefined;
  if (typeof raw === 'string') {
    if (raw === 'none') return { enabled: false };
    const preset = LEGACY_IMAGE_SHADOW_PRESETS[raw as Exclude<LegacyImageShadowPreset, 'none'>];
    return preset ? { ...preset } : undefined;
  }
  if (raw.enabled === false) return raw;
  return { ...DEFAULT_IMAGE_DROP_SHADOW, ...raw, enabled: raw.enabled ?? true };
}

function shadowColorToRgba(hex: string, opacityPercent: number): string {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(0, 0, 0, ${opacityPercent / 100})`;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacityPercent / 100})`;
}

export function imageDropShadowFilter(
  shadow?: ImageDropShadow | LegacyImageShadowPreset | string,
): string | undefined {
  const normalized = normalizeImageDropShadow(shadow);
  if (!normalized?.enabled) return undefined;

  const { offsetX, offsetY, blur, color, opacity } = {
    ...DEFAULT_IMAGE_DROP_SHADOW,
    ...normalized,
  };
  if (blur <= 0 && offsetX === 0 && offsetY === 0) return undefined;

  return `drop-shadow(${offsetX}px ${offsetY}px ${blur}px ${shadowColorToRgba(color, opacity)})`;
}

export type ImageObjectFit = 'cover' | 'contain' | 'fill';

export const IMAGE_OBJECT_FIT_OPTIONS: { value: ImageObjectFit; label: string }[] = [
  { value: 'cover', label: 'Couvrir' },
  { value: 'contain', label: 'Contenir' },
  { value: 'fill', label: 'Remplir' },
];

export function buildImageBlockLayout(
  width: string | number | undefined,
  height: string | number | undefined,
  objectFit: ImageObjectFit,
  fillParentHeight = false,
  centerInRow = false,
  imageShadow?: ImageDropShadow | LegacyImageShadowPreset | string,
): { wrapper: CSSProperties; inner: CSSProperties } {
  const w = resolveImageWidth(width);
  const h = resolveImageHeight(height);

  const wrapper: CSSProperties = {
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

  const inner: CSSProperties = {
    borderRadius: 2,
    objectFit,
  };

  if (centerInRow) {
    wrapper.width = 'auto';
    wrapper.maxWidth = w === 'auto' ? '100%' : w;
    inner.width = 'auto';
    inner.maxWidth = '100%';
  } else if (w === 'auto') {
    wrapper.width = 'auto';
    inner.width = 'auto';
    inner.maxWidth = '100%';
  } else {
    wrapper.width = w;
    inner.width = '100%';
  }

  if (h === 'auto') {
    wrapper.height = 'auto';
    inner.height = 'auto';
    wrapper.minHeight = 48;
  } else if (isPercentSize(h)) {
    if (fillParentHeight) {
      wrapper.height = '100%';
      wrapper.minHeight = 48;
      inner.height = '100%';
      inner.minHeight = 48;
    } else {
      wrapper.height = h;
      wrapper.minHeight = 48;
      inner.height = '100%';
    }
  } else {
    wrapper.height = h;
    inner.height = '100%';
  }

  const shadowFilter = imageDropShadowFilter(imageShadow);
  if (shadowFilter) {
    inner.filter = shadowFilter;
    wrapper.overflow = 'visible';
  }

  return { wrapper, inner };
}

export function isImageBlock(block: DocBlock): boolean {
  return block.type === 'image' || (block.type === 'field' && !!block.field && isImageField(block.field));
}

export function isPercentSize(value: string | number): boolean {
  return typeof value === 'string' && value.endsWith('%');
}

export function hasFixedImageHeight(height: string | number): boolean {
  return height !== 'auto' && !isPercentSize(height);
}

/** object-fit s'applique dès qu'une hauteur est définie (px ou %), pas en `auto`. */
export function imageObjectFitApplies(
  imageWidth?: string | number,
  imageHeight?: string | number,
): boolean {
  void imageWidth;
  return resolveImageHeight(imageHeight) !== 'auto';
}

export function getImageChildWrapLayout(
  child: DocBlock,
  parentDirection: 'row' | 'column' = 'column',
  _parentContainer?: DocBlock,
): CSSProperties | null {
  if (!isImageBlock(child)) return null;

  const w = resolveImageWidth(child.imageWidth);
  const h = resolveImageHeight(child.imageHeight);
  const style: CSSProperties = {
    maxWidth: '100%',
    boxSizing: 'border-box',
  };

  if (w === '100%') style.width = '100%';
  else style.width = w === 'auto' ? 'auto' : w;

  if (parentDirection === 'column') {
    if (h !== 'auto') {
      style.height = h;
      style.flexShrink = 0;
      if (isPercentSize(h)) style.minHeight = 48;
    }
    return style;
  }

  if (h === 'auto') {
    style.height = 'auto';
    style.minHeight = 48;
  } else if (isPercentSize(h)) {
    style.height = h;
    style.flexShrink = 0;
    style.minHeight = 48;
  } else {
    style.height = h;
    style.flexShrink = 0;
  }

  return style;
}

/** @deprecated Utiliser getImageChildWrapLayout */
export function getImageChildWrapWidth(child: DocBlock): CSSProperties | null {
  const layout = getImageChildWrapLayout(child, 'column');
  if (!layout) return null;
  return layout;
}
