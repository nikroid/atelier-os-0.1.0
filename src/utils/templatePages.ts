import { now, uid } from '../db/database';
import type { DocBlock, DocTemplate, DocTemplatePage, PageKind } from '../types/templates';
import type { PageTemplate } from '../types/pageTemplates';
import { createBlockId, duplicateBlock } from './blockTree';
import type { TemplateContext } from './templateFields';
import {
  resolvePageSurfaceBackground,
  type SurfaceBackground,
} from './backgroundStyle';
import { ensureCartelLayout } from './cartelLayout';
import { migrateTemplatePageSize } from './pageLayout';

export function emptyPageRoot(): DocBlock {
  return {
    id: createBlockId(),
    type: 'container',
    containerRole: 'page-content',
    direction: 'column',
    gap: 0,
    align: 'stretch',
    padding: 0,
    children: [],
  };
}

export function defaultPageKindForTemplate(type: DocTemplate['type']): PageKind {
  if (type === 'catalogue_page' || type === 'cartel' || type === 'fiche' || type === 'certificat') {
    return 'dynamic';
  }
  return 'static';
}

export function createTemplatePage(kind: PageKind = 'static'): DocTemplatePage {
  return {
    id: uid('page'),
    kind,
    root: emptyPageRoot(),
  };
}

function tagPageContentRoot(root: DocBlock): DocBlock {
  if (root.type !== 'container') return root;
  if (root.containerRole === 'page-content') return root;
  return { ...root, containerRole: 'page-content' };
}

export function normalizePageTemplate(pageTemplate: PageTemplate): PageTemplate {
  return {
    ...pageTemplate,
    root: tagPageContentRoot(pageTemplate.root),
  };
}

export function createPageTemplateFromPage(page: DocTemplatePage, nom: string): PageTemplate {
  const ts = now();
  return normalizePageTemplate({
    id: uid('pagetpl'),
    nom,
    kind: page.kind,
    root: duplicateBlock(page.root),
    background: page.background,
    backgroundType: page.backgroundType,
    backgroundImage: page.backgroundImage,
    backgroundImageField: page.backgroundImageField,
    backgroundImageFit: page.backgroundImageFit,
    backgroundImageSize: page.backgroundImageSize
      ? JSON.parse(JSON.stringify(page.backgroundImageSize))
      : undefined,
    backgroundImagePosition: page.backgroundImagePosition
      ? JSON.parse(JSON.stringify(page.backgroundImagePosition))
      : undefined,
    createdAt: ts,
    updatedAt: ts,
  });
}

export function instantiatePageTemplate(pageTemplate: PageTemplate): DocTemplatePage {
  const normalized = normalizePageTemplate(pageTemplate);
  return {
    id: uid('page'),
    kind: normalized.kind,
    root: duplicateBlock(normalized.root),
    background: normalized.background,
    backgroundType: normalized.backgroundType,
    backgroundImage: normalized.backgroundImage,
    backgroundImageField: normalized.backgroundImageField,
    backgroundImageFit: normalized.backgroundImageFit,
    backgroundImageSize: normalized.backgroundImageSize
      ? JSON.parse(JSON.stringify(normalized.backgroundImageSize))
      : undefined,
    backgroundImagePosition: normalized.backgroundImagePosition
      ? JSON.parse(JSON.stringify(normalized.backgroundImagePosition))
      : undefined,
  };
}

export function legacyPageId(templateId: string, index = 0): string {
  return `${templateId}_page_${index}`;
}

/** Assure `pages[]` existe (migration depuis l'ancien champ `root` unique). */
export function getTemplatePages(template: DocTemplate): DocTemplatePage[] {
  if (template.pages?.length) return template.pages;
  return [
    {
      id: legacyPageId(template.id),
      kind: defaultPageKindForTemplate(template.type),
      root: template.root,
    },
  ];
}

export function normalizeTemplate(template: DocTemplate): DocTemplate {
  const withSize = migrateTemplatePageSize(template);
  const withCartel = ensureCartelLayout(withSize);
  const pages = getTemplatePages(withCartel).map((p) => ({
    ...p,
    root: tagPageContentRoot(p.root),
  }));
  return {
    ...withCartel,
    pages,
    root: pages[0]?.root ?? withCartel.root,
  };
}

export function syncTemplateRoots(template: DocTemplate): DocTemplate {
  const pages = template.pages?.length ? template.pages : getTemplatePages(template);
  return {
    ...template,
    pages,
    root: pages[0]?.root ?? template.root,
  };
}

