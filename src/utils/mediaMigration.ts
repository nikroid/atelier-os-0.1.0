import { db } from '../db/database';
import type { Artist, Work } from '../types';
import type { DocBlock, DocTemplate } from '../types/templates';
import {
  deleteImageGroup,
  saveImageGroupFromDataUrl,
  updateImageGroupEntity,
} from './mediaStore';

type LegacyWork = Work & { images?: string[] };
type LegacyArtist = Artist & { photo?: string };

async function migrateBlockTree(block: DocBlock, templateId: string): Promise<void> {
  if (block.imageSrc && !block.imageMediaGroupId) {
    try {
      const groupId = await saveImageGroupFromDataUrl(block.imageSrc, 'template', templateId, 0);
      block.imageMediaGroupId = groupId;
      delete block.imageSrc;
    } catch {
      /* ignore invalid legacy image */
    }
  }
  for (const child of block.children ?? []) {
    await migrateBlockTree(child, templateId);
  }
}

async function migrateTemplate(template: DocTemplate): Promise<boolean> {
  let changed = false;
  const before = JSON.stringify(template);
  await migrateBlockTree(template.root, template.id);
  for (const page of template.pages ?? []) {
    await migrateBlockTree(page.root, template.id);
  }
  if (JSON.stringify(template) !== before) changed = true;
  return changed;
}

export async function migrateLegacyImagesToMedia(): Promise<void> {
  const works = (await db.works.toArray()) as LegacyWork[];
  for (const work of works) {
    const legacyImages = work.images?.filter((u) => u.startsWith('data:image/')) ?? [];
    if (legacyImages.length > 0 && (!work.imageIds || work.imageIds.length === 0)) {
      const imageIds: string[] = [];
      for (let i = 0; i < legacyImages.length; i++) {
        try {
          const groupId = await saveImageGroupFromDataUrl(legacyImages[i], 'work', work.id, i);
          imageIds.push(groupId);
        } catch {
          /* skip */
        }
      }
      await db.works.update(work.id, { imageIds } as Partial<Work>);
      const updated = { ...work, imageIds };
      delete (updated as LegacyWork).images;
      await db.works.put(updated);
    } else if (!work.imageIds) {
      await db.works.update(work.id, { imageIds: [] });
    }
  }

  const artists = (await db.artists.toArray()) as LegacyArtist[];
  for (const artist of artists) {
    const legacyPhoto = artist.photo?.startsWith('data:image/') ? artist.photo : null;
    if (legacyPhoto && !artist.photoId) {
      try {
        const groupId = await saveImageGroupFromDataUrl(legacyPhoto, 'artist', artist.id, 0);
        const updated = { ...artist, photoId: groupId };
        delete (updated as LegacyArtist).photo;
        await db.artists.put(updated);
      } catch {
        await db.artists.update(artist.id, { photoId: null });
      }
    } else if (artist.photoId === undefined) {
      await db.artists.update(artist.id, { photoId: null });
    }
  }

  const templates = await db.templates.toArray();
  for (const template of templates) {
    if (await migrateTemplate(template)) {
      await db.templates.put(template);
    }
  }

  // Re-link entity ids for media created during migration
  for (const work of await db.works.toArray()) {
    for (let i = 0; i < work.imageIds.length; i++) {
      await updateImageGroupEntity(work.imageIds[i], 'work', work.id);
    }
  }
  for (const artist of await db.artists.toArray()) {
    if (artist.photoId) {
      await updateImageGroupEntity(artist.photoId, 'artist', artist.id);
    }
  }
}

export async function detachWorkImages(_workId: string, imageIds: string[]): Promise<void> {
  await Promise.all(imageIds.map((id) => deleteImageGroup(id)));
}

export async function detachArtistPhoto(photoId: string | null): Promise<void> {
  if (photoId) await deleteImageGroup(photoId);
}
