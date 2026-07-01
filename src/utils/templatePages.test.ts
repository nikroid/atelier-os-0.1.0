import { describe, expect, it } from 'vitest';
import type { PageTemplate } from '../types/pageTemplates';
import type { DocTemplate } from '../types/templates';
import {
  DEFAULT_EDITOR_TEMPLATE_ID,
  isBuiltinTemplate,
  resolveDefaultEditorTemplateId,
} from './templateCatalog';
import type { TemplateContext } from './templateFields';
import { getPageBackground } from './backgroundStyle';
import {
  applyPageTemplate,
  createPageTemplateFromPage,
  countExpandedPdfPages,
  emptyPageRoot,
  expandTemplateForPdf,
  getTemplatePages,
  instantiatePageTemplate,
  insertTemplatePage,
  legacyPageId,
  normalizePageTemplate,
  normalizeTemplate,
  reorderTemplatePages,
  removeTemplatePage,
} from './templatePages';

function sampleTemplate(overrides: Partial<DocTemplate> = {}): DocTemplate {
  const root = emptyPageRoot();
  return {
    id: 'tpl_test',
    nom: 'Test',
    type: 'custom',
    format: 'a4',
    margin: 12,
    background: '#fff',
    root,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    ...overrides,
  };
}

const ctx = (id: string): TemplateContext => ({
  work: { id, ref: id, titre: id } as TemplateContext['work'],
});

