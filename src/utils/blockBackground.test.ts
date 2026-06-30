import { describe, expect, it } from 'vitest';
import type { DocBlock } from '../types/templates';
import { blockSupportsBackground, blockBackgroundStyle } from './blockBackground';

const container: DocBlock = { id: 'c1', type: 'container', children: [] };
const text: DocBlock = { id: 't1', type: 'text', content: 'Hi' };
const fieldText: DocBlock = { id: 'f2', type: 'field', field: 'work.titre' };

describe('blockBackground', () => {
  it('supports background only on container blocks', () => {
    expect(blockSupportsBackground(container)).toBe(true);
    expect(blockSupportsBackground(fieldText)).toBe(false);
    expect(blockSupportsBackground({ id: 's', type: 'spacer' })).toBe(false);
    expect(blockSupportsBackground({ id: 'r', type: 'rectangle' })).toBe(false);
    expect(blockSupportsBackground(text)).toBe(false);
  });

  it('resolves color background on container', () => {
    const block: DocBlock = { ...container, blockBgType: 'color', blockBgColor: '#ff0000' };
    expect(blockBackgroundStyle(block)).toEqual({ backgroundColor: '#ff0000' });
  });

  it('resolves image background with url', () => {
    const block: DocBlock = {
      ...container,
      blockBgType: 'image',
      blockBgImageGroupId: 'media_abc',
      blockBgImageFit: 'contain',
    };
    const style = blockBackgroundStyle(block, 'blob:test');
    expect(style.backgroundImage).toBe('url("blob:test")');
    expect(style.backgroundSize).toBe('contain');
  });
});
