import type { Artist, Exhibition, Work } from '../types';
import type { FieldKey } from '../types/templates';
import { formatDate, formatPrice } from './helpers';

export interface FieldDef {
  key: FieldKey;
  label: string;
  group: 'œuvre' | 'artiste' | 'exposition';
  preview: string;
}

export const FIELD_CATALOG: FieldDef[] = [
  { key: 'work.image', label: 'Image de l\'œuvre', group: 'œuvre', preview: '[image]' },
  { key: 'work.titre', label: 'Titre de l\'œuvre', group: 'œuvre', preview: 'Le Vagabond' },
  { key: 'work.annee', label: 'Année', group: 'œuvre', preview: '2026' },
  { key: 'work.technique', label: 'Technique', group: 'œuvre', preview: 'Huile sur toile' },
  { key: 'work.dimensions', label: 'Dimensions', group: 'œuvre', preview: '120 × 80 cm' },
  { key: 'work.prix', label: 'Prix', group: 'œuvre', preview: '2 500 €' },
  { key: 'work.ref', label: 'Référence', group: 'œuvre', preview: 'ART-2026-001' },
  { key: 'work.description', label: 'Description', group: 'œuvre', preview: 'Description de l\'œuvre…' },
  { key: 'work.statut', label: 'Statut', group: 'œuvre', preview: 'disponible' },
  { key: 'artist.nom', label: 'Nom artiste', group: 'artiste', preview: 'Nicolas Labrunye' },
  { key: 'artist.bio_fr', label: 'Bio artiste (FR)', group: 'artiste', preview: 'Artiste plasticien…' },
  { key: 'artist.photo', label: 'Photo artiste', group: 'artiste', preview: '[photo]' },
  { key: 'artist.email', label: 'Email artiste', group: 'artiste', preview: 'contact@example.com' },
  { key: 'artist.site', label: 'Site web', group: 'artiste', preview: 'nicolaslabrunye.fr' },
  { key: 'expo.titre', label: 'Titre exposition', group: 'exposition', preview: 'Automne 2026' },
  { key: 'expo.lieu', label: 'Lieu exposition', group: 'exposition', preview: 'Galerie du Marais' },
  { key: 'expo.dates', label: 'Dates exposition', group: 'exposition', preview: '15 sept. — 30 oct. 2026' },
  { key: 'expo.texte_curatorial', label: 'Texte curatorial', group: 'exposition', preview: 'Texte de salle…' },
];

export interface TemplateContext {
  work?: Work;
  artist?: Artist;
  exhibition?: Exhibition;
  /** URLs résolues pour les images média (groupId → object URL) */
  mediaUrlByGroupId?: Record<string, string>;
}

export function resolveField(key: FieldKey, ctx: TemplateContext): string {
  const { work, artist, exhibition } = ctx;
  switch (key) {
    case 'work.titre': return work?.titre ?? '—';
    case 'work.annee': return work ? String(work.annee) : '—';
    case 'work.technique': return work?.technique ?? '—';
    case 'work.dimensions': return work?.dimensions ?? '—';
    case 'work.prix': return work ? formatPrice(work.prix) : '—';
    case 'work.ref': return work?.ref ?? '—';
    case 'work.description': return work?.description ?? '';
    case 'work.statut': return work?.statut ?? '—';
    case 'artist.nom': return artist?.nom ?? '—';
    case 'artist.bio_fr': return artist?.bio_fr ?? '';
    case 'artist.email': return artist?.email ?? '';
    case 'artist.site': return artist?.site ?? '';
    case 'expo.titre': return exhibition?.titre ?? '—';
    case 'expo.lieu': return exhibition?.lieu ?? '—';
    case 'expo.dates':
      return exhibition
        ? `${formatDate(exhibition.date_debut)} — ${formatDate(exhibition.date_fin)}`
        : '—';
    case 'expo.texte_curatorial': return exhibition?.texte_curatorial ?? '';
    default: return '';
  }
}

export function resolveImage(key: FieldKey, ctx: TemplateContext): string | null {
  if (key === 'work.image') {
    const gid = ctx.work?.imageIds?.[0];
    if (gid && ctx.mediaUrlByGroupId?.[gid]) return ctx.mediaUrlByGroupId[gid];
    return null;
  }
  if (key === 'artist.photo') {
    const gid = ctx.artist?.photoId;
    if (gid && ctx.mediaUrlByGroupId?.[gid]) return ctx.mediaUrlByGroupId[gid];
    return null;
  }
  return null;
}

export function isImageField(key: FieldKey): boolean {
  return key === 'work.image' || key === 'artist.photo';
}
