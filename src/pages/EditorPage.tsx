import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { BlockPalette } from '../components/editor/BlockPalette';
import { BlockProperties } from '../components/editor/BlockProperties';
import { DropHoverProvider, useDropHover } from '../components/editor/DropHoverContext';
import { EditorBlockTree } from '../components/editor/EditorBlockTree';
import { EditorSidePanel, type EditorSideTab } from '../components/editor/EditorSidePanel';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { BlockRenderer, getPageDimensions } from '../components/editor/BlockRenderer';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { EditorPagePreviewList } from '../components/editor/EditorPagePreviewList';
import { EditorPageSettings } from '../components/editor/EditorPageControls';
import { EDITOR_PAGE_GAP, EDITOR_PAGE_TRAILING, editorGapAfterPage, EditorPagedCanvas } from '../components/editor/EditorPagedCanvas';
import { TemplatePdfRender } from '../components/editor/TemplatePdfRender';
import { Modal } from '../components/Modal';
import { db, now, uid } from '../db/database';
import {
  useAllTemplates,
  useArtistMap,
  useArtists,
  useExhibitions,
  useUserTemplates,
  useWorks,
} from '../hooks/useDatabase';
import { isBuiltinTemplate, resolveDefaultEditorTemplateId, resolveTemplate } from '../utils/templateCatalog';
import type { DocBlock, DocTemplate, DocTemplatePage, FieldKey, PageKind } from '../types/templates';
import { PAGE_FORMATS } from '../types/templates';
import { useUndoHistory } from '../hooks/useUndoHistory';
import {
  addChild,
  createBlockId,
  duplicateBlockAfter,
  findBlock,
  moveBlock,
  moveBlockToParent,
  removeBlock,
  updateBlock,
} from '../utils/blockTree';
import type { TemplateContext } from '../utils/templateFields';
import { enrichTemplateContext } from '../utils/templateMediaContext';
import {
  addTemplatePage,
  createTemplatePage,
  defaultPageKindForTemplate,
  getTemplatePages,
  insertTemplatePage,
  normalizeTemplate,
  reorderTemplatePages,
  removeTemplatePage,
  syncTemplateRoots,
  updateTemplatePage,
  updateTemplatePageRoot,
} from '../utils/templatePages';
import { PageBackgroundSurface } from '../components/editor/PageBackgroundSurface';
import { generateTemplateDocument, getPdfRenderPixelSize } from '../utils/templatePdf';

const ZOOM_MIN = 30;
const ZOOM_MAX = 150;
const ZOOM_STEP = 10;
const ZOOM_DEFAULT = 55;

