import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { AppBackup, LegacyArtist, LegacyWork } from '../types';
import type { MediaAsset, MediaVariant } from '../types/media';
import { db, now } from '../db/database';
import { DEFAULT_SETTINGS } from '../types/settings';
import { isBuiltinTemplate } from './templateCatalog';
import { normalizeTemplate } from './templatePages';
import { migrateLegacyImagesToMedia } from './mediaMigration';
import { getAllMediaGroupIds, importMediaAssets } from './mediaStore';

const MANIFEST_PATH = 'manifest.json';
const MEDIA_PREFIX = 'media/';

export function isZipBytes(bytes: Uint8Array): boolean {
  return bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;
}

function mediaPath(groupId: string, variant: MediaVariant): string {
  return `${MEDIA_PREFIX}${groupId}_${variant}.jpg`;
}

function parseMediaPath(path: string): { groupId: string; variant: MediaVariant } | null {
  if (!path.startsWith(MEDIA_PREFIX)) return null;
  const name = path.slice(MEDIA_PREFIX.length);
  const match = name.match(/^(.+)_(thumb|display|original)\.jpg$/);
  if (!match) return null;
  return { groupId: match[1], variant: match[2] as MediaVariant };
}

export function normalizeLegacyBackup(data: AppBackup): AppBackup {
  return {
    ...data,
    artists: data.artists.map((a) => {
      const legacy = a as LegacyArtist;
      return {
        ...legacy,
        photoId: legacy.photoId ?? null,
      };
    }),
    works: data.works.map((w) => {
      const legacy = w as LegacyWork;
      return {
        ...legacy,
        imageIds: legacy.imageIds ?? [],
      };
    }),
  };
}

export async function buildBackupManifest(): Promise<AppBackup> {
  const [artists, works, contacts, exhibitions, templates, mailTemplates, settings, mediaGroupIds] =
    await Promise.all([
      db.artists.toArray(),
      db.works.toArray(),
      db.contacts.toArray(),
      db.exhibitions.toArray(),
      db.templates.toArray(),
      db.mailTemplates.toArray(),
      db.settings.toArray(),
      getAllMediaGroupIds(),
    ]);

  return {
    version: '2.0',
    exportedAt: new Date().toISOString(),
    artists,
    works,
    contacts,
    exhibitions,
    templates,
    mailTemplates,
    settings: settings[0],
    mediaGroupIds,
  };
}

export async function packArtdbZip(): Promise<Blob> {
  const manifest = await buildBackupManifest();
  const mediaAssets = await db.media.toArray();
  const files: Record<string, Uint8Array> = {
    [MANIFEST_PATH]: strToU8(JSON.stringify(manifest, null, 2)),
  };

  for (const asset of mediaAssets) {
    files[mediaPath(asset.groupId, asset.variant)] = new Uint8Array(await asset.blob.arrayBuffer());
  }

  const zipped = zipSync(files, { level: 6 });
  return new Blob([zipped], { type: 'application/zip' });
}

/** Zip synchrone pour les tests (fichiers média déjà encodés). */
export function packArtdbZipSync(
  manifest: AppBackup,
  mediaFiles: Record<string, Uint8Array>,
): Uint8Array {
  const files: Record<string, Uint8Array> = {
    [MANIFEST_PATH]: strToU8(JSON.stringify(manifest, null, 2)),
    ...mediaFiles,
  };
  return zipSync(files, { level: 0 });
}

/** @deprecated Utiliser packArtdbZipSync en tests */
export function packArtdbZipFromParts(manifest: AppBackup, assets: MediaAsset[]): Uint8Array {
  const mediaFiles: Record<string, Uint8Array> = {};
  for (const asset of assets) {
    mediaFiles[mediaPath(asset.groupId, asset.variant)] = new Uint8Array([0xff, 0xd8, 0xff]);
  }
  return packArtdbZipSync(manifest, mediaFiles);
}

