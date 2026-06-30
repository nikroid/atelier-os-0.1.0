import type { CSSProperties } from 'react';
import { BlockRenderer } from './BlockRenderer';
import type { DocBlock, DocTemplate } from '../../types/templates';
import type { TemplateContext } from '../../utils/templateFields';
import { getPdfRenderPixelSize } from '../../utils/templatePdf';
import { getTemplatePages } from '../../utils/templatePages';
import { PageBackgroundSurface } from './PageBackgroundSurface';

interface TemplatePdfRenderProps {
  template: DocTemplate;
  ctx: TemplateContext;
  /** Racine à rendre (sinon première page ou `template.root`). */
  root?: DocBlock;
}

/** Conteneur hors écran à largeur d'impression fixe — ne doit pas hériter du responsive. */
export function TemplatePdfRender({ template, ctx, root }: TemplatePdfRenderProps) {
  const pdfSize = getPdfRenderPixelSize(template.format, template.margin);
  const block = root ?? getTemplatePages(template)[0]?.root ?? template.root;

  const pageStyle: CSSProperties = {
    width: pdfSize.widthPx,
    minWidth: pdfSize.widthPx,
    maxWidth: pdfSize.widthPx,
    height: pdfSize.pageHeightPx,
    minHeight: pdfSize.pageHeightPx,
    padding: pdfSize.marginPx,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div id="template-pdf-render" className="template-pdf-render" aria-hidden>
      <PageBackgroundSurface template={template} className="template-pdf-page" style={pageStyle}>
        <BlockRenderer block={block} ctx={ctx} mode="preview" />
      </PageBackgroundSurface>
    </div>
  );
}
