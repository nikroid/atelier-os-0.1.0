import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/database';
import {
  deleteImageGroup,
  getAllMediaGroupIds,
  getMediaBlob,
  getStorageStats,
  importMediaAssets,
  saveImageGroupFromProcessed,
} from './mediaStore';
import type { ProcessedImageSet } from '../types/media';

function fakeProcessed(): ProcessedImageSet {
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'image/jpeg' });
  const variant = {
    variant: 'thumb' as const,
    blob,
    width: 100,
    height: 80,
    byteSize: 3,
  };
  return {
    variants: [
      variant,
      { ...variant, variant: 'display', byteSize: 3 },
      { ...variant, variant: 'original', byteSize: 3 },
    ],
  };
}

describe('mediaStore', () => {
  beforeEach(async () => {
    await db.media.clear();
  });

  it('saves and retrieves image group variants', async () => {
    const groupId = await saveImageGroupFromProcessed(fakeProcessed(), 'work', 'work_test', 0);
    const thumb = await getMediaBlob(groupId, 'thumb');
    expect(thumb).toBeTruthy();
    expect(await getMediaBlob(groupId, 'display')).toBeTruthy();
    expect(await getMediaBlob(groupId, 'original')).toBeTruthy();
  });

  it('deletes all variants for a group', async () => {
    const groupId = await saveImageGroupFromProcessed(fakeProcessed(), 'work', 'work_test', 0);
    await deleteImageGroup(groupId);
    expect(await getMediaBlob(groupId, 'thumb')).toBeNull();
    expect(await getAllMediaGroupIds()).toEqual([]);
  });

  it('reports storage stats', async () => {
    await saveImageGroupFromProcessed(fakeProcessed(), 'work', 'work_a', 0);
    await saveImageGroupFromProcessed(fakeProcessed(), 'work', 'work_b', 1);
    const stats = await getStorageStats();
    expect(stats.imageCount).toBe(2);
    expect(stats.totalBytes).toBeGreaterThan(0);
  });

  it('bulk imports media assets', async () => {
    const ts = new Date().toISOString();
    const blob = new Blob([new Uint8Array([9])], { type: 'image/jpeg' });
    await importMediaAssets([
      {
        id: 'g1_thumb',
        groupId: 'g1',
        entityType: 'work',
        entityId: 'w1',
        variant: 'thumb',
        blob,
        mimeType: 'image/jpeg',
        width: 10,
        height: 10,
        byteSize: 1,
        sortOrder: 0,
        createdAt: ts,
      },
    ]);
    expect(await getAllMediaGroupIds()).toEqual(['g1']);
  });
});
