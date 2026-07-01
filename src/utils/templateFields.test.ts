import { describe, expect, it } from 'vitest';
import type { Artist, Exhibition, Work } from '../types';
import {
  collectExhibitionArtistIds,
  formatArtistNames,
  normalizeExhibitionArtists,
  resolveExhibitionArtistNames,
  resolveExhibitionPrimaryArtistName,
  resolveField,
  withExhibitionArtists,
} from './templateFields';

const artists: Artist[] = [
  {
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
  {
    id: 'a2',
    nom: 'Jane Doe',
    bio_fr: '',
    bio_en: '',
    site: '',
    instagram: '',
    email: '',
    photo: '',
    createdAt: '',
    updatedAt: '',
  },
];

const artistMap = new Map(artists.map((a) => [a.id, a]));

const exhibition = (overrides: Partial<Exhibition> = {}): Exhibition => ({
  id: 'ex1',
  titre: 'Automne',
  lieu: 'Paris',
  date_debut: '2026-09-01',
  date_fin: '2026-10-30',
  texte_curatorial: '',
  artisteId: 'a1',
  oeuvreIds: ['w1', 'w2'],
  affiche: '',
  createdAt: '',
  updatedAt: '',
  ...overrides,
});

const work = (id: string, artisteId: string): Work => ({
  id,
  ref: id,
  titre: id,
  artisteId,
  annee: 2026,
  technique: '',
  dimensions: '',
  prix: null,
  description: '',
  images: [],
  statut: 'disponible',
  certificat: false,
  createdAt: '',
  updatedAt: '',
});

describe('formatArtistNames', () => {
  it('formate 1, 2 et 3+ noms', () => {
    expect(formatArtistNames(['Nicolas Labrunye'])).toBe('Nicolas Labrunye');
    expect(formatArtistNames(['A', 'B'])).toBe('A et B');
    expect(formatArtistNames(['A', 'B', 'C'])).toBe('A, B et C');
    expect(formatArtistNames([])).toBe('—');
  });
});

describe('expo artist fields', () => {
  it('expo.artiste renvoie l’artiste principal', () => {
    expect(resolveExhibitionPrimaryArtistName(exhibition(), artistMap)).toBe('Nicolas Labrunye');
    expect(resolveField('expo.artiste', withExhibitionArtists({ exhibition: exhibition() }, artistMap))).toBe(
      'Nicolas Labrunye',
    );
  });

  it('expo.artistes liste les artistes uniques de l’expo', () => {
    const expo = exhibition();
    const expoWorks = [work('w1', 'a1'), work('w2', 'a2')];
    expect(collectExhibitionArtistIds(expo, expoWorks)).toEqual(['a1', 'a2']);
    expect(resolveExhibitionArtistNames(expo, artistMap, expoWorks)).toBe('Nicolas Labrunye et Jane Doe');
    expect(
      resolveField(
        'expo.artistes',
        withExhibitionArtists({ exhibition: expo }, artistMap, expoWorks),
      ),
    ).toBe('Nicolas Labrunye et Jane Doe');
  });

  it('expo.artistes sans œuvres retombe sur l’artiste principal', () => {
    expect(resolveExhibitionArtistNames(exhibition(), artistMap)).toBe('Nicolas Labrunye');
  });

  it('expo.artistes utilise artisteIds explicites', () => {
    const expo = exhibition({ artisteIds: ['a1', 'a2'], artisteId: 'a1' });
    expect(collectExhibitionArtistIds(expo)).toEqual(['a1', 'a2']);
    expect(resolveExhibitionArtistNames(expo, artistMap)).toBe('Nicolas Labrunye et Jane Doe');
  });

  it('normalizeExhibitionArtists synchronise artisteId', () => {
    expect(normalizeExhibitionArtists({ artisteIds: ['a2', 'a1'], artisteId: 'a2' })).toEqual({
      artisteIds: ['a2', 'a1'],
      artisteId: 'a2',
    });
    expect(normalizeExhibitionArtists({ artisteId: 'a1' })).toEqual({
      artisteIds: ['a1'],
      artisteId: 'a1',
    });
  });
});
