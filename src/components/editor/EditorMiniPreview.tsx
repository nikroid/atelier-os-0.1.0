import type { CSSProperties, ReactNode } from 'react';

export const PREVIEW_SCALE = 0.22;
const GHOST_OFFSET_2 = 28;

interface EditorMiniPreviewProps {
  pageW: number;
  pageH: number;
  marginPx: number;
  background: string;
  dynamic?: boolean;
  selected?: boolean;
  children: ReactNode;
}

/** Même géométrie de page que le canevas, réduite par transform (fidèle au rendu éditeur). */
export function EditorMiniPreview({
  pageW,
  pageH,
  marginPx,
  background,
  dynamic,
  selected,
  children,
}: EditorMiniPreviewProps) {
  const ghostSpread = dynamic ? GHOST_OFFSET_2 : 0;
  const contentW = pageW + ghostSpread;
  const contentH = pageH + ghostSpread;
  const scaledW = contentW * PREVIEW_SCALE;
  const scaledH = contentH * PREVIEW_SCALE;

  const pageStyle: CSSProperties = {
    width: pageW,
    height: pageH,
    minHeight: pageH,
    padding: marginPx,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    background,
  };

  return (
    <div
      className={`editor-preview-mini-frame${dynamic ? ' is-dynamic' : ''}${selected ? ' is-selected' : ''}`}
      style={{ width: scaledW, height: scaledH }}
    >
      <div
        className="editor-preview-mini-scaler"
        style={{
          width: contentW,
          height: contentH,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <div className={`editor-preview-mini-stack${dynamic ? ' is-dynamic' : ''}`}>
          {dynamic && (
            <>
              <div
                className="editor-preview-mini-ghost editor-preview-mini-ghost-2"
                style={{ width: pageW, height: pageH, background }}
                aria-hidden
              />
              <div
                className="editor-preview-mini-ghost editor-preview-mini-ghost-1"
                style={{ width: pageW, height: pageH, background }}
                aria-hidden
              />
            </>
          )}
          <div className="tpl-page tpl-page-mini" style={pageStyle}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
