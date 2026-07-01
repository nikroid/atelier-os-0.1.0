import jsPDF from 'jspdf';
import type { DocTemplate } from '../types/templates';
import { getTemplatePageDimensions } from './pageLayout';
import type { TemplateContext } from './templateFields';
import { DEFAULT_PAGE_BACKGROUND, type SurfaceBackground } from './backgroundStyle';
import { expandTemplateForPdf, type ExpandedPdfPage } from './templatePages';

export const MM_TO_PX = 3.78;

let html2canvasModule: typeof import('html2canvas') | null = null;

async function getHtml2Canvas() {
  if (!html2canvasModule) {
    html2canvasModule = await import('html2canvas');
  }
  return html2canvasModule.default;
}

export function getPdfRenderPixelSize(template: Pick<DocTemplate, 'format' | 'formatRef' | 'widthMm' | 'heightMm' | 'margin'>) {
  const { w, h } = getTemplatePageDimensions(template);
  const margin = template.margin ?? 12;
  return { w, h, widthPx: w * MM_TO_PX, pageHeightPx: h * MM_TO_PX, marginPx: margin * MM_TO_PX };
}

function preparePdfPageElement(inner: HTMLElement, widthPx: number): void {
  inner.style.width = `${widthPx}px`;
  inner.style.minWidth = `${widthPx}px`;
  inner.style.maxWidth = `${widthPx}px`;
  inner.style.boxSizing = 'border-box';
  inner.style.flexShrink = '0';
}

export async function waitForPdfCaptureReady(container: HTMLElement): Promise<void> {
  await document.fonts.ready;
  const imgs = Array.from(container.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) resolve();
          else {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
          }
        }),
    ),
  );
  await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
}

export async function captureTemplateToCanvas(
  template: DocTemplate,
  rootElement?: HTMLElement | null,
  pageSurface?: SurfaceBackground,
): Promise<HTMLCanvasElement> {
  const pdfSize = getPdfRenderPixelSize(template);
  const bg = pageSurface?.color ?? template.background ?? DEFAULT_PAGE_BACKGROUND;
  const el = rootElement ?? document.getElementById('template-pdf-render');
  if (!el) throw new Error('Élément de rendu introuvable');

  const inner = el.querySelector('.template-pdf-page') as HTMLElement | null;
  if (!inner) throw new Error('Contenu de rendu introuvable');

  preparePdfPageElement(inner, pdfSize.widthPx);
  inner.style.height = `${pdfSize.pageHeightPx}px`;
  inner.style.minHeight = `${pdfSize.pageHeightPx}px`;
  inner.style.maxHeight = `${pdfSize.pageHeightPx}px`;
  await waitForPdfCaptureReady(inner);

  const html2canvas = await getHtml2Canvas();
  return html2canvas(inner, {
    scale: 2,
    width: pdfSize.widthPx,
    height: pdfSize.pageHeightPx,
    windowWidth: pdfSize.widthPx,
    windowHeight: pdfSize.pageHeightPx,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    backgroundColor: bg,
    logging: false,
    onclone: (_doc, clonedEl) => {
      preparePdfPageElement(clonedEl as HTMLElement, pdfSize.widthPx);
      (clonedEl as HTMLElement).style.height = `${pdfSize.pageHeightPx}px`;
      (clonedEl as HTMLElement).style.minHeight = `${pdfSize.pageHeightPx}px`;
    },
  });
}

/** Génère un PDF multi-pages et retourne le blob (sans téléchargement). */
export async function generateTemplateDocumentBlob(
  template: DocTemplate,
  contexts: TemplateContext[],
  rootElement?: HTMLElement | null,
  presetPages?: ExpandedPdfPage[],
  onBeforeEachPage?: (page: ExpandedPdfPage, index: number) => Promise<void>,
): Promise<Blob> {
  const { w, h } = getTemplatePageDimensions(template);
  const expanded = presetPages ?? expandTemplateForPdf(template, contexts);

  const doc = new jsPDF({
    unit: 'mm',
    format: [w, h],
    orientation: w > h ? 'landscape' : 'portrait',
  });

  for (let i = 0; i < expanded.length; i++) {
    const page = expanded[i];
    await onBeforeEachPage?.(page, i);

    const canvas = await captureTemplateToCanvas(template, rootElement, page.surface);
    if (i > 0) doc.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    doc.addImage(imgData, 'JPEG', 0, 0, w, h);
  }

  return doc.output('blob');
}

/** Génère un PDF multi-pages à partir des pages du modèle (simples + dynamiques). */
export async function generateTemplateDocument(
  template: DocTemplate,
  contexts: TemplateContext[],
  filename: string,
  rootElement?: HTMLElement | null,
  /** Pages pré-dépliées (sinon calcul via expandTemplateForPdf). */
  presetPages?: ExpandedPdfPage[],
  onBeforeEachPage?: (page: ExpandedPdfPage, index: number) => Promise<void>,
): Promise<void> {
  const blob = await generateTemplateDocumentBlob(
    template,
    contexts,
    rootElement,
    presetPages,
    onBeforeEachPage,
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
