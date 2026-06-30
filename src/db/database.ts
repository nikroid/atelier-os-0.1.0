import Dexie, { type Table } from 'dexie';
import type { Artist, Contact, Exhibition, Work } from '../types';
import type { MediaAsset } from '../types/media';
import type { DocTemplate } from '../types/templates';
import type { AppSettings } from '../types/settings';
import type { MailTemplate, GmailAuth } from '../types/mail';

export class AtelierDatabase extends Dexie {
  artists!: Table<Artist, string>;
  works!: Table<Work, string>;
  contacts!: Table<Contact, string>;
  exhibitions!: Table<Exhibition, string>;
  templates!: Table<DocTemplate, string>;
  mailTemplates!: Table<MailTemplate, string>;
  gmailAuth!: Table<GmailAuth, string>;
  settings!: Table<AppSettings, string>;
  media!: Table<MediaAsset, string>;

  constructor() {
    super('AtelierOS');
    this.version(1).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
    });
    this.version(2).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
      templates: 'id, nom, type, updatedAt',
    });
    this.version(3).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
      templates: 'id, nom, type, updatedAt',
      settings: 'id',
    });
    this.version(4).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
      templates: 'id, nom, type, updatedAt',
      mailTemplates: 'id, nom, updatedAt',
      settings: 'id',
    });
    this.version(5).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
      templates: 'id, nom, type, updatedAt',
      mailTemplates: 'id, nom, updatedAt',
      gmailAuth: 'id',
      settings: 'id',
    });
    this.version(6).stores({
      artists: 'id, nom, updatedAt',
      works: 'id, ref, titre, artisteId, statut, annee, updatedAt',
      contacts: 'id, nom, categorie, email, updatedAt',
      exhibitions: 'id, titre, artisteId, date_debut, updatedAt',
      templates: 'id, nom, type, updatedAt',
      mailTemplates: 'id, nom, updatedAt',
      gmailAuth: 'id',
      settings: 'id',
      media: 'id, groupId, entityType, entityId, variant',
    });
  }
}

export const db = new AtelierDatabase();

export async function generateWorkRef(year?: number): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const prefix = `ART-${y}-`;
  const existing = await db.works.where('ref').startsWith(prefix).toArray();
  const nums = existing
    .map((w) => parseInt(w.ref.replace(prefix, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}

export function uid(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function now(): string {
  return new Date().toISOString();
}