describe('templatePages', () => {
  it('getTemplatePages uses stable legacy page id', () => {
    const tpl = sampleTemplate();
    const pages1 = getTemplatePages(tpl);
    const pages2 = getTemplatePages(tpl);
    expect(pages1[0].id).toBe(legacyPageId('tpl_test'));
    expect(pages2[0].id).toBe(pages1[0].id);
  });

  it('normalizeTemplate persists pages array', () => {
    const normalized = normalizeTemplate(sampleTemplate());
    expect(normalized.pages).toHaveLength(1);
    expect(normalized.pages![0].id).toBe(legacyPageId('tpl_test'));
    expect(normalized.root).toBe(normalized.pages![0].root);
  });

  it('getPageBackground prefers page color over template default', () => {
    const tpl = sampleTemplate({ background: '#111111' });
    const page = { id: 'p1', kind: 'static' as const, root: emptyPageRoot(), background: '#abcdef' };
    expect(getPageBackground(page, tpl)).toBe('#abcdef');
    expect(getPageBackground({ ...page, background: undefined }, tpl)).toBe('#111111');
  });

  it('expandTemplateForPdf includes per-page background', () => {
    const tpl = normalizeTemplate(
      sampleTemplate({
        background: '#111111',
        pages: [
          { id: 'p1', kind: 'static', root: emptyPageRoot(), background: '#aaaaaa' },
          { id: 'p2', kind: 'static', root: emptyPageRoot() },
        ],
      }),
    );
    const expanded = expandTemplateForPdf(tpl, [ctx('a')]);
    expect(expanded[0].surface.color).toBe('#aaaaaa');
    expect(expanded[1].surface.color).toBe('#111111');
  });

  it('expandTemplateForPdf mixes static and dynamic pages', () => {
    const tpl = normalizeTemplate(
      sampleTemplate({
        pages: [
          { id: 'p1', kind: 'static', root: emptyPageRoot() },
          { id: 'p2', kind: 'dynamic', root: emptyPageRoot() },
        ],
      }),
    );
    const expanded = expandTemplateForPdf(tpl, [ctx('a'), ctx('b'), ctx('c')]);
    expect(expanded).toHaveLength(4);
  });

  it('countExpandedPdfPages matches expand length', () => {
    const tpl = normalizeTemplate(
      sampleTemplate({
        pages: [
          { id: 'p1', kind: 'static', root: emptyPageRoot() },
          { id: 'p2', kind: 'dynamic', root: emptyPageRoot() },
        ],
      }),
    );
    const contexts = [ctx('a'), ctx('b'), ctx('c')];
    expect(countExpandedPdfPages(tpl, contexts.length)).toBe(
      expandTemplateForPdf(tpl, contexts).length,
    );
  });

  it('reorderTemplatePages moves a page', () => {
    const tpl = normalizeTemplate(
      sampleTemplate({
        pages: [
          { id: 'p1', kind: 'static', root: emptyPageRoot() },
          { id: 'p2', kind: 'dynamic', root: emptyPageRoot() },
          { id: 'p3', kind: 'static', root: emptyPageRoot() },
        ],
      }),
    );
    const reordered = reorderTemplatePages(tpl, 0, 2);
    expect(reordered.pages!.map((p) => p.id)).toEqual(['p2', 'p3', 'p1']);
  });

  it('insertTemplatePage adds after index', () => {
    const tpl = normalizeTemplate(sampleTemplate());
    const next = insertTemplatePage(tpl, 0, 'dynamic');
    expect(next.pages).toHaveLength(2);
    expect(next.pages![1].kind).toBe('dynamic');
  });

  it('removeTemplatePage keeps at least one page', () => {
    const tpl = normalizeTemplate(sampleTemplate());
    expect(removeTemplatePage(tpl, tpl.pages![0].id)).toEqual(tpl);
  });

  it('normalizePageTemplate tags page-content root', () => {
    const pageTemplate: PageTemplate = {
      id: 'pagetpl_1',
      nom: 'Page test',
      kind: 'dynamic',
      root: { id: 'root1', type: 'container', direction: 'column', children: [] },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const normalized = normalizePageTemplate(pageTemplate);
    expect(normalized.root.containerRole).toBe('page-content');
  });

  it('create and instantiate page template regenerate ids', () => {
    const page = {
      id: 'page_1',
      kind: 'dynamic' as const,
      root: {
        id: 'root_1',
        type: 'container' as const,
        containerRole: 'page-content' as const,
        direction: 'column' as const,
        children: [{ id: 'child_1', type: 'text' as const, content: 'Hello' }],
      },
      background: '#abcdef',
    };
    const pageTemplate = createPageTemplateFromPage(page, 'Modele');
    const instantiated = instantiatePageTemplate(pageTemplate);
    expect(pageTemplate.id).not.toBe(instantiated.id);
    expect(instantiated.root.id).not.toBe(page.root.id);
    expect(instantiated.root.children?.[0].id).not.toBe(page.root.children?.[0].id);
    expect(instantiated.kind).toBe('dynamic');
    expect(instantiated.background).toBe('#abcdef');
  });

  it('applyPageTemplate replaces current page content and metadata', () => {
    const tpl = normalizeTemplate(
      sampleTemplate({
        pages: [
          {
            id: 'p1',
            kind: 'static',
            root: {
              id: 'old_root',
              type: 'container',
              containerRole: 'page-content',
              direction: 'column',
              children: [{ id: 'old_child', type: 'text', content: 'Old' }],
            },
          },
        ],
      }),
    );
    const pageTemplate: PageTemplate = {
      id: 'pagetpl_1',
      nom: 'Page dynamique',
      kind: 'dynamic',
      root: {
        id: 'tpl_root',
        type: 'container',
        containerRole: 'page-content',
        direction: 'column',
        children: [{ id: 'tpl_child', type: 'text', content: 'New' }],
      },
      background: '#123456',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    const next = applyPageTemplate(tpl, 'p1', pageTemplate);
    expect(next.pages?.[0].id).toBe('p1');
    expect(next.pages?.[0].kind).toBe('dynamic');
    expect(next.pages?.[0].background).toBe('#123456');
    expect(next.pages?.[0].root.id).not.toBe('tpl_root');
    expect(next.pages?.[0].root.children?.[0].id).not.toBe('tpl_child');
  });
});

describe('resolveDefaultEditorTemplateId', () => {
  it('returns builtin catalogue when no user templates', () => {
    expect(resolveDefaultEditorTemplateId(undefined)).toBe(DEFAULT_EDITOR_TEMPLATE_ID);
    expect(resolveDefaultEditorTemplateId([])).toBe(DEFAULT_EDITOR_TEMPLATE_ID);
  });

  it('returns most recently updated user template', () => {
    const id = resolveDefaultEditorTemplateId([
      {
        ...sampleTemplate({ id: 'old', updatedAt: '2026-01-01T00:00:00.000Z' }),
      },
      {
        ...sampleTemplate({ id: 'new', updatedAt: '2026-06-01T00:00:00.000Z' }),
      },
    ]);
    expect(id).toBe('new');
  });

  it('does not treat user template as builtin when name matches a default', () => {
    expect(
      isBuiltinTemplate({
        ...sampleTemplate({ id: 'user-custom-1', nom: 'Catalogue' }),
      }),
    ).toBe(false);
    expect(
      isBuiltinTemplate({
        ...sampleTemplate({ id: 'builtin_catalogue', nom: 'Mon catalogue perso' }),
      }),
    ).toBe(true);
  });
});
