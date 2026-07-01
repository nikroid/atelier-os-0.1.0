import type { DocTemplate } from '../types/templates';
import { createBlockId } from './blockTree';
import { defaultPageKindForTemplate, legacyPageId } from './templatePages';
import { migrateTemplatePageSize } from './pageLayout';
import catalogueJson from '../data/builtin-catalogue.json';

const BUILTIN_TS = '2020-01-01T00:00:00.000Z';

function withBuiltinPages(tpl: DocTemplate): DocTemplate {
  if (tpl.pages?.length) {
    const root = tpl.pages[0]?.root ?? tpl.root;
    return { ...tpl, root };
  }
  const page = {
    id: legacyPageId(tpl.id),
    kind: defaultPageKindForTemplate(tpl.type),
    root: tpl.root,
  };
  return { ...tpl, pages: [page], root: page.root };
}

function cartelTemplate(): DocTemplate {
  return {
    id: 'builtin_cartel',
    nom: 'Cartel classique',
    type: 'cartel',
    format: 'a6',
    margin: 8,
    background: '#f5f2ed',
    root: {
      id: createBlockId(),
      type: 'container',
      direction: 'column',
      gap: 6,
      align: 'center',
      padding: 12,
      children: [
        { id: createBlockId(), type: 'field', field: 'work.titre', fontSize: 14, fontWeight: 'bold', textAlign: 'center' },
        { id: createBlockId(), type: 'field', field: 'work.annee', fontSize: 11, textAlign: 'center' },
        { id: createBlockId(), type: 'field', field: 'artist.nom', fontSize: 10, textAlign: 'center' },
        { id: createBlockId(), type: 'field', field: 'work.technique', fontSize: 10, textAlign: 'center' },
        { id: createBlockId(), type: 'field', field: 'work.dimensions', fontSize: 10, textAlign: 'center' },
        { id: createBlockId(), type: 'spacer', spacerHeight: 8 },
        { id: createBlockId(), type: 'field', field: 'work.ref', fontSize: 7, textAlign: 'center', color: '#a8a8a0' },
      ],
    },
    createdAt: BUILTIN_TS,
    updatedAt: BUILTIN_TS,
  };
}

function ficheTemplate(): DocTemplate {
  return {
    id: 'builtin_fiche',
    nom: 'Fiche œuvre A4',
    type: 'fiche',
    format: 'a4',
    margin: 15,
    background: '#ffffff',
    root: {
      id: createBlockId(),
      type: 'container',
      direction: 'column',
      gap: 12,
      align: 'stretch',
      padding: 16,
      children: [
        {
          id: createBlockId(),
          type: 'container',
          direction: 'row',
          gap: 16,
          align: 'flex-start',
          children: [
            {
              id: createBlockId(),
              type: 'container',
              direction: 'column',
              flex: 1,
              gap: 8,
              children: [
                { id: createBlockId(), type: 'field', field: 'work.titre', fontSize: 18, fontWeight: 'bold' },
                { id: createBlockId(), type: 'field', field: 'artist.nom', fontSize: 12 },
                { id: createBlockId(), type: 'field', field: 'work.annee', fontSize: 11 },
                { id: createBlockId(), type: 'field', field: 'work.technique', fontSize: 11 },
                { id: createBlockId(), type: 'field', field: 'work.dimensions', fontSize: 11 },
                { id: createBlockId(), type: 'field', field: 'work.ref', fontSize: 9, color: '#6b6b66' },
              ],
            },
            {
              id: createBlockId(),
              type: 'field',
              field: 'work.image',
              flex: 1,
              imageHeight: 120,
            },
          ],
        },
        { id: createBlockId(), type: 'field', field: 'work.description', fontSize: 10 },
        { id: createBlockId(), type: 'field', field: 'work.prix', fontSize: 12, fontWeight: 'bold' },
      ],
    },
    createdAt: BUILTIN_TS,
    updatedAt: BUILTIN_TS,
  };
}

function cataloguePageTemplate(): DocTemplate {
  const tpl = JSON.parse(JSON.stringify(catalogueJson)) as DocTemplate;
  return migrateTemplatePageSize({
    ...tpl,
    id: 'builtin_catalogue',
    nom: 'Catalogue Cilas',
    createdAt: BUILTIN_TS,
    updatedAt: BUILTIN_TS,
  });
}