function EditorDropCanvas({
  pages,
  activePageIndex,
  isReadonly,
  handleDrop,
  onPageBackground,
  onInsertPageAfter,
  onAddPageAtEnd,
  pageW,
  pageH,
  marginPx,
  template,
  zoomScale,
  previewCtx,
  selectedBlockId,
  onSelectBlock,
}: {
  pages: DocTemplatePage[];
  activePageIndex: number;
  isReadonly: boolean;
  handleDrop: (pageIndex: number, parentId: string, data: string, index?: number) => void;
  onPageBackground: (pageIndex: number) => void;
  onInsertPageAfter: (afterIndex: number) => void;
  onAddPageAtEnd: () => void;
  pageW: number;
  pageH: number;
  marginPx: number;
  template: DocTemplate;
  zoomScale: number;
  previewCtx: TemplateContext;
  selectedBlockId: string | null;
  onSelectBlock: (pageIndex: number, blockId: string) => void;
}) {
  const { hover } = useDropHover();
  const activePage = pages[activePageIndex] ?? pages[0];

  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (isReadonly || !activePage) return;
    const payload = e.dataTransfer.getData('application/atelier-block');
    const moveId = e.dataTransfer.getData('application/atelier-block-id');
    const parentId = hover?.parentId ?? activePage.root.id;
    const index = hover?.index;
    if (moveId) handleDrop(activePageIndex, parentId, moveId, index);
    else if (payload) handleDrop(activePageIndex, parentId, payload, index);
  };

  const handleCanvasDragOver = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    e.dataTransfer.dropEffect = types.includes('application/atelier-block-id') ? 'move' : 'copy';
  };

  return (
    <EditorCanvas onDrop={handleCanvasDrop} onDragOver={handleCanvasDragOver}>
      <EditorPagedCanvas
        pageW={pageW}
        pageH={pageH}
        margin={marginPx}
        zoomScale={zoomScale}
        pages={pages}
        pageGap={EDITOR_PAGE_GAP}
        trailingHeight={EDITOR_PAGE_TRAILING}
      >
        {pages.map((page, pageIndex) => {
          const isPageSelected = pageIndex === activePageIndex;
          const isActiveForEdit = isPageSelected && !isReadonly;

          return (
            <div key={page.id} className="editor-page-unit" style={{ width: pageW }}>
              <div
                className={`editor-page-stack${page.kind === 'dynamic' ? ' is-dynamic' : ''}`}
                style={{ width: pageW }}
              >
                {page.kind === 'dynamic' && (
                  <>
                    <div aria-hidden>
                      <PageBackgroundSurface
                        template={template}
                        className="editor-page-ghost editor-page-ghost-2"
                        style={{ width: pageW, height: pageH }}
                      />
                    </div>
                    <div aria-hidden>
                      <PageBackgroundSurface
                        template={template}
                        className="editor-page-ghost editor-page-ghost-1"
                        style={{ width: pageW, height: pageH }}
                      />
                    </div>
                  </>
                )}
                <PageBackgroundSurface
                  template={template}
                  className={`editor-template-page-slot${isPageSelected ? ' is-page-selected' : ''}`}
                  style={{
                    width: pageW,
                    height: pageH,
                    minHeight: pageH,
                    maxHeight: pageH,
                    padding: marginPx,
                    boxSizing: 'border-box',
                    flexShrink: 0,
                    overflow: 'hidden',
                  }}
                  onClick={(e) => {
                    if (e.target === e.currentTarget) onPageBackground(pageIndex);
                  }}
                >
                  <BlockRenderer
                    block={page.root}
                    ctx={previewCtx}
                    mode={isReadonly ? 'preview' : 'edit'}
                    selectedId={isPageSelected ? selectedBlockId : null}
                    onSelect={(id) => onSelectBlock(pageIndex, id)}
                    onPageBackgroundClick={() => onPageBackground(pageIndex)}
                    onDrop={
                      isActiveForEdit
                        ? (parentId, data, index) => handleDrop(pageIndex, parentId, data, index)
                        : undefined
                    }
                  />
                </PageBackgroundSurface>
              </div>

              {pageIndex < pages.length - 1 && (
                <div
                  className="editor-page-gap"
                  style={{ width: pageW, height: editorGapAfterPage(page.kind, EDITOR_PAGE_GAP) }}
                >
                  {page.kind === 'dynamic' && <div className="editor-page-gap-ghost-room" aria-hidden />}
                  <div className="editor-page-gap-bar">
                    {!isReadonly && (
                      <button
                        type="button"
                        className="editor-page-gap-add"
                        title="Insérer une page ici"
                        onClick={() => onInsertPageAfter(pageIndex)}
                      >
                        + Page
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {!isReadonly && (
          <div className="editor-page-trailing" style={{ width: pageW }}>
            <button
              type="button"
              className="editor-page-trailing-add"
              title="Ajouter une page à la fin"
              onClick={onAddPageAtEnd}
            >
              + Page
            </button>
          </div>
        )}
      </EditorPagedCanvas>
    </EditorCanvas>
  );
}

function createBlockFromPayload(json: string): DocBlock | null {
  try {
    const data = JSON.parse(json) as { kind: string; field?: FieldKey; layout?: string };
    const id = createBlockId();
    if (data.kind === 'field' && data.field) {
      return {
        id,
        type: 'field',
        field: data.field,
        fontSize: 11,
        textAlign: data.field.includes('image') || data.field.includes('photo') ? 'center' : 'left',
        imageHeight: data.field === 'work.image' ? 120 : 80,
      };
    }
    if (data.kind === 'layout') {
      switch (data.layout) {
        case 'row':
          return { id, type: 'container', direction: 'row', gap: 0, align: 'flex-start', padding: 0, children: [] };
        case 'column':
          return { id, type: 'container', direction: 'column', gap: 0, align: 'stretch', padding: 0, children: [] };
        case 'columns2':
          return {
            id,
            type: 'container',
            direction: 'row',
            gap: 0,
            align: 'stretch',
            children: [
              { id: createBlockId(), type: 'container', direction: 'column', flex: 1, gap: 0, padding: 0, children: [] },
              { id: createBlockId(), type: 'container', direction: 'column', flex: 1, gap: 0, padding: 0, children: [] },
            ],
          };
        case 'columns3':
          return {
            id,
            type: 'container',
            direction: 'row',
            gap: 0,
            align: 'stretch',
            children: [1, 2, 3].map(() => ({
              id: createBlockId(),
              type: 'container' as const,
              direction: 'column' as const,
              flex: 1,
              gap: 0,
              padding: 0,
              children: [],
            })),
          };
        case 'text':
          return { id, type: 'text', content: 'Votre texte…', fontSize: 11, textAlign: 'left' };
        case 'spacer':
          return { id, type: 'spacer', spacerHeight: 16 };
        case 'image':
          return { id, type: 'image', imageHeight: 80, objectFit: 'cover' };
        case 'rectangle':
          return {
            id,
            type: 'rectangle',
            width: '100%',
            selfAlign: 'center',
            rectHeight: 24,
            backgroundColor: '#e8e4dc',
            borderColor: '#d4d0c8',
            borderWidth: 1,
          };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function newEmptyTemplate(): DocTemplate {
  const ts = now();
  const page = createTemplatePage('static');
  return {
    id: uid('tpl'),
    nom: 'Nouveau modèle',
    type: 'custom',
    format: 'a4',
    margin: 12,
    background: '#f5f2ed',
    root: page.root,
    pages: [page],
    createdAt: ts,
    updatedAt: ts,
  };
}

export function EditorPage() {
  const allTemplates = useAllTemplates();
  const userTemplates = useUserTemplates();
  const works = useWorks();
  const artists = useArtists();
  const exhibitions = useExhibitions();
  const artistMap = useArtistMap(artists);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sideTab, setSideTab] = useState<EditorSideTab>('props');
  const [previewWorkId, setPreviewWorkId] = useState('');
  const [previewExpoId, setPreviewExpoId] = useState('');
  const [saved, setSaved] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [zoom, setZoom] = useState(ZOOM_DEFAULT);
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [pdfRender, setPdfRender] = useState<{
    template: DocTemplate;
    ctx: TemplateContext;
    root?: DocBlock;
  } | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const history = useUndoHistory<DocTemplate | null>(null);
  const selectedBlockIdRef = useRef<string | null>(null);
  selectedBlockIdRef.current = selectedBlockId;

  const draft = history.present;

  useEffect(() => {
    if (!allTemplates?.length || activeId) return;
    setActiveId(resolveDefaultEditorTemplateId(userTemplates));
  }, [allTemplates, userTemplates, activeId]);

  useEffect(() => {
    if (!activeId) return;
    const tpl = resolveTemplate(activeId, userTemplates);
    if (tpl) {
      const copy = normalizeTemplate(JSON.parse(JSON.stringify(tpl)) as DocTemplate);
      if (!copy.format) copy.format = 'a4';
      if (copy.margin === undefined) copy.margin = 12;
      history.reset(copy);
      setSelectedBlockId(null);
      setActivePageIndex(0);
      setSaved(true);
    }
  }, [activeId, userTemplates]);

  const basePreviewCtx = useMemo((): TemplateContext => {
    const work = works?.find((w) => w.id === previewWorkId) ?? works?.[0];
    const artist = work ? artistMap.get(work.artisteId) : artists?.[0];
    const exhibition = exhibitions?.find((e) => e.id === previewExpoId) ?? exhibitions?.[0];
    return { work, artist, exhibition };
  }, [works, previewWorkId, artistMap, artists, exhibitions, previewExpoId]);

  const [previewCtx, setPreviewCtx] = useState<TemplateContext>(basePreviewCtx);

  useEffect(() => {
    let cancelled = false;
    void enrichTemplateContext(basePreviewCtx).then((ctx) => {
      if (!cancelled) setPreviewCtx(ctx);
    });
    return () => {
      cancelled = true;
    };
  }, [basePreviewCtx]);

  const templatePages = useMemo(
    () => (draft ? getTemplatePages(draft) : []),
    [draft],
  );
  const activePage = templatePages[activePageIndex] ?? templatePages[0];

  const selectedBlock =
    draft && activePage && selectedBlockId ? findBlock(activePage.root, selectedBlockId) : null;

  const isReadonly = draft ? isBuiltinTemplate(draft) : false;
  const customTemplates = userTemplates?.filter((t) => !isBuiltinTemplate(t)) ?? [];

  const commitDraft = useCallback(
    (updater: (t: DocTemplate) => DocTemplate) => {
      if (isReadonly) return;
      const current = history.present;
      if (!current) return;
      history.push(updater(current));
      setSaved(false);
    },
    [isReadonly, history],
  );

  const patchDraft = commitDraft;

  const commitPageRoot = useCallback(
    (pageId: string, rootUpdater: (root: DocBlock) => DocBlock) => {
      commitDraft((t) => updateTemplatePageRoot(t, pageId, rootUpdater));
    },
    [commitDraft],
  );

  const handleDrop = useCallback(
    (pageIndex: number, parentId: string, data: string, index?: number) => {
      if (!draft) return;
      const page = getTemplatePages(draft)[pageIndex];
      if (!page) return;
      const isPayload = data.startsWith('{');
      if (!isPayload) {
        commitPageRoot(page.id, (root) => moveBlockToParent(root, data, parentId, index));
        return;
      }
      const newBlock = createBlockFromPayload(data);
      if (!newBlock) return;
      commitPageRoot(page.id, (root) => addChild(root, parentId, newBlock, index));
    },
    [draft, commitPageRoot],
  );

  const handleBlockChange = useCallback(
    (patch: Partial<DocBlock>) => {
      const id = selectedBlockIdRef.current;
      const page = templatePages[activePageIndex];
      if (!id || !page) return;
      commitPageRoot(page.id, (root) => updateBlock(root, id, patch));
    },
    [commitPageRoot, templatePages, activePageIndex],
  );

  const handleBlockMove = useCallback(
    (dir: 'up' | 'down') => {
      const id = selectedBlockIdRef.current;
      const page = templatePages[activePageIndex];
      if (!id || !page) return;
      commitPageRoot(page.id, (root) => moveBlock(root, id, dir));
    },
    [commitPageRoot, templatePages, activePageIndex],
  );

  const handleBlockDelete = useCallback(() => {
    const id = selectedBlockIdRef.current;
    const page = templatePages[activePageIndex];
    if (!id || !page || id === page.root.id) return;
    commitPageRoot(page.id, (root) => removeBlock(root, id));
    setSelectedBlockId(null);
  }, [commitPageRoot, templatePages, activePageIndex]);

  const handleBlockDuplicate = useCallback(() => {
    const id = selectedBlockIdRef.current;
    const page = templatePages[activePageIndex];
    if (!id || !page || id === page.root.id) return;
    commitPageRoot(page.id, (root) => duplicateBlockAfter(root, id));
  }, [commitPageRoot, templatePages, activePageIndex]);

  const handleUndo = useCallback(() => {
    if (history.undo()) setSaved(false);
  }, [history]);

  const handleRedo = useCallback(() => {
    if (history.redo()) setSaved(false);
  }, [history]);

  useEffect(() => {
    if (!templatePages.length) return;
    setActivePageIndex((i) => Math.min(i, templatePages.length - 1));
  }, [templatePages.length]);

  const previewPdf = async () => {
    if (!draft) return;
    setPdfLoading(true);
    try {
      await generateTemplateDocument(
        draft,
        [previewCtx],
        `${draft.type}-apercu.pdf`,
        undefined,
        undefined,
        async (root, ctx) => {
          flushSync(() => setPdfRender({ template: draft, ctx, root }));
        },
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erreur aperçu PDF');
    } finally {
      setPdfRender(null);
      setPdfLoading(false);
    }
  };

  const handleAddPageAtEnd = useCallback(() => {
    const nextIndex = templatePages.length;
    commitDraft((t) => addTemplatePage(t, defaultPageKindForTemplate(t.type)));
    setActivePageIndex(nextIndex);
    setSelectedBlockId(null);
  }, [commitDraft, templatePages.length]);

  const handleInsertPageAfter = useCallback(
    (afterIndex: number) => {
      const nextIndex = afterIndex + 1;
      commitDraft((t) => insertTemplatePage(t, afterIndex, defaultPageKindForTemplate(t.type)));
      setActivePageIndex(nextIndex);
      setSelectedBlockId(null);
    },
    [commitDraft],
  );

  const handlePageBackground = useCallback((pageIndex: number) => {
    setActivePageIndex(pageIndex);
    setSelectedBlockId(null);
    setSideTab('props');
  }, []);

  const handleSelectBlock = useCallback((pageIndex: number, blockId: string) => {
    setActivePageIndex(pageIndex);
    setSelectedBlockId(blockId);
    setSideTab('props');
  }, []);

  const handleRemovePage = useCallback(
    (pageId: string) => {
      if (templatePages.length <= 1) return;
      const removedIndex = templatePages.findIndex((p) => p.id === pageId);
      if (removedIndex < 0) return;
      commitDraft((t) => removeTemplatePage(t, pageId));
      setActivePageIndex((active) => {
        const newLength = templatePages.length - 1;
        if (active === removedIndex) return Math.min(removedIndex, newLength - 1);
        if (active > removedIndex) return active - 1;
        return active;
      });
      setSelectedBlockId(null);
    },
    [commitDraft, templatePages],
  );

  const handlePageKindChange = useCallback(
    (kind: PageKind) => {
      if (!activePage) return;
      commitDraft((t) => updateTemplatePage(t, activePage.id, { kind }));
    },
    [commitDraft, activePage],
  );

  const handleReorderPages = useCallback(
    (fromIndex: number, toIndex: number) => {
      commitDraft((t) => reorderTemplatePages(t, fromIndex, toIndex));
      setActivePageIndex((current) => {
        if (current === fromIndex) return toIndex;
        if (fromIndex < current && toIndex >= current) return current - 1;
        if (fromIndex > current && toIndex <= current) return current + 1;
        return current;
      });
      setSelectedBlockId(null);
    },
    [commitDraft],
  );

  const handleSelectPageFromPreview = useCallback((pageIndex: number) => {
    setActivePageIndex(pageIndex);
    setSelectedBlockId(null);
  }, []);

  const save = async () => {
    if (!draft || isReadonly) return;
    const updated = syncTemplateRoots({ ...draft, updatedAt: now() });
    await db.templates.put(updated);
    setSaved(true);
    setActiveId(updated.id);
  };

  const createNew = async () => {
    const tpl = newEmptyTemplate();
    await db.templates.add(tpl);
    setActiveId(tpl.id);
  };

  const createCopy = async () => {
    if (!draft) return;
    const copy = {
      ...JSON.parse(JSON.stringify(draft)),
      id: uid('tpl'),
      nom: isReadonly ? `${draft.nom} (personnalisé)` : `${draft.nom} (copie)`,
      createdAt: now(),
      updatedAt: now(),
    } as DocTemplate;
    await db.templates.add(copy);
    setActiveId(copy.id);
  };

  const requestRemove = () => {
    if (!draft || isReadonly) return;
    setDeleteModalOpen(true);
  };

  const confirmRemove = async () => {
    if (!draft || isReadonly) return;
    await db.templates.delete(draft.id);
    const remaining = userTemplates?.filter((t) => t.id !== draft.id) ?? [];
    setActiveId(resolveDefaultEditorTemplateId(remaining));
    history.reset(null);
    setDeleteModalOpen(false);
  };

  useEffect(() => {
    if (isReadonly) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) handleRedo();
          else handleUndo();
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleBlockDelete();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        handleBlockDuplicate();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isReadonly, handleBlockDelete, handleBlockDuplicate, handleUndo, handleRedo]);

  const pageDims = draft ? getPageDimensions(draft.format) : { w: 210, h: 297 };
  const printSize = draft ? getPdfRenderPixelSize(draft.format, draft.margin) : null;
  const pageW = printSize?.widthPx ?? pageDims.w * 3.78;
  const pageH = printSize?.pageHeightPx ?? pageDims.h * 3.78;
  const marginPx = printSize?.marginPx ?? (draft?.margin ?? 12) * 3.78;
  const zoomScale = zoom / 100;

  useEffect(() => {
    if (!pageW) return;
    const fitZoomToScreen = () => {
      const narrow = window.innerWidth < 900;
      if (!narrow) return;
      const padding = 48;
      const available = window.innerWidth - padding;
      const fit = Math.floor((available / pageW) * 100);
      setZoom(Math.max(ZOOM_MIN, Math.min(100, fit)));
    };
    fitZoomToScreen();
    window.addEventListener('resize', fitZoomToScreen);
    return () => window.removeEventListener('resize', fitZoomToScreen);
  }, [pageW, draft?.format]);

  return (
    <div className="editor-page">
      <header className="editor-page-header">
        <h1>Éditeur de modèles</h1>
      </header>

      <div className="editor-workspace">
        <EditorToolbar
          activeId={activeId}
          onActiveIdChange={setActiveId}
          allTemplates={allTemplates}
          customTemplates={customTemplates}
          draft={draft}
          isReadonly={isReadonly}
          saved={saved}
          onPatchDraft={patchDraft}
          onSave={save}
          onCreateNew={createNew}
          onCreateCopy={createCopy}
          onRemove={requestRemove}
        />

        <Modal
          open={deleteModalOpen}
          title="Supprimer le modèle"
          onClose={() => setDeleteModalOpen(false)}
        >
          <p>
            Supprimer le modèle <strong>{draft?.nom}</strong> ? Cette action est irréversible.
          </p>
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setDeleteModalOpen(false)}>
              Annuler
            </button>
            <button type="button" className="btn btn-danger" onClick={confirmRemove}>
              Supprimer définitivement
            </button>
          </div>
        </Modal>

        {isReadonly && draft && (
          <div className="template-readonly-banner template-readonly-banner-compact">
            <strong>Modèle par défaut</strong> — lecture seule. Créez une copie pour personnaliser.
          </div>
        )}

        {!draft ? (
          <div className="empty-state">
            <p>Aucun modèle. Créez-en un ou chargez les modèles par défaut.</p>
            <button type="button" className="btn btn-primary" onClick={createNew}>
              Créer un modèle
            </button>
          </div>
        ) : (
          <div className={`editor-layout${isReadonly ? ' editor-layout-readonly' : ''}`}>
            {!isReadonly && <BlockPalette />}

            <div className="editor-canvas-wrap">
              <div className="editor-canvas-header editor-canvas-header-slim">
                <span className="editor-canvas-title">
                  {PAGE_FORMATS.find((f) => f.value === draft.format)?.label ?? 'A4'}
                  {draft.margin > 0 && ` · ${draft.margin} mm`}
                </span>
                <div className="editor-canvas-zoom">
                  <div className="zoom-controls" role="group" aria-label="Zoom">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm zoom-btn"
                      disabled={zoom <= ZOOM_MIN}
                      onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z - ZOOM_STEP))}
                      title="Dézoomer"
                    >
                      −
                    </button>
                    <span className="zoom-label">{zoom}%</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm zoom-btn"
                      disabled={zoom >= ZOOM_MAX}
                      onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z + ZOOM_STEP))}
                      title="Zoomer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="editor-canvas-actions">
                  {!isReadonly && (
                    <div className="editor-canvas-history" role="group" aria-label="Historique">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm editor-history-btn"
                        onClick={handleUndo}
                        title="Annuler (Ctrl+Z)"
                        aria-label="Annuler"
                      >
                        ↩
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm editor-history-btn"
                        onClick={handleRedo}
                        title="Rétablir (Ctrl+Shift+Z)"
                        aria-label="Rétablir"
                      >
                        ↪
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    disabled={pdfLoading}
                    onClick={previewPdf}
                  >
                    {pdfLoading ? '…' : 'Aperçu PDF'}
                  </button>
                  {templatePages.length > 0 && (
                    <span className="page-count-badge">{templatePages.length} page(s)</span>
                  )}
                </div>
              </div>
              <DropHoverProvider>
                <EditorDropCanvas
                  pages={templatePages}
                  activePageIndex={activePageIndex}
                  isReadonly={isReadonly}
                  handleDrop={handleDrop}
                  onPageBackground={handlePageBackground}
                  onInsertPageAfter={handleInsertPageAfter}
                  onAddPageAtEnd={handleAddPageAtEnd}
                  pageW={pageW}
                  pageH={pageH}
                  marginPx={marginPx}
                  template={draft}
                  zoomScale={zoomScale}
                  previewCtx={previewCtx}
                  selectedBlockId={selectedBlockId}
                  onSelectBlock={handleSelectBlock}
                />
              </DropHoverProvider>
            </div>

            <EditorSidePanel
              activeTab={sideTab}
              onTabChange={setSideTab}
              readonly={isReadonly}
              readonlyContent={
                <div className="editor-readonly-side">
                  <h3>Modèle verrouillé</h3>
                  <p className="hint">
                    Les modèles par défaut ne peuvent pas être modifiés. Utilisez « Personnaliser » pour enregistrer
                    votre propre version.
                  </p>
                  <button type="button" className="btn btn-primary btn-sm" onClick={createCopy}>
                    Créer une copie
                  </button>
                </div>
              }
              properties={
                <>
                  {activePage && !isReadonly && !selectedBlockId && draft && (
                    <EditorPageSettings
                      page={activePage}
                      pageIndex={activePageIndex}
                      pageCount={templatePages.length}
                      template={draft}
                      templateId={draft.id}
                      onPatchTemplate={(patch) => patchDraft((t) => ({ ...t, ...patch }))}
                      onKindChange={handlePageKindChange}
                      onRemove={() => handleRemovePage(activePage.id)}
                    />
                  )}
                  {selectedBlockId && (
                    <BlockProperties
                      block={selectedBlock}
                      previewCtx={previewCtx}
                      templateId={draft?.id ?? ''}
                      canDelete={Boolean(
                        selectedBlockId && activePage && selectedBlockId !== activePage.root.id,
                      )}
                      onChange={handleBlockChange}
                      onMove={handleBlockMove}
                      onDelete={handleBlockDelete}
                      onDuplicate={handleBlockDuplicate}
                    />
                  )}
                </>
              }
              tree={
                activePage ? (
                  <EditorBlockTree
                    root={activePage.root}
                    selectedId={selectedBlockId}
                    onSelect={(id) => {
                      if (id === activePage.root.id) setSelectedBlockId(null);
                      else setSelectedBlockId(id);
                      setSideTab('props');
                    }}
                  />
                ) : null
              }
              preview={
                <div className="editor-preview-tab">
                  <label className="editor-preview-field">
                    <span className="editor-compact-label">Œuvre (aperçu)</span>
                    <select
                      value={previewWorkId || works?.[0]?.id || ''}
                      onChange={(e) => setPreviewWorkId(e.target.value)}
                    >
                      {works?.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.titre}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="editor-preview-field">
                    <span className="editor-compact-label">Exposition (expo.*)</span>
                    <select
                      value={previewExpoId || exhibitions?.[0]?.id || ''}
                      onChange={(e) => setPreviewExpoId(e.target.value)}
                    >
                      {exhibitions?.map((ex) => (
                        <option key={ex.id} value={ex.id}>
                          {ex.titre}
                        </option>
                      ))}
                    </select>
                  </label>
                  {templatePages.length > 0 && (
                    <EditorPagePreviewList
                      pages={templatePages}
                      activePageIndex={activePageIndex}
                      pageW={pageW}
                      pageH={pageH}
                      marginPx={marginPx}
                      template={draft}
                      previewCtx={previewCtx}
                      readonly={isReadonly}
                      onSelectPage={handleSelectPageFromPreview}
                      onReorderPages={handleReorderPages}
                    />
                  )}
                </div>
              }
            />
          </div>
        )}
      </div>

      {pdfRender && (
        <TemplatePdfRender template={pdfRender.template} ctx={pdfRender.ctx} root={pdfRender.root} />
      )}
    </div>
  );
}
