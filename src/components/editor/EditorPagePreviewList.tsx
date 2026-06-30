import { useState } from 'react';
import type { DocTemplate, DocTemplatePage } from '../../types/templates';
import type { TemplateContext } from '../../utils/templateFields';
import { BlockRenderer } from './BlockRenderer';
import { EditorMiniPreview } from './EditorMiniPreview';

interface EditorPagePreviewListProps {
  pages: DocTemplatePage[];
  activePageIndex: number;
  pageW: number;
  pageH: number;
  marginPx: number;
  template: DocTemplate;
  previewCtx: TemplateContext;
  readonly?: boolean;
  onSelectPage: (index: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
}

export function EditorPagePreviewList({
  pages,
  activePageIndex,
  pageW,
  pageH,
  marginPx,
  template,
  previewCtx,
  readonly,
  onSelectPage,
  onReorderPages,
}: EditorPagePreviewListProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const finishDrag = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleDrop = (targetIndex: number) => {
    if (readonly || dragIndex === null || dragIndex === targetIndex) {
      finishDrag();
      return;
    }
    onReorderPages(dragIndex, targetIndex);
    finishDrag();
  };

  return (
    <div className="editor-page-preview-list" role="list" aria-label="Aperçu des pages">
      {pages.map((page, index) => {
        const isActive = index === activePageIndex;
        const isDragging = dragIndex === index;
        const isDropTarget = dropIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={page.id}
            role="listitem"
            aria-label={`Page ${index + 1}`}
            className={`editor-page-preview-item${isActive ? ' is-active' : ''}${isDragging ? ' is-dragging' : ''}${isDropTarget ? ' is-drop-target' : ''}`}
            onDragOver={(e) => {
              if (readonly || dragIndex === null) return;
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setDropIndex(index);
            }}
            onDragLeave={() => {
              if (dropIndex === index) setDropIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              handleDrop(index);
            }}
          >
            <button
              type="button"
              className="editor-page-preview-select"
              aria-label={`Sélectionner la page ${index + 1}`}
              onClick={() => onSelectPage(index)}
            >
              <EditorMiniPreview
                pageW={pageW}
                pageH={pageH}
                marginPx={marginPx}
                template={template}
                dynamic={page.kind === 'dynamic'}
                selected={isActive}
              >
                <BlockRenderer block={page.root} ctx={previewCtx} mode="preview" />
              </EditorMiniPreview>
            </button>
            {!readonly && pages.length > 1 && (
              <span
                className="editor-page-preview-drag"
                draggable
                title="Glisser pour réorganiser"
                onDragStart={(e) => {
                  setDragIndex(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', String(index));
                }}
                onDragEnd={finishDrag}
              >
                ⠿
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
