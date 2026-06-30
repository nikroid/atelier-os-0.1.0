import { describe, expect, it } from 'vitest';
import { strFromU8, unzipSync } from 'fflate';
import type { AppBackup } from '../types';
import type { MediaAsset } from '../types/media';
import {
  isZipBytes,
  normalizeLegacyBackup,
  packArtdbZipFromParts,
  unpackArtdbZip,
} from './artdbZip';

const sampleManifest: AppBackup = {
  version: '2.0',
  exportedAt: '2026-06-27T12:00:00.000Z',
  artists: [
    {
      id: 'a1',
      nom: 'Test',
      bio_fr: '',
      bio_en: '',
      site: '',
      instagram: '',
      email: '',
      photoId: null,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  works: [
    {
      id: 'w1',
      ref: 'ART-2026-001',
      titre: 'Oeuvre',
      artisteId: 'a1',
      annee: 2026,
      technique: '',
      dimensions: '',
      prix: null,
      description: '',
      imageIds: ['media_g1'],
      statut: 'disponible',
      certificat: true,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
  ],
  contacts: [],
  exhibitions: [],
  mediaGroupIds: ['media_g1'],
};

function sampleAssets(): MediaAsset[] {
  const data = new Uint8Array([0xff, 0xd8, 0xff]);
  const blob = new Blob([data], { type: 'image/jpeg' });
  const base = {
    groupId: 'media_g1',
    entityType: 'work' as const,
    entityId: 'w1',
    mimeType: 'image/jpeg',
    width: 10,
    height: 10,
    byteSize: 3,
    sortOrder: 0,
    createdAt: '2026-01-01',
  };
  return (['thumb', 'display', 'original'] as const).map((variant) => ({
    ...base,
    id: `media_g1_${variant}`,
    variant,
    blob,
  }));
}

describe('artdbZip', () => {
  it('detects zip magic bytes', () => {
    expect(isZipBytes(new Uint8Array([0x50, 0x4b, 3, 4]))).toBe(true);
    expect(isZipBytes(new Uint8Array([0x7b, 0x22]))).toBe(false);
  });

  it('round-trips manifest and media via zip', () => {
    const assets = sampleAssets();
    const zipped = packArtdbZipFromParts(sampleManifest, assets);
    expect(isZipBytes(zipped)).toBe(true);

    const { manifest, assets: imported } = unpackArtdbZip(zipped);
    expect(manifest.version).toBe('2.0');
    expect(manifest.works[0].imageIds).toEqual(['media_g1']);
    expect(imported).toHaveLength(3);
    expect(new Set(imported.map((a) => a.groupId))).toEqual(new Set(['media_g1']));
  });

  it('contains manifest.json in zip archive', () => {
    const zipped = packArtdbZipFromParts(sampleManifest, sampleAssets());
    const entries = unzipSync(zipped);
    expect(entries['manifest.json']).toBeTruthy();
    const parsed = JSON.parse(strFromU8(entries['manifest.json'])) as AppBackup;
    expect(parsed.artists[0].nom).toBe('Test');
  });

  it('normalizes legacy backup fields', () => {
    const legacy = normalizeLegacyBackup({
      ...sampleManifest,
      version: '1.3',
      artists: [{ ...sampleManifest.artists[0], photo: 'data:image/png;base64,abc' } as never],
      works: [
        {
          ...sampleManifest.works[0],
          imageIds: undefined,
          images: ['data:image/jpeg;base64,xyz'],
        } as never,
      ],
    });
    expect(legacy.artists[0].photoId).toBeNull();
    expect(legacy.works[0].imageIds).toEqual([]);
  });
});
