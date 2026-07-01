import { describe, expect, it } from 'vitest';
import type { DocTemplatePage } from '../types/templates';
import {
  backgroundPositionToCss,
  backgroundSizeToCss,
  blockPatchFromBackgroundValue,
  DEFAULT_IMAGE_SIZE,
  normalizeBackgroundImageFit,
  normalizeBackgroundImagePosition,
  pagePatchFromBackgroundValue,
  resolveBlockSurfaceBackground,
  resolvePageSurfaceBackground,
  surfaceBackgroundToCss,
} from './backgroundStyle';
import { emptyPageRoot } from './templatePages';

describe('backgroundStyle', () => {
  const template = { background: '#111111' };

  it('resolves page color background', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      background: '#abcdef',
    };
    const surface = resolvePageSurfaceBackground(page, template);
    expect(surface.fillType).toBe('color');
    expect(surface.color).toBe('#abcdef');
    expect(surface.hasCustomFill).toBe(true);
  });

  it('resolves page image background', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,abc',
      backgroundImageFit: 'contain',
    };
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template));
    expect(css.backgroundImage).toContain('data:image/png');
    expect(css.backgroundSize).toBe('contain');
    expect(css.backgroundPosition).toBe('50% 50%');
  });

  it('resolves page image background with x/y position in contain mode', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,abc',
      backgroundImageFit: 'contain',
      backgroundImagePosition: { x: 20, xUnit: '%', y: 40, yUnit: 'px' },
    };
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, { background: '#fff' }));
    expect(css.backgroundSize).toBe('contain');
    expect(css.backgroundPosition).toBe('20% 40px');
  });

  it('resolves contain background with explicit size in percent', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,abc',
      backgroundImageFit: 'contain',
      backgroundImageSize: { width: 60, widthUnit: '%', height: 40, heightUnit: '%' },
      backgroundImagePosition: { x: 0, xUnit: '%', y: 0, yUnit: '%' },
    };
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template));
    expect(css.backgroundSize).toBe('60% 40%');
    expect(css.backgroundPosition).toBe('0% 0%');
    expect(backgroundSizeToCss('contain', page.backgroundImageSize)).toBe('60% 40%');
  });

  it('migrates legacy custom fit to contain', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,abc',
      backgroundImageFit: 'custom' as 'contain',
      backgroundImageSize: { width: 75, widthUnit: '%', height: 'auto', heightUnit: '%' },
    };
    expect(normalizeBackgroundImageFit(page.backgroundImageFit)).toBe('contain');
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template));
    expect(css.backgroundSize).toBe('75%');
  });

  it('resolves contain size with auto height', () => {
    expect(
      backgroundSizeToCss('contain', {
        width: 75,
        widthUnit: '%',
        height: 'auto',
        heightUnit: '%',
      }),
    ).toBe('75%');
  });

  it('resolves contain size above 100 percent', () => {
    expect(
      backgroundSizeToCss('contain', {
        width: 150,
        widthUnit: '%',
        height: 'auto',
        heightUnit: '%',
      }),
    ).toBe('150%');
  });

  it('resolves stretch background size', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,abc',
      backgroundImageFit: 'stretch',
    };
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template));
    expect(css.backgroundSize).toBe('100% 100%');
    expect(css.backgroundPosition).toBe('center');
    expect(backgroundSizeToCss('stretch', undefined)).toBe('100% 100%');
  });

  it('migrates legacy preset positions', () => {
    expect(normalizeBackgroundImagePosition('top left')).toEqual({
      x: 0,
      xUnit: '%',
      y: 0,
      yUnit: '%',
    });
    expect(backgroundPositionToCss('bottom right')).toBe('100% 100%');
  });

  it('maps background value patches', () => {
    const position = { x: 10, xUnit: '%' as const, y: 25, yUnit: 'px' as const };
    const size = { width: 50, widthUnit: '%' as const, height: 'auto' as const, heightUnit: '%' as const };
    expect(
      pagePatchFromBackgroundValue({
        type: 'image',
        color: '#fff',
        image: 'data:image/jpeg;base64,x',
        imageFit: 'contain',
        imageSize: size,
        imagePosition: position,
      }).backgroundImageSize,
    ).toEqual(size);

    const block = blockPatchFromBackgroundValue({
      type: 'color',
      color: '#eee',
      imageFit: 'cover',
      imageSize: size,
      imagePosition: { x: 50, xUnit: '%', y: 50, yUnit: '%' },
    });
    expect(block.backgroundColor).toBe('#eee');
    expect(block.backgroundImage).toBeUndefined();
  });

  it('resolves block image background', () => {
    const surface = resolveBlockSurfaceBackground({
      id: 'c1',
      type: 'container',
      backgroundType: 'image',
      backgroundImage: 'data:image/png;base64,xyz',
      backgroundColor: '#000',
    });
    expect(surface?.fillType).toBe('image');
  });

  it('resolves dynamic page background from context', () => {
    const page: DocTemplatePage = {
      id: 'p1',
      kind: 'static',
      root: emptyPageRoot(),
      backgroundType: 'image',
      backgroundImageField: 'work.image',
      backgroundImageFit: 'cover',
    };
    const ctx = {
      work: {
        id: 'w1',
        titre: 'Test',
        annee: 2026,
        technique: '',
        dimensions: '',
        prix: 0,
        ref: '',
        description: '',
        statut: 'disponible' as const,
        images: ['data:image/png;base64,work'],
        artisteId: 'a1',
        certificat: false,
        createdAt: '',
        updatedAt: '',
      },
    };
    const css = surfaceBackgroundToCss(resolvePageSurfaceBackground(page, template, ctx));
    expect(css.backgroundImage).toContain('data:image/png;base64,work');
  });

  it('maps dynamic background value patches', () => {
    const patch = pagePatchFromBackgroundValue({
      type: 'image',
      color: '#fff',
      imageField: 'artist.photo',
      imageFit: 'cover',
      imageSize: DEFAULT_IMAGE_SIZE,
      imagePosition: { x: 50, xUnit: '%', y: 50, yUnit: '%' },
    });
    expect(patch.backgroundImageField).toBe('artist.photo');
    expect(patch.backgroundImage).toBeUndefined();
  });
});
