import type { CSSProperties } from 'react';
import type {
  BackgroundFillType,
  BackgroundImageFit,
  BackgroundImagePosition,
  BackgroundImageSize,
  DocBlock,
  DocTemplate,
  DocTemplatePage,
  LegacyBackgroundImagePosition,
} from '../types/templates';

export type {
  BackgroundFillType,
  BackgroundImageFit,
  BackgroundImagePosition,
  BackgroundImageSize,
  BackgroundPositionUnit,
} from '../types/templates';

export const DEFAULT_PAGE_BACKGROUND = '#ffffff';

const LEGACY_POSITION_MAP: Record<LegacyBackgroundImagePosition, BackgroundImagePosition> = {
  'top left': { x: 0, xUnit: '%', y: 0, yUnit: '%' },
  'top center': { x: 50, xUnit: '%', y: 0, yUnit: '%' },
  'top right': { x: 100, xUnit: '%', y: 0, yUnit: '%' },
  'center left': { x: 0, xUnit: '%', y: 50, yUnit: '%' },
  center: { x: 50, xUnit: '%', y: 50, yUnit: '%' },
  'center right': { x: 100, xUnit: '%', y: 50, yUnit: '%' },
  'bottom left': { x: 0, xUnit: '%', y: 100, yUnit: '%' },
  'bottom center': { x: 50, xUnit: '%', y: 100, yUnit: '%' },
  'bottom right': { x: 100, xUnit: '%', y: 100, yUnit: '%' },
};

export const DEFAULT_IMAGE_POSITION: BackgroundImagePosition = LEGACY_POSITION_MAP.center;

export const DEFAULT_IMAGE_SIZE: BackgroundImageSize = {
  width: 100,
  widthUnit: '%',
  height: 'auto',
  heightUnit: '%',
};

export function normalizeBackgroundImageSize(value: BackgroundImageSize | undefined): BackgroundImageSize {
  if (!value) return DEFAULT_IMAGE_SIZE;
  return {
    width: value.width ?? DEFAULT_IMAGE_SIZE.width,
    widthUnit: value.widthUnit === 'px' ? 'px' : '%',
    height: value.height === 'auto' ? 'auto' : (value.height ?? DEFAULT_IMAGE_SIZE.height),
    heightUnit: value.heightUnit === 'px' ? 'px' : '%',
  };
}

export function isDefaultContainSize(size: BackgroundImageSize): boolean {
  const s = normalizeBackgroundImageSize(size);
  return s.width === 100 && s.widthUnit === '%' && s.height === 'auto';
}

/** Ancien mode « Taille » fusionné dans « Contenir ». */
export function normalizeBackgroundImageFit(
  fit: BackgroundImageFit | 'custom' | undefined,
): BackgroundImageFit {
  if (fit === 'custom') return 'contain';
  return fit ?? 'cover';
}

export function backgroundSizeToCss(
  fit: BackgroundImageFit | 'custom',
  size: BackgroundImageSize | undefined,
): string {
  const normalizedFit = normalizeBackgroundImageFit(fit);
  if (normalizedFit === 'cover') return 'cover';
  if (normalizedFit === 'stretch') return '100% 100%';
  const s = normalizeBackgroundImageSize(size);
  if (isDefaultContainSize(s)) return 'contain';
  if (s.height === 'auto') return `${s.width}${s.widthUnit}`;
  return `${s.width}${s.widthUnit} ${s.height}${s.heightUnit}`;
}

export function normalizeBackgroundImagePosition(
  value: BackgroundImagePosition | LegacyBackgroundImagePosition | undefined,
): BackgroundImagePosition {
  if (!value) return DEFAULT_IMAGE_POSITION;
  if (typeof value === 'string') {
    return LEGACY_POSITION_MAP[value] ?? DEFAULT_IMAGE_POSITION;
  }
  return {
    x: value.x ?? DEFAULT_IMAGE_POSITION.x,
    xUnit: value.xUnit === 'px' ? 'px' : '%',
    y: value.y ?? DEFAULT_IMAGE_POSITION.y,
    yUnit: value.yUnit === 'px' ? 'px' : '%',
  };
}

export function backgroundPositionToCss(
  position: BackgroundImagePosition | LegacyBackgroundImagePosition,
): string {
  const p = normalizeBackgroundImagePosition(position);
  return `${p.x}${p.xUnit} ${p.y}${p.yUnit}`;
}

export interface SurfaceBackground {
  fillType: BackgroundFillType;
  color: string;
  image?: string;
  imageFit: BackgroundImageFit;
  imageSize: BackgroundImageSize;
  imagePosition: BackgroundImagePosition;
  /** True when the page/block overrides its parent default. */
  hasCustomFill: boolean;
}

export interface BackgroundValue {
  type: BackgroundFillType;
  color: string;
  image?: string;
  imageFit: BackgroundImageFit;
  imageSize: BackgroundImageSize;
  imagePosition: BackgroundImagePosition;
}

export function getPageBackground(
  page: DocTemplatePage,
  template: Pick<DocTemplate, 'background'>,
): string {
  return resolvePageSurfaceBackground(page, template).color;
}

export function resolvePageSurfaceBackground(
  page: DocTemplatePage,
  template: Pick<DocTemplate, 'background'>,
): SurfaceBackground {
  const templateColor = template.background ?? DEFAULT_PAGE_BACKGROUND;
  const imageFit = normalizeBackgroundImageFit(page.backgroundImageFit);
  const imageSize = normalizeBackgroundImageSize(page.backgroundImageSize);
  const imagePosition = normalizeBackgroundImagePosition(page.backgroundImagePosition);

  if (page.backgroundType === 'image' && page.backgroundImage) {
    return {
      fillType: 'image',
      color: page.background ?? templateColor,
      image: page.backgroundImage,
      imageFit,
      imageSize,
      imagePosition,
      hasCustomFill: true,
    };
  }

  const hasCustomColor = page.background != null && page.background !== '';
  return {
    fillType: 'color',
    color: hasCustomColor ? page.background! : templateColor,
    imageFit,
    imageSize,
    imagePosition,
    hasCustomFill: hasCustomColor,
  };
}

