import type { CustomFontBackup } from './customFonts';

export type ContactCategory =
  | 'journaliste'
  | 'galeriste'
  | 'collectionneur'
  | 'artiste'
  | 'institution'
  | 'musee'
  | 'mecene'
  | 'autre';

export type WorkStatus = 'disponible' | 'vendu' | 'reserve' | 'collection' | 'archive';

export interface Artist {
  id: string;
  nom: string;
  bio_fr: string;
  bio_en: string;
  site: string;
  instagram: string;
  email: string;
  photo: string;
  createdAt: string;
  updatedAt: string;
}

export interface Work {
  id: string;
  ref: string;
  titre: string;
  artisteId: string;
  annee: number;
  technique: string;
  dimensions: string;
  prix: number | null;
  description: string;
  images: string[];
  statut: WorkStatus;
  certificat: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  nom: string;
  prenom: string;
  categorie: ContactCategory;
  email: string;
  telephone: string;
  organisation: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Exhibition {
  id: string;
  titre: string;
  lieu: string;
  date_debut: string;
  date_fin: string;
  texte_curatorial: string;
  /** Artiste principal (1er de `artisteIds`, rétrocompatibilité). */
  artisteId: string;
  /** Tous les artistes de l'exposition. */
  artisteIds?: string[];
  oeuvreIds: string[];
  /** Visuel affiche (data URL), format A portrait. */
  affiche: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppBackup {
  version: string;
  exportedAt: string;
  artists: Artist[];
  works: Work[];
  contacts: Contact[];
  exhibitions: Exhibition[];
  templates?: import('./templates').DocTemplate[];
  pageTemplates?: import('./pageTemplates').PageTemplate[];
  customFonts?: CustomFontBackup[];
  customPageFormats?: import('./customPageFormats').CustomPageFormat[];
  mailTemplates?: import('./mail').MailTemplate[];
  sentMails?: import('./sentMails').SentMailLog[];
  settings?: import('./settings').AppSettings;
}

export const CONTACT_CATEGORIES: { value: ContactCategory; label: string }[] = [
  { value: 'journaliste', label: 'Journaliste' },
  { value: 'galeriste', label: 'Galeriste' },
  { value: 'collectionneur', label: 'Collectionneur' },
  { value: 'artiste', label: 'Artiste' },
  { value: 'institution', label: 'Institution' },
  { value: 'musee', label: 'Musée' },
  { value: 'mecene', label: 'Mécène' },
  { value: 'autre', label: 'Autre' },
];

export const WORK_STATUSES: { value: WorkStatus; label: string }[] = [
  { value: 'disponible', label: 'Disponible' },
  { value: 'vendu', label: 'Vendu' },
  { value: 'reserve', label: 'Réservé' },
  { value: 'collection', label: 'Collection' },
  { value: 'archive', label: 'Archivé' },
];
