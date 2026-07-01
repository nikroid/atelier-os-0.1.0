import type { CSSProperties } from 'react';
import { BlockRenderer } from './BlockRenderer';
import type { DocBlock, DocTemplate } from '../../types/templates';
import type { TemplateContext } from '../../utils/templateFields';
import { getPdfRenderPixelSize } from '../../utils/templatePdf';
import { getTemplatePages } from '../../utils/templatePages';
import { pageContentCssVars } from '../../utils/containerDimensions';
import {
  resolvePageSurfaceBackground,
  surfaceBackgroundToCss,
  type SurfaceBackground,
} from '../../utils/backgroundStyle';

interface TemplatePdfRenderProps {
  template: DocTemplate;
  ctx: TemplateContext;
  /** Racine à rendre (sinon première page ou `template.root`). */
  root?: DocBlock;
  /** Fond de la page rendue (sinon première page / défaut modèle). */
  pageSurface?: SurfaceBackground;
}

/** Conteneur hors écran à largeur d'impression fixe — ne doit pas hériter du responsive. */
export function TemplatePdfRender({ template, ctx, root, pageSurface }: TemplatePdfRenderProps) {
  const pdfSize = getPdfRenderPixelSize(template);
  const pages = getTemplatePages(template);
  const block = root ?? pages[0]?.root ?? template.root;
  const surface =
    pageSurface ??
    (pages[0] ? resolvePageSurfaceBackground(pages[0], template) : null);

  const contentW = pdfSize.widthPx - pdfSize.marginPx * 2;
  const contentH = pdfSize.pageHeightPx - pdfSize.marginPx * 2;

  const pageStyle: CSSProperties = {
    width: pdfSize.widthPx,
    minWidth: pdfSize.widthPx,
    maxWidth: pdfSize.widthPx,
    height: pdfSize.pageHeightPx,
    minHeight: pdfSize.pageHeightPx,
    ...surfaceBackgroundToCss(surface),
    padding: pdfSize.marginPx,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    ...pageContentCssVars(contentW, contentH),
  };

  return (
    <div id="template-pdf-render" className="template-pdf-render" aria-hidden>
      <div className="template-pdf-page" style={pageStyle}>
        <BlockRenderer block={block} ctx={ctx} mode="preview" />
      </div>
    </div>
  );
}