export function addTemplatePage(template: DocTemplate, kind: PageKind = 'static'): DocTemplate {
  const pages = [...getTemplatePages(template), createTemplatePage(kind)];
  return syncTemplateRoots({ ...template, pages });
}

export function insertTemplatePage(
  template: DocTemplate,
  afterIndex: number,
  kind: PageKind = 'static',
): DocTemplate {
  const pages = [...getTemplatePages(template)];
  pages.splice(afterIndex + 1, 0, createTemplatePage(kind));
  return syncTemplateRoots({ ...template, pages });
}

export function reorderTemplatePages(
  template: DocTemplate,
  fromIndex: number,
  toIndex: number,
): DocTemplate {
  const pages = [...getTemplatePages(template)];
  if (
    fromIndex === toIndex ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= pages.length ||
    toIndex >= pages.length
  ) {
    return template;
  }
  const [moved] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, moved);
  return syncTemplateRoots({ ...template, pages });
}

export function removeTemplatePage(template: DocTemplate, pageId: string): DocTemplate {
  const pages = getTemplatePages(template).filter((p) => p.id !== pageId);
  if (pages.length === 0) return template;
  return syncTemplateRoots({ ...template, pages });
}

export function updateTemplatePage(
  template: DocTemplate,
  pageId: string,
  patch: Partial<Pick<DocTemplatePage, 'kind' | 'root' | 'background' | 'backgroundType' | 'backgroundImage' | 'backgroundImageField' | 'backgroundImageFit' | 'backgroundImageSize' | 'backgroundImagePosition'>>,
): DocTemplate {
  const pages = getTemplatePages(template).map((p) => (p.id === pageId ? { ...p, ...patch } : p));
  return syncTemplateRoots({ ...template, pages });
}

export function applyPageTemplate(
  template: DocTemplate,
  pageId: string,
  pageTemplate: PageTemplate,
): DocTemplate {
  const instantiated = instantiatePageTemplate(pageTemplate);
  return updateTemplatePage(template, pageId, {
    kind: instantiated.kind,
    root: instantiated.root,
    background: instantiated.background,
    backgroundType: instantiated.backgroundType,
    backgroundImage: instantiated.backgroundImage,
    backgroundImageField: instantiated.backgroundImageField,
    backgroundImageFit: instantiated.backgroundImageFit,
    backgroundImageSize: instantiated.backgroundImageSize,
    backgroundImagePosition: instantiated.backgroundImagePosition,
  });
}

export function updateTemplatePageRoot(
  template: DocTemplate,
  pageId: string,
  rootUpdater: (root: DocBlock) => DocBlock,
): DocTemplate {
  const page = getTemplatePages(template).find((p) => p.id === pageId);
  if (!page) return template;
  return updateTemplatePage(template, pageId, {
    root: rootUpdater(page.root),
  });
}

export interface ExpandedPdfPage {
  root: DocBlock;
  ctx: TemplateContext;
  surface: SurfaceBackground;
}

/** @deprecated Utiliser resolvePageSurfaceBackground */
export { getPageBackground } from './backgroundStyle';

/** Déplie les pages statiques (×1) et dynamiques (× nb de contextes). */
export function expandTemplateForPdf(
  template: DocTemplate,
  contexts: TemplateContext[],
): ExpandedPdfPage[] {
  const pages = getTemplatePages(template);
  const fallbackCtx: TemplateContext = contexts[0] ?? {};
  const result: ExpandedPdfPage[] = [];

  for (const page of pages) {
    if (page.kind === 'dynamic') {
      const ctxList = contexts.length ? contexts : [fallbackCtx];
      for (const ctx of ctxList) {
        const surface = resolvePageSurfaceBackground(page, template, ctx);
        result.push({ root: page.root, ctx, surface });
      }
    } else {
      const surface = resolvePageSurfaceBackground(page, template, fallbackCtx);
      result.push({ root: page.root, ctx: fallbackCtx, surface });
    }
  }

  return result;
}

export function countExpandedPdfPages(template: DocTemplate, dataCount: number): number {
  const pages = getTemplatePages(template);
  const n = Math.max(1, dataCount);
  return pages.reduce((sum, p) => sum + (p.kind === 'dynamic' ? n : 1), 0);
}

export function pageKindLabel(kind: PageKind): string {
  return kind === 'dynamic' ? 'Dynamique' : 'Unique';
}