export function unpackArtdbZip(bytes: Uint8Array): {
  manifest: AppBackup;
  assets: MediaAsset[];
} {
  const entries = unzipSync(bytes);
  const manifestRaw = entries[MANIFEST_PATH];
  if (!manifestRaw) throw new Error('manifest.json manquant dans le fichier .artdb');
  const manifest = JSON.parse(strFromU8(manifestRaw)) as AppBackup;

  const byGroup = new Map<string, Partial<Record<MediaVariant, Uint8Array>>>();
  for (const [path, data] of Object.entries(entries)) {
    const parsed = parseMediaPath(path);
    if (!parsed) continue;
    const group = byGroup.get(parsed.groupId) ?? {};
    group[parsed.variant] = data;
    byGroup.set(parsed.groupId, group);
  }

  const ts = now();
  const assets: MediaAsset[] = [];
  for (const [groupId, variants] of byGroup) {
    for (const variant of ['thumb', 'display', 'original'] as MediaVariant[]) {
      const data = variants[variant];
      if (!data) continue;
      const blob = new Blob([new Uint8Array(data)], { type: 'image/jpeg' });
      assets.push({
        id: `${groupId}_${variant}`,
        groupId,
        entityType: 'work',
        entityId: '',
        variant,
        blob,
        mimeType: 'image/jpeg',
        width: 0,
        height: 0,
        byteSize: data.byteLength,
        sortOrder: 0,
        createdAt: ts,
      });
    }
  }

  return { manifest: normalizeLegacyBackup(manifest), assets };
}

export async function importBackupFromData(
  data: AppBackup,
  mediaAssets: MediaAsset[] = [],
): Promise<{ counts: Record<string, number> }> {
  if (!data.artists || !data.works || !data.contacts || !data.exhibitions) {
    throw new Error('Fichier de sauvegarde invalide');
  }

  const normalized = normalizeLegacyBackup(data);
  const preserveSettings = await db.settings.get('app');

  await db.transaction(
    'rw',
    [
      db.artists,
      db.works,
      db.contacts,
      db.exhibitions,
      db.templates,
      db.mailTemplates,
      db.settings,
      db.media,
    ],
    async () => {
      await Promise.all([
        db.artists.clear(),
        db.works.clear(),
        db.contacts.clear(),
        db.exhibitions.clear(),
        db.templates.clear(),
        db.mailTemplates.clear(),
        db.media.clear(),
      ]);
      if (mediaAssets.length) await importMediaAssets(mediaAssets);
      await db.artists.bulkAdd(normalized.artists);
      await db.works.bulkAdd(normalized.works);
      await db.contacts.bulkAdd(normalized.contacts);
      await db.exhibitions.bulkAdd(normalized.exhibitions);
      if (normalized.templates?.length) {
        const userTemplates = normalized.templates
          .filter((t) => !isBuiltinTemplate(t))
          .map((t) => normalizeTemplate(t));
        if (userTemplates.length) await db.templates.bulkAdd(userTemplates);
      }
      if (normalized.mailTemplates?.length) {
        await db.mailTemplates.bulkAdd(normalized.mailTemplates);
      }
      await db.settings.put({
        ...DEFAULT_SETTINGS,
        ...(normalized.settings ?? {}),
        ...(preserveSettings ?? {}),
        id: 'app',
        mode: preserveSettings?.mode ?? normalized.settings?.mode ?? DEFAULT_SETTINGS.mode,
        updatedAt: now(),
      });
    },
  );

  const isLegacy =
    normalized.version.startsWith('1.') ||
    (normalized.works as LegacyWork[]).some((w) => w.images?.length) ||
    (normalized.artists as LegacyArtist[]).some((a) => a.photo?.startsWith('data:image/'));

  if (isLegacy) {
    await migrateLegacyImagesToMedia();
  }

  return {
    counts: {
      artistes: normalized.artists.length,
      oeuvres: normalized.works.length,
      contacts: normalized.contacts.length,
      expositions: normalized.exhibitions.length,
      modeles: normalized.templates?.length ?? 0,
      images: mediaAssets.length
        ? new Set(mediaAssets.map((a) => a.groupId)).size
        : new Set(await getAllMediaGroupIds()).size,
    },
  };
}

export async function importArtdbFile(file: File): Promise<{ counts: Record<string, number> }> {
  const buffer = new Uint8Array(await file.arrayBuffer());
  if (isZipBytes(buffer)) {
    const { manifest, assets } = unpackArtdbZip(buffer);
    return importBackupFromData(manifest, assets);
  }
  const text = strFromU8(buffer);
  const data = JSON.parse(text) as AppBackup;
  return importBackupFromData(data);
}

export async function downloadArtdbBackup(): Promise<void> {
  const blob = await packArtdbZip();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `atelier-os-backup-${new Date().toISOString().slice(0, 10)}.artdb`;
  a.click();
  URL.revokeObjectURL(url);
}