export function pageHasCustomBackground(page: DocTemplatePage): boolean {
  return (
    (page.background != null && page.background !== '') ||
    Boolean(page.backgroundImage) ||
    page.backgroundType === 'image'
  );
}

export function resolveBlockSurfaceBackground(block: DocBlock): SurfaceBackground | null {
  const imageFit = normalizeBackgroundImageFit(block.backgroundImageFit);
  const imageSize = normalizeBackgroundImageSize(block.backgroundImageSize);
  const imagePosition = normalizeBackgroundImagePosition(block.backgroundImagePosition);

  if (block.backgroundType === 'image' && block.backgroundImage) {
    return {
      fillType: 'image',
      color: block.backgroundColor ?? '#e8e4dc',
      image: block.backgroundImage,
      imageFit,
      imageSize,
      imagePosition,
      hasCustomFill: true,
    };
  }

  if (block.backgroundColor) {
    return {
      fillType: 'color',
      color: block.backgroundColor,
      imageFit,
      imageSize,
      imagePosition,
      hasCustomFill: true,
    };
  }

  return null;
}

export function blockHasCustomBackground(block: DocBlock): boolean {
  return (
    Boolean(block.backgroundColor) ||
    Boolean(block.backgroundImage) ||
    block.backgroundType === 'image'
  );
}

export function surfaceBackgroundToCss(surface: SurfaceBackground | null): CSSProperties {
  if (!surface) return {};

  if (surface.fillType === 'image' && surface.image) {
    const position =
      surface.imageFit === 'contain'
        ? backgroundPositionToCss(surface.imagePosition)
        : 'center';
    return {
      backgroundColor: surface.color,
      backgroundImage: `url("${surface.image}")`,
      backgroundSize: backgroundSizeToCss(surface.imageFit, surface.imageSize),
      backgroundPosition: position,
      backgroundRepeat: 'no-repeat',
    };
  }

  return { backgroundColor: surface.color };
}

export function pageSurfaceToCss(
  page: DocTemplatePage,
  template: Pick<DocTemplate, 'background'>,
): CSSProperties {
  return surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template));
}

export function blockBackgroundValueFromPage(
  page: DocTemplatePage,
  template: Pick<DocTemplate, 'background'>,
): BackgroundValue {
  const surface = resolvePageSurfaceBackground(page, template);
  const type = page.backgroundType ?? (page.backgroundImage ? 'image' : 'color');
  return {
    type,
    color: surface.color,
    image: page.backgroundImage,
    imageFit: normalizeBackgroundImageFit(page.backgroundImageFit ?? surface.imageFit),
    imageSize: normalizeBackgroundImageSize(page.backgroundImageSize ?? surface.imageSize),
    imagePosition: normalizeBackgroundImagePosition(page.backgroundImagePosition ?? surface.imagePosition),
  };
}

export function blockBackgroundValueFromBlock(block: DocBlock): BackgroundValue {
  const surface = resolveBlockSurfaceBackground(block);
  const type = block.backgroundType ?? (block.backgroundImage ? 'image' : 'color');
  return {
    type,
    color: surface?.color ?? '#e8e4dc',
    image: block.backgroundImage,
    imageFit: normalizeBackgroundImageFit(block.backgroundImageFit ?? 'cover'),
    imageSize: normalizeBackgroundImageSize(block.backgroundImageSize),
    imagePosition: normalizeBackgroundImagePosition(block.backgroundImagePosition),
  };
}

export function pagePatchFromBackgroundValue(value: BackgroundValue): Partial<DocTemplatePage> {
  if (value.type === 'image') {
    return {
      backgroundType: 'image',
      backgroundImage: value.image,
      backgroundImageFit: value.imageFit,
      backgroundImageSize: value.imageSize,
      backgroundImagePosition: value.imagePosition,
      background: value.color,
    };
  }
  return {
    backgroundType: 'color',
    background: value.color,
    backgroundImage: undefined,
    backgroundImageFit: value.imageFit,
    backgroundImageSize: value.imageSize,
    backgroundImagePosition: value.imagePosition,
  };
}

export function blockPatchFromBackgroundValue(value: BackgroundValue): Partial<DocBlock> {
  if (value.type === 'image') {
    return {
      backgroundType: 'image',
      backgroundImage: value.image,
      backgroundImageFit: value.imageFit,
      backgroundImageSize: value.imageSize,
      backgroundImagePosition: value.imagePosition,
      backgroundColor: value.color,
    };
  }
  return {
    backgroundType: 'color',
    backgroundColor: value.color,
    backgroundImage: undefined,
    backgroundImageFit: value.imageFit,
    backgroundImageSize: value.imageSize,
    backgroundImagePosition: value.imagePosition,
  };
}

export function clearPageBackgroundPatch(): Partial<DocTemplatePage> {
  return {
    background: undefined,
    backgroundType: undefined,
    backgroundImage: undefined,
    backgroundImageFit: undefined,
    backgroundImageSize: undefined,
    backgroundImagePosition: undefined,
  };
}

export function clearBlockBackgroundPatch(): Partial<DocBlock> {
  return {
    backgroundColor: undefined,
    backgroundType: undefined,
    backgroundImage: undefined,
    backgroundImageFit: undefined,
    backgroundImageSize: undefined,
    backgroundImagePosition: undefined,
  };
}
