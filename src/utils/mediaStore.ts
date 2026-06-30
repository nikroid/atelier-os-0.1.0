import { db, now, uid } from '../db/database';
import type { MediaAsset, MediaEntityType, MediaVariant, ProcessedImageSet, StorageStats } from '../types/media';
import { processDataUrl, processImageFile } from './imagePipeline';

const urlCache = new Map<string, string>();
const urlRefCount = new Map<string, number>();

function cacheKey(groupId: string, variant: MediaVariant): string {
  return `${groupId}:${variant}`;
}

function mediaId(groupId: string, variant: MediaVariant): string {
  return `${groupId}_${variant}`;
}

export function newMediaGroupId(): string {
  return uid('media');
}

async function persistImageGroup(
  groupId: string,
  processed: ProcessedImageSet,
  entityType: MediaEntityType,
  entityId: string,
  sortOrder: number,
): Promise<void> {
  const ts = now();
  const assets: MediaAsset[] = processed.variants.map((v) => ({
    id: mediaId(groupId, v.variant),
    groupId,
    entityType,
    entityId,
    variant: v.variant,
    blob: v.blob,
    mimeType: v.blob.type || 'image/jpeg',
    width: v.width,
    height: v.height,
    byteSize: v.byteSize,
    sortOrder,
    originalName: processed.originalName,
    createdAt: ts,
  }));
  await db.media.bulkPut(assets);
}

export async function saveImageGroupFromFile(
  file: File,
  entityType: MediaEntityType,
  entityId: string,
  sortOrder = 0,
): Promise<string> {
  const groupId = newMediaGroupId();
  const processed = await processImageFile(file);
  await persistImageGroup(groupId, processed, entityType, entityId, sortOrder);
  return groupId;
}

export async function saveImageGroupFromDataUrl(
  dataUrl: string,
  entityType: MediaEntityType,
  entityId: string,
  sortOrder = 0,
): Promise<string> {
  const groupId = newMediaGroupId();
  const processed = await processDataUrl(dataUrl);
  await persistImageGroup(groupId, processed, entityType, entityId, sortOrder);
  return groupId;
}

export async function saveImageGroupFromProcessed(
  processed: ProcessedImageSet,
  entityType: MediaEntityType,
  entityId: string,
  sortOrder = 0,
  groupId = newMediaGroupId(),
): Promise<string> {
  await persistImageGroup(groupId, processed, entityType, entityId, sortOrder);
  return groupId;
}

export async function getMediaBlob(groupId: string, variant: MediaVariant): Promise<Blob | null> {
  const asset = await db.media.get(mediaId(groupId, variant));
  return asset?.blob ?? null;
}

export async function getMediaObjectUrl(groupId: string, variant: MediaVariant): Promise<string | null> {
  const key = cacheKey(groupId, variant);
  const cached = urlCache.get(key);
  if (cached) {
    urlRefCount.set(key, (urlRefCount.get(key) ?? 0) + 1);
    return cached;
  }
  const blob = await getMediaBlob(groupId, variant);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  urlRefCount.set(key, 1);
  return url;
}

export function releaseMediaObjectUrl(groupId: string, variant: MediaVariant): void {
  const key = cacheKey(groupId, variant);
  const count = (urlRefCount.get(key) ?? 1) - 1;
  if (count <= 0) {
    const url = urlCache.get(key);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(key);
    urlRefCount.delete(key);
  } else {
    urlRefCount.set(key, count);
  }
}

export async function deleteImageGroup(groupId: string): Promise<void> {
  for (const variant of ['thumb', 'display', 'original'] as MediaVariant[]) {
    const key = cacheKey(groupId, variant);
    const url = urlCache.get(key);
    if (url) URL.revokeObjectURL(url);
    urlCache.delete(key);
    urlRefCount.delete(key);
  }
  await db.media.where('groupId').equals(groupId).delete();
}

export async function deleteImageGroups(groupIds: string[]): Promise<void> {
  await Promise.all(groupIds.map((id) => deleteImageGroup(id)));
}

export async function updateImageGroupEntity(
  groupId: string,
  entityType: MediaEntityType,
  entityId: string,
): Promise<void> {
  await db.media.where('groupId').equals(groupId).modify({ entityType, entityId });
}

export async function getStorageStats(): Promise<StorageStats> {
  const all = await db.media.toArray();
  const groups = new Set(all.map((a) => a.groupId));
  return {
    imageCount: groups.size,
    totalBytes: all.reduce((sum, a) => sum + a.byteSize, 0),
  };
}

export async function getAllMediaGroupIds(): Promise<string[]> {
  const all = await db.media.toArray();
  return [...new Set(all.map((a) => a.groupId))];
}

export async function importMediaAssets(assets: MediaAsset[]): Promise<void> {
  await db.media.bulkPut(assets);
}

export function collectReferencedGroupIds(): Promise<Set<string>> {
  return collectReferencedGroupIdsFromDb();
}

async function collectReferencedGroupIdsFromDb(): Promise<Set<string>> {
  const refs = new Set<string>();
  const [works, artists, templates] = await Promise.all([
    db.works.toArray(),
    db.artists.toArray(),
    db.templates.toArray(),
  ]);
  for (const work of works) {
    for (const id of work.imageIds ?? []) refs.add(id);
  }
  for (const artist of artists) {
    if (artist.photoId) refs.add(artist.photoId);
  }
  for (const template of templates) {
    if (template.pageBgImageGroupId) refs.add(template.pageBgImageGroupId);
    collectBlockGroupIds(template.root, refs);
    for (const page of template.pages ?? []) {
      collectBlockGroupIds(page.root, refs);
    }
  }
  return refs;
}

function collectBlockGroupIds(block: import('../types/templates').DocBlock, refs: Set<string>): void {
  if (block.imageMediaGroupId) refs.add(block.imageMediaGroupId);
  if (block.blockBgImageGroupId) refs.add(block.blockBgImageGroupId);
  for (const child of block.children ?? []) {
    collectBlockGroupIds(child, refs);
  }
}

export async function cleanupOrphanMedia(): Promise<number> {
  const refs = await collectReferencedGroupIdsFromDb();
  const allGroupIds = await getAllMediaGroupIds();
  const orphans = allGroupIds.filter((id) => !refs.has(id));
  await deleteImageGroups(orphans);
  return orphans.length;
}

export async function preloadMediaUrls(
  groupIds: string[],
  variant: MediaVariant = 'display',
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  await Promise.all(
    groupIds.map(async (id) => {
      const url = await getMediaObjectUrl(id, variant);
      if (url) map[id] = url;
    }),
  );
  return map;
}

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`;
}
