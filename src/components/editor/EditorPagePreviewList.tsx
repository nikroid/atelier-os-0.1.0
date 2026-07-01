import { useRef, useState, type DragEvent } from 'react';
import type { DocTemplate, DocTemplatePage } from '../../types/templates';
import { pageSurfaceToCss } from '../../utils/backgroundStyle';
import type { TemplateContext } from '../../utils/templateFields';
import { BlockRenderer } from './BlockRenderer';
import { CartelPlateMiniPreview } from './CartelEditor';
import { EditorMiniPreview } from './EditorMiniPreview';

const PAGE_INDEX_MIME = 'application/atelier-page-index';

type DropPosition = 'before' | 'after';

interface EditorPagePreviewListProps {
  pages: DocTemplatePage[];
  activePageIndex: number;
  pageW: number;
  pageH: number;
  marginPx: number;
  templateBackground: string;
  previewCtx: TemplateContext;
  readonly?: boolean;
  isCartel?: boolean;
  cartelTemplate?: DocTemplate;
  onSelectPage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
}

function getDropPosition(e: DragEvent): DropPosition {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return (e.clientY - rect.top) / Math.max(rect.height, 1) < 0.5 ? 'before' : 'after';
}

function resolveInsertIndex(fromIndex: number, targetIndex: number, position: DropPosition): number {
  if (position === 'before') {
    return fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
  }
  return fromIndex < targetIndex ? targetIndex : targetIndex + 1;
}

export function EditorPagePreviewList({
  pages,
  activePageIndex,
  pageW,
  pageH,
  marginPx,
  templateBackground,
  previewCtx,
  readonly,
  isCartel = false,
  cartelTemplate,
  onSelectPage,
  onReorderPages,
}: EditorPagePreviewListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ index: number; position: DropPosition } | null>(
    null,
  );
  const didDragRef = useRef(false);

  const canReorder = !readonly && pages.length > 1;

  const finishDrag = () => {
    setDragIndex(null);
    setDropTarget(null);
    requestAnimationFrame(() => {
      didDragRef.current = false;
    });
  };

  const handleDrop = (targetIndex: number, position: DropPosition) => {
    if (!canReorder || dragIndex === null) {
      finishDrag();
      return;
    }
    const insertAt = resolveInsertIndex(dragIndex, targetIndex, position);
    if (dragIndex !== insertAt) {
      onReorderPages(dragIndex, insertAt);
    }
    finishDrag();
  };

  return (
    <div className="editor-page-preview-list" role="list" aria-label="Aperçu des pages">
      {pages.map((page, index) => {
        const isActive = index === activePageIndex;
        const isDragging = dragIndex === index;
        const isDropBefore =
          dropTarget?.index === index && dropTarget.position === 'before' && dragIndex !== index;
        const isDropAfter =
          dropTarget?.index === index && dropTarget.position === 'after' && dragIndex !== index;

        const pageSurfaceCss = pageSurfaceToCss(page, { background: templateBackground }, previewCtx);

        const showPlatePreview = isCartel && cartelTemplate && page.kind === 'dynamic';

        return (
          <div
            key={page.id}
            role="listitem"
            aria-label={`Page ${index + 1}`}
            className={[
              'editor-page-preview-item',
              isActive ? 'is-active' : '',
              isDragging ? 'is-dragging' : '',
              isDropBefore ? 'is-drop-before' : '',
              isDropAfter ? 'is-drop-after' : '',
              canReorder ? 'is-draggable' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            draggable={canReorder}
            onDragStart={(e) => {
              if (!canReorder) return;
              didDragRef.current = true;
              setDragIndex(index);
              e.dataTransfer.setData(PAGE_INDEX_MIME, String(index));
              e.dataTransfer.effectAllowed = 'move';
            }}
            onDragEnd={finishDrag}
            onDragOver={(e) => {
              if (!canReorder || dragIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropTarget({ index, position: getDropPosition(e) });
            }}
            onDragLeave={(e) => {
              if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
                setDropTarget((current) => (current?.index === index ? null : current));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!canReorder || dragIndex === null) return;
              handleDrop(index, getDropPosition(e));
            }}
            onClick={() => {
              if (!didDragRef.current) onSelectPage(index);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectPage(index);
              }
            }}
            tabIndex={0}
          >
            {showPlatePreview ? (
              <CartelPlateMiniPreview
                template={cartelTemplate}
                root={page.root}
                previewCtx={previewCtx}
                cartelPageW={pageW}
                cartelPageH={pageH}
                marginPx={marginPx}
                selected={isActive}
              />
            ) : (
              <EditorMiniPreview
                pageW={pageW}
                pageH={pageH}
                marginPx={marginPx}
                surfaceStyle={pageSurfaceCss}
                dynamic={page.kind === 'dynamic'}
                selected={isActive}
              >
                <BlockRenderer block={page.root} ctx={previewCtx} mode="preview" />
              </EditorMiniPreview>
            )}
            {canReorder && (
              <span className="editor-page-preview-drag" aria-hidden>
                ⠿
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
