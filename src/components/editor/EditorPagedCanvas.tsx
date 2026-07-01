import { type ReactNode } from 'react';
import type { PageKind } from '../../types/templates';
import { pageContentCssVars } from '../../utils/containerDimensions';

/** Espace vertical entre deux pages dans l'éditeur (px, avant zoom). */
export const EDITOR_PAGE_GAP = 48;
/** Décalage réel du dernier clone visible d'une page dynamique (px, avant zoom). */
export const EDITOR_PAGE_GHOST_OFFSET = 28;
/** Espace supplémentaire sous une page dynamique pour les clones (px, avant zoom). */
export const EDITOR_PAGE_GHOST_SPREAD = 38;
/** Zone sous la dernière page pour le bouton « + Page » (px, avant zoom). */
export const EDITOR_PAGE_TRAILING = EDITOR_PAGE_GAP;

export function editorTrailingAfterPages(
  pages: { kind: PageKind }[],
  trailing = EDITOR_PAGE_TRAILING,
): number {
  const lastPage = pages[pages.length - 1];
  return trailing + (lastPage?.kind === 'dynamic' ? EDITOR_PAGE_GHOST_SPREAD : 0);
}

export function editorGapAfterPage(
  pageKind: PageKind,
  pageGap = EDITOR_PAGE_GAP,
): number {
  return pageGap + (pageKind === 'dynamic' ? EDITOR_PAGE_GHOST_SPREAD : 0);
}

export function editorCanvasContentHeight(
  pages: { kind: PageKind }[],
  pageH: number,
  pageGap = EDITOR_PAGE_GAP,
  trailing = EDITOR_PAGE_TRAILING,
): number {
  const trailingTotal = editorTrailingAfterPages(pages, trailing);
  if (pages.length === 0) return pageH + trailingTotal;
  const gapTotal = pages
    .slice(0, -1)
    .reduce((sum, page) => sum + editorGapAfterPage(page.kind, pageGap), 0);
  return pages.length * pageH + gapTotal + trailingTotal;
}

interface EditorPagedCanvasProps {
  pageW: number;
  pageH: number;
  margin: number;
  zoomScale: number;
  pages: { kind: PageKind }[];
  pageGap?: number;
  trailingHeight?: number;
  children: ReactNode;
}

export function EditorPagedCanvas({
  pageW,
  pageH,
  margin,
  zoomScale,
  pages,
  pageGap = EDITOR_PAGE_GAP,
  trailingHeight = EDITOR_PAGE_TRAILING,
  children,
}: EditorPagedCanvasProps) {
  const pageCount = Math.max(1, pages.length);
  const contentHeight = editorCanvasContentHeight(pages, pageH, pageGap, trailingHeight);
  const scaledW = pageW * zoomScale;
  const scaledH = contentHeight * zoomScale;

  return (
    <div className="editor-paged-canvas" style={{ width: scaledW, height: scaledH }}>
      <div
        className="editor-paged-canvas-scaler"
        style={{
          width: pageW,
          height: contentHeight,
          transform: `scale(${zoomScale})`,
          transformOrigin: 'top left',
        }}
      >
        <div
          className={`tpl-page tpl-page-editor tpl-page-explicit${pageCount > 1 ? ' tpl-page-multi' : ''}`}
          style={{
            width: pageW,
            minHeight: contentHeight,
            padding: 0,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            ...pageContentCssVars(pageW - margin * 2, pageH - margin * 2),
            ['--editor-page-gap' as string]: `${pageGap}px`,
            ['--editor-page-ghost-spread' as string]: `${EDITOR_PAGE_GHOST_SPREAD}px`,
            ['--editor-page-trailing' as string]: `${trailingHeight}px`,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
