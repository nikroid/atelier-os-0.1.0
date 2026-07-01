import type { Artist, Exhibition, Work } from '../types';
import type { FieldKey } from '../types/templates';
import { formatDate, formatPrice } from './helpers';

export interface FieldDef {
  key: FieldKey;
  label: string;
  group: 'œuvre' | 'artiste' | 'exposition';
  preview: string;
}

/** Liste lisible : « A », « A et B », « A, B et C ». */
export function formatArtistNames(names: string[]): string {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  if (!unique.length) return '—';
  if (unique.length === 1) return unique[0];
  if (unique.length === 2) return `${unique[0]} et ${unique[1]}`;
  return `${unique.slice(0, -1).join(', ')} et ${unique[unique.length - 1]}`;
}

export function exhibitionArtistIds(exhibition: Exhibition): string[] {
  if (exhibition.artisteIds?.length) return [...exhibition.artisteIds];
  return exhibition.artisteId ? [exhibition.artisteId] : [];
}

export function normalizeExhibitionArtists(
  data: Pick<Exhibition, 'artisteId' | 'artisteIds'>,
): { artisteIds: string[]; artisteId: string } {
  const artisteIds = data.artisteIds?.length
    ? [...data.artisteIds]
    : data.artisteId
      ? [data.artisteId]
      : [];
  return { artisteIds, artisteId: artisteIds[0] ?? '' };
}

export function collectExhibitionArtistIds(
  exhibition: Exhibition,
  exhibitionWorks?: Work[],
): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (id: string | undefined) => {
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };

  for (const id of exhibitionArtistIds(exhibition)) {
    push(id);
  }
  for (const work of exhibitionWorks ?? []) {
    push(work.artisteId);
  }

  return ids;
}

export function resolveExhibitionArtistNames(
  exhibition: Exhibition | undefined,
  artistMap?: ReadonlyMap<string, Artist>,
  exhibitionWorks?: Work[],
): string {
  if (!exhibition || !artistMap) return '—';
  const names = collectExhibitionArtistIds(exhibition, exhibitionWorks)
    .map((id) => artistMap.get(id)?.nom)
    .filter((name): name is string => Boolean(name));
  return formatArtistNames(names);
}

export function resolveExhibitionPrimaryArtistName(
  exhibition: Exhibition | undefined,
  artistMap?: ReadonlyMap<string, Artist>,
): string {
  const primaryId = exhibition ? exhibitionArtistIds(exhibition)[0] : undefined;
  if (!primaryId || !artistMap) return '—';
  return artistMap.get(primaryId)?.nom ?? '—';
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
  { key: 'expo.affiche', label: 'Image exposition', group: 'exposition', preview: '[affiche]' },
  { key: 'expo.artiste', label: 'Artiste principal (expo)', group: 'exposition', preview: 'Nicolas Labrunye' },
  { key: 'expo.artistes', label: 'Artiste(s) exposition', group: 'exposition', preview: 'Nicolas Labrunye et Jane Doe' },
];

export interface TemplateContext {
  work?: Work;
  artist?: Artist;
  exhibition?: Exhibition;
  /** Résolution des champs expo.artiste(s). */
  artistMap?: ReadonlyMap<string, Artist>;
  /** Œuvres liées à l'exposition (pour lister tous les artistes). */
  exhibitionWorks?: Work[];
}

export function withExhibitionArtists(
  ctx: TemplateContext,
  artistMap: ReadonlyMap<string, Artist>,
  works?: Work[],
): TemplateContext {
  if (!ctx.exhibition || !works?.length) {
    return { ...ctx, artistMap };
  }
  const exhibitionWorks = works.filter((w) => ctx.exhibition!.oeuvreIds.includes(w.id));
  return { ...ctx, artistMap, exhibitionWorks };
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
    case 'expo.affiche': return '';
    case 'expo.artiste':
      return resolveExhibitionPrimaryArtistName(exhibition, ctx.artistMap);
    case 'expo.artistes':
      return resolveExhibitionArtistNames(exhibition, ctx.artistMap, ctx.exhibitionWorks);
    default: return '';
  }
}

export function resolveImage(key: FieldKey, ctx: TemplateContext): string | null {
  if (key === 'work.image') return ctx.work?.images[0] ?? null;
  if (key === 'artist.photo') return ctx.artist?.photo || null;
  if (key === 'expo.affiche') return ctx.exhibition?.affiche || null;
  return null;
}

export function isImageField(key: FieldKey): boolean {
  return key === 'work.image' || key === 'artist.photo' || key === 'expo.affiche';
}
