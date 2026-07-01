import { describe, expect, it } from 'vitest';
import type { DocBlock } from '../types/templates';
import {
  buildImageBlockLayout,
  imageObjectFitApplies,
} from './imageBlockLayout';

describe('imageObjectFitApplies', () => {
  it('true pour hauteur px ou %', () => {
    expect(imageObjectFitApplies('100%', 360)).toBe(true);
    expect(imageObjectFitApplies('100%', '50%')).toBe(true);
  });

  it('false si hauteur auto', () => {
    expect(imageObjectFitApplies('100%', 'auto')).toBe(false);
  });
});

describe('buildImageBlockLayout', () => {
  it('remplit le conteneur parent pour contain/cover', () => {
    const contain = buildImageBlockLayout('55%', '40%', 'contain');
    expect(contain.wrapper.width).toBe('100%');
    expect(contain.wrapper.height).toBe('100%');
    expect(contain.inner.width).toBe('100%');
    expect(contain.inner.height).toBe('100%');
    expect(contain.inner.objectFit).toBe('contain');

    const cover = buildImageBlockLayout('100%', '40%', 'cover');
    expect(cover.wrapper.height).toBe('100%');
    expect(cover.inner.height).toBe('100%');
    expect(cover.inner.objectFit).toBe('cover');
  });

  it('supporte fill (stretch)', () => {
    const { inner } = buildImageBlockLayout('100%', 200, 'fill');
    expect(inner.objectFit).toBe('fill');
    expect(inner.height).toBe('100%');
  });
});

describe('getImageChildWrapLayout column % height', () => {
  it('applique la hauteur % sur le wrap quel que soit object-fit', async () => {
    const { getImageChildWrapLayout } = await import('./imageBlockLayout');
    const cover: DocBlock = {
      id: 'img1',
      type: 'field',
      field: 'work.image',
      imageWidth: '100%',
      imageHeight: '50%',
      objectFit: 'cover',
    };
    expect(getImageChildWrapLayout(cover, 'column')?.height).toBe('50%');

    const contain: DocBlock = {
      id: 'img2',
      type: 'image',
      imageWidth: '55%',
      imageHeight: '36%',
      objectFit: 'contain',
    };
    const style = getImageChildWrapLayout(contain, 'column');
    expect(style?.height).toBe('36%');
    expect(style?.width).toBe('55%');
    expect(style?.minHeight).toBe(48);
  });
});
