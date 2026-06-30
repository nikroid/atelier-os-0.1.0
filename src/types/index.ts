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
  photoId: string | null;
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
  imageIds: string[];
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
  artisteId: string;
  oeuvreIds: string[];
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
  mailTemplates?: import('./mail').MailTemplate[];
  settings?: import('./settings').AppSettings;
  mediaGroupIds?: string[];
}

/** Champs legacy dans les sauvegardes v1.x */
export interface LegacyArtist extends Omit<Artist, 'photoId'> {
  photo?: string;
  photoId?: string | null;
}

export interface LegacyWork extends Omit<Work, 'imageIds'> {
  images?: string[];
  imageIds?: string[];
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