function certificatTemplate(): DocTemplate {
  return {
    id: 'builtin_certificat',
    nom: 'Certificat d\'authenticité',
    type: 'certificat',
    format: 'a4',
    margin: 20,
    background: '#f5f2ed',
    root: {
      id: createBlockId(),
      type: 'container',
      direction: 'column',
      gap: 10,
      align: 'stretch',
      padding: 24,
      children: [
        {
          id: createBlockId(),
          type: 'text',
          content: "CERTIFICAT D'AUTHENTICITÉ",
          fontSize: 22,
          fontWeight: 'bold',
          textAlign: 'center',
        },
        {
          id: createBlockId(),
          type: 'text',
          content: "Je soussigné(e), certifie que l'œuvre décrite ci-dessous est une création originale.",
          fontSize: 11,
          textAlign: 'center',
        },
        { id: createBlockId(), type: 'field', field: 'work.titre', fontSize: 14, fontWeight: 'bold' },
        { id: createBlockId(), type: 'field', field: 'artist.nom', fontSize: 12 },
        { id: createBlockId(), type: 'field', field: 'work.annee', fontSize: 11 },
        { id: createBlockId(), type: 'field', field: 'work.technique', fontSize: 11 },
        { id: createBlockId(), type: 'field', field: 'work.dimensions', fontSize: 11 },
        { id: createBlockId(), type: 'field', field: 'work.ref', fontSize: 10, color: '#6b6b66' },
        { id: createBlockId(), type: 'field', field: 'work.description', fontSize: 10 },
        { id: createBlockId(), type: 'spacer', spacerHeight: 24 },
        {
          id: createBlockId(),
          type: 'text',
          content: 'Signature de l\'artiste :',
          fontSize: 10,
        },
      ],
    },
    createdAt: BUILTIN_TS,
    updatedAt: BUILTIN_TS,
  };
}

function presseTemplate(): DocTemplate {
  return {
    id: 'builtin_presse',
    nom: 'Dossier de presse',
    type: 'presse',
    format: 'a4',
    margin: 20,
    background: '#ffffff',
    root: {
      id: createBlockId(),
      type: 'container',
      direction: 'column',
      gap: 8,
      align: 'stretch',
      padding: 16,
      children: [
        {
          id: createBlockId(),
          type: 'text',
          content: 'DOSSIER DE PRESSE',
          fontSize: 20,
          fontWeight: 'bold',
        },
        { id: createBlockId(), type: 'field', field: 'expo.titre', fontSize: 16, fontWeight: 'bold' },
        { id: createBlockId(), type: 'field', field: 'artist.nom', fontSize: 11 },
        { id: createBlockId(), type: 'field', field: 'expo.lieu', fontSize: 11 },
        { id: createBlockId(), type: 'field', field: 'expo.dates', fontSize: 11 },
        { id: createBlockId(), type: 'spacer', spacerHeight: 12 },
        { id: createBlockId(), type: 'field', field: 'artist.bio_fr', fontSize: 10 },
        { id: createBlockId(), type: 'field', field: 'expo.texte_curatorial', fontSize: 10 },
        { id: createBlockId(), type: 'spacer', spacerHeight: 12 },
        { id: createBlockId(), type: 'field', field: 'work.titre', fontSize: 11, fontWeight: 'bold' },
        { id: createBlockId(), type: 'field', field: 'work.technique', fontSize: 10 },
        { id: createBlockId(), type: 'field', field: 'work.dimensions', fontSize: 10 },
        { id: createBlockId(), type: 'field', field: 'artist.email', fontSize: 10 },
        { id: createBlockId(), type: 'field', field: 'artist.site', fontSize: 10 },
      ],
    },
    createdAt: BUILTIN_TS,
    updatedAt: BUILTIN_TS,
  };
}

export const DEFAULT_TEMPLATES: DocTemplate[] = [
  withBuiltinPages(cartelTemplate()),
  withBuiltinPages(ficheTemplate()),
  cataloguePageTemplate(),
  withBuiltinPages(certificatTemplate()),
  withBuiltinPages(presseTemplate()),
];

export function getBuiltinTemplate(id: string): DocTemplate | undefined {
  const tpl = DEFAULT_TEMPLATES.find((t) => t.id === id);
  return tpl ? (JSON.parse(JSON.stringify(tpl)) as DocTemplate) : undefined;
}

/** Retire d'IndexedDB les anciennes copies des modèles par défaut (migration). */
export async function cleanupBuiltinTemplatesFromDb(
  listFn: () => Promise<DocTemplate[]>,
  deleteFn: (id: string) => Promise<void>,
): Promise<void> {
  const all = await listFn();
  for (const t of all) {
    if (t.id.startsWith('builtin_')) {
      await deleteFn(t.id);
    }
  }
}
