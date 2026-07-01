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
  it('crée une boîte % pour object-fit', () => {
    const { wrapper, inner } = buildImageBlockLayout('100%', '40%', 'contain');
    expect(wrapper.height).toBe('40%');
    expect(inner.height).toBe('100%');
    expect(inner.objectFit).toBe('contain');
  });

  it('supporte fill (stretch)', () => {
    const { inner } = buildImageBlockLayout('100%', 200, 'fill');
    expect(inner.objectFit).toBe('fill');
  });
});

describe('getImageChildWrapLayout column % height', () => {
  it('applique la hauteur % sur le wrap image', async () => {
    const { getImageChildWrapLayout } = await import('./imageBlockLayout');
    const block: DocBlock = {
      id: 'img1',
      type: 'field',
      field: 'work.image',
      imageWidth: '100%',
      imageHeight: '50%',
    };
    const style = getImageChildWrapLayout(block, 'column');
    expect(style?.height).toBe('50%');
    expect(style?.minHeight).toBe(48);
  });
});
