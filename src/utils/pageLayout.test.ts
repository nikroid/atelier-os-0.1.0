import { describe, expect, it } from 'vitest';
import {
  applyPreset,
  formatAspectRatio,
  getOrientation,
  migrateTemplatePageSize,
  normalizePortraitDimensions,
  resolveFormatRef,
  toggleOrientation,
} from './pageLayout';
import type { DocTemplate } from '../types/templates';

function sampleTemplate(overrides: Partial<DocTemplate> = {}): DocTemplate {
  return {
    id: 'tpl_test',
    nom: 'Test',
    type: 'custom',
    format: 'a4',
    margin: 12,
    background: '#fff',
    root: { id: 'r1', type: 'container', children: [] },
    createdAt: '2020-01-01T00:00:00.000Z',
    updatedAt: '2020-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pageLayout', () => {
  it('migre format legacy a6', () => {
    const t = migrateTemplatePageSize(sampleTemplate({ format: 'a6' }));
    expect(t.formatRef).toBe('a6');
    expect(t.widthMm).toBe(105);
    expect(t.heightMm).toBe(148);
  });

  it('toggle orientation A4', () => {
    const toggled = toggleOrientation(210, 297);
    expect(toggled).toEqual({ w: 297, h: 210 });
    expect(getOrientation(toggled.w, toggled.h)).toBe('landscape');
  });

  it('applyPreset conserve orientation paysage', () => {
    const result = applyPreset('a4', 'landscape');
    expect(result).toEqual({ widthMm: 297, heightMm: 210, formatRef: 'a4' });
  });

  it('resolveFormatRef passe à free après édition manuelle', () => {
    const ref = resolveFormatRef(200, 280, 'a4');
    expect(ref).toBe('free');
  });

  it('normalise portrait pour enregistrement custom', () => {
    expect(normalizePortraitDimensions(297, 210)).toEqual({ widthMm: 210, heightMm: 297 });
  });

  it('formatAspectRatio', () => {
    expect(formatAspectRatio(210, 297)).toBeTruthy();
  });
});
