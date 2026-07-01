import { describe, expect, it } from 'vitest';
import {
  buildCartelFields,
  DEFAULT_CARTEL_LAYOUT,
  getCartelPlateGeometry,
  layoutCartelElements,
  wrapByWords,
} from './cartelLayout';
import type { TemplateContext } from './templateFields';

describe('cartelLayout', () => {
  it('wraps long words by spaces', () => {
    const lines = wrapByWords('Un titre très long pour tester', (line) => line.length <= 12);
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.join(' ')).toContain('titre');
  });

  it('builds fields from template context', () => {
    const ctx: TemplateContext = {
      work: {
        id: 'w1',
        ref: 'W-001',
        titre: 'Automne',
        artisteId: 'a1',
        annee: 2026,
        technique: 'Huile',
        dimensions: '30×40 cm',
        prix: null,
        description: '',
        images: [],
        statut: 'disponible',
        certificat: true,
        createdAt: '',
        updatedAt: '',
      },
      artist: {
        id: 'a1',
        nom: 'Nicolas Labrunye',
        bio_fr: '',
        bio_en: '',
        site: '',
        instagram: '',
        email: '',
        photo: '',
        createdAt: '',
        updatedAt: '',
      },
    };
    const fields = buildCartelFields(ctx);
    expect(fields.artist).toBe('Nicolas Labrunye');
    expect(fields.title).toBe('Automne');
    expect(fields.meta).toEqual(['Huile', '30×40 cm', '2026']);
  });

  it('lays out artist, title, bar and meta in order', () => {
    const elements = layoutCartelElements(
      DEFAULT_CARTEL_LAYOUT,
      { artist: 'Artiste', title: 'Titre', meta: ['Technique', '2026'] },
      (text) => [text],
      () => 1,
    );
    const roles = elements.map((el) => el.role);
    expect(roles[0]).toBe('artist');
    expect(roles).toContain('title');
    expect(roles).toContain('bar');
    expect(roles.filter((r) => r === 'meta').length).toBeGreaterThan(0);
    const artistEl = elements.find((el) => el.type === 'text' && el.role === 'artist');
    expect(artistEl?.type === 'text' && artistEl.text).toBe('ARTISTE');
  });

  it('keeps the grid inside plate margins', () => {
    const geo = getCartelPlateGeometry({ ...DEFAULT_CARTEL_LAYOUT, plateMarginMm: 12 });
    expect(geo.margin).toBe(12);
    expect(geo.offX).toBeGreaterThanOrEqual(12);
    expect(geo.offY).toBeGreaterThanOrEqual(12);
    expect(geo.offX + geo.gridW).toBeLessThanOrEqual(geo.pageWmm - 12);
    expect(geo.offY + geo.gridH).toBeLessThanOrEqual(geo.pageHmm - 12);
  });
});
