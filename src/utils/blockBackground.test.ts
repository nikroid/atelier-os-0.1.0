import { describe, expect, it } from 'vitest';
import type { DocBlock } from '../types/templates';
import {
  blockSupportsBackground,
  getEffectiveBlockBgColor,
  getEffectiveBlockBgType,
  resolveBlockBackgroundStylePlain,
} from './blockBackground';

const container: DocBlock = { id: 'c1', type: 'container', children: [] };
const text: DocBlock = { id: 't1', type: 'text', content: 'Hi' };
const image: DocBlock = { id: 'i1', type: 'image' };
const fieldImage: DocBlock = { id: 'f1', type: 'field', field: 'work.image' };
const fieldText: DocBlock = { id: 'f2', type: 'field', field: 'work.titre' };

describe('blockBackground', () => {
  it('supports background on container, field text, spacer, rectangle', () => {
    expect(blockSupportsBackground(container)).toBe(true);
    expect(blockSupportsBackground(fieldText)).toBe(true);
    expect(blockSupportsBackground({ id: 's', type: 'spacer' })).toBe(true);
    expect(blockSupportsBackground({ id: 'r', type: 'rectangle' })).toBe(true);
  });

  it('excludes text, image and image fields', () => {
    expect(blockSupportsBackground(text)).toBe(false);
    expect(blockSupportsBackground(image)).toBe(false);
    expect(blockSupportsBackground(fieldImage)).toBe(false);
  });

  it('resolves color background', () => {
    const block: DocBlock = { ...container, blockBgType: 'color', blockBgColor: '#ff0000' };
    expect(resolveBlockBackgroundStylePlain(block)).toEqual({ backgroundColor: '#ff0000' });
  });

  it('resolves image background with url', () => {
    const block: DocBlock = {
      ...container,
      blockBgType: 'image',
      blockBgImageGroupId: 'media_abc',
      blockBgImageFit: 'contain',
    };
    const style = resolveBlockBackgroundStylePlain(block, 'blob:test');
    expect(style.backgroundImage).toBe('url("blob:test")');
    expect(style.backgroundSize).toBe('contain');
  });

  it('falls back to rectangle backgroundColor', () => {
    const block: DocBlock = { id: 'r', type: 'rectangle', backgroundColor: '#abc' };
    expect(getEffectiveBlockBgType(block)).toBe('color');
    expect(getEffectiveBlockBgColor(block)).toBe('#abc');
  });
});
