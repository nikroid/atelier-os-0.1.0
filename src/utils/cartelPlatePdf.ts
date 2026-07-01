import jsPDF from 'jspdf';
import type { DocTemplate, DocTemplatePage } from '../types/templates';
import type { TemplateContext } from './templateFields';
import { getCartelPlateGeometry, resolveCartelLayout } from './cartelLayout';
import { PDFDocument } from 'pdf-lib';
import { resolvePageSurfaceBackground } from './backgroundStyle';
import { captureTemplateToCanvas, generateTemplateDocumentBlob } from './templatePdf';
import { getTemplatePages, type ExpandedPdfPage } from './templatePages';

function drawCornerCropJsPdf(
  doc: jsPDF,
  xMm: number,
  yMm: number,
  dirs: { left?: boolean; right?: boolean; up?: boolean; down?: boolean },
) {
  const gap = 1.5;
  const len = 5;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.21);
  if (dirs.left) doc.line(xMm - gap - len, yMm, xMm - gap, yMm);
  if (dirs.right) doc.line(xMm + gap, yMm, xMm + gap + len, yMm);
  if (dirs.up) doc.line(xMm, yMm - gap - len, xMm, yMm - gap);
  if (dirs.down) doc.line(xMm, yMm + gap, xMm, yMm + gap + len);
}

function drawGridCropMarksJsPdf(
  doc: jsPDF,
  offX: number,
  offY: number,
  cols: number,
  rows: number,
  cartelW: number,
  cartelH: number,
) {
  const gridW = cols * cartelW;
  const gridH = rows * cartelH;
  const right = offX + gridW;
  const bottom = offY + gridH;
  drawCornerCropJsPdf(doc, offX, offY, { left: true, up: true });
  drawCornerCropJsPdf(doc, right, offY, { right: true, up: true });
  drawCornerCropJsPdf(doc, offX, bottom, { left: true, down: true });
  drawCornerCropJsPdf(doc, right, bottom, { right: true, down: true });
  for (let c = 1; c < cols; c++) {
    const x = offX + c * cartelW;
    drawCornerCropJsPdf(doc, x, offY, { up: true });
    drawCornerCropJsPdf(doc, x, bottom, { down: true });
  }
  for (let r = 1; r < rows; r++) {
    const y = offY + r * cartelH;
    drawCornerCropJsPdf(doc, offX, y, { left: true });
    drawCornerCropJsPdf(doc, right, y, { right: true });
  }
}

function resolveCartelDynamicPage(template: DocTemplate): DocTemplatePage {
  const pages = getTemplatePages(template);
  return pages.find((p) => p.kind === 'dynamic') ?? pages[0];
}

export async function generateCartelPlatePdfBytes(
  template: DocTemplate,
  templatePage: DocTemplatePage,
  contexts: TemplateContext[],
  rootElement?: HTMLElement | null,
  onBeforeCapture?: (page: ExpandedPdfPage, globalIdx: number) => Promise<void>,
): Promise<Uint8Array> {
  if (!contexts.length) throw new Error('Aucune œuvre sélectionnée');

  const layout = resolveCartelLayout(template);
  const { cols, rows, perPage, offX, offY } = getCartelPlateGeometry(layout);
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

  for (let pageIndex = 0; pageIndex < Math.ceil(contexts.length / perPage); pageIndex++) {
    if (pageIndex > 0) doc.addPage('a4', 'portrait');

    if (layout.showBorders) {
      doc.setDrawColor(242, 242, 242);
      doc.setLineWidth(0.15);
      for (let slot = 0; slot < perPage; slot++) {
        const col = slot % cols;
        const row = Math.floor(slot / cols);
        doc.rect(offX + col * layout.widthMm, offY + row * layout.heightMm, layout.widthMm, layout.heightMm, 'S');
      }
    }

    drawGridCropMarksJsPdf(doc, offX, offY, cols, rows, layout.widthMm, layout.heightMm);

    for (let slot = 0; slot < perPage; slot++) {
      const globalIdx = pageIndex * perPage + slot;
      if (globalIdx >= contexts.length) break;

      const ctx = contexts[globalIdx];
      const expanded: ExpandedPdfPage = {
        root: templatePage.root,
        ctx,
        surface: resolvePageSurfaceBackground(templatePage, template, ctx),
      };
      await onBeforeCapture?.(expanded, globalIdx);

      const canvas = await captureTemplateToCanvas(template, rootElement, expanded.surface);
      const col = slot % cols;
      const row = Math.floor(slot / cols);
      const x = offX + col * layout.widthMm;
      const y = offY + row * layout.heightMm;
      doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', x, y, layout.widthMm, layout.heightMm);
    }
  }

  const blob = doc.output('blob');
  return new Uint8Array(await blob.arrayBuffer());
}

function downloadPdfBytes(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([Uint8Array.from(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function generateCartelPlatePdf(
  template: DocTemplate,
  contexts: TemplateContext[],
  filename: string,
  onBeforeCapture?: (page: ExpandedPdfPage, globalIdx: number) => Promise<void>,
): Promise<void> {
  const templatePage = resolveCartelDynamicPage(template);
  const bytes = await generateCartelPlatePdfBytes(template, templatePage, contexts, undefined, onBeforeCapture);
  downloadPdfBytes(bytes, filename);
}

export function countCartelExportPages(template: DocTemplate, workCount: number): number {
  const n = Math.max(1, workCount);
  return getTemplatePages(template).reduce(
    (sum, page) => sum + (page.kind === 'dynamic' ? getCartelPlatePageCount(template, n) : 1),
    0,
  );
}

export async function generateCartelDocument(
  template: DocTemplate,
  contexts: TemplateContext[],
  filename: string,
  onBeforeRasterPage?: (page: ExpandedPdfPage, index: number) => Promise<void>,
): Promise<void> {
  if (!contexts.length) throw new Error('Aucune œuvre sélectionnée');

  const merged = await PDFDocument.create();
  const templatePages = getTemplatePages(template);

  for (const templatePage of templatePages) {
    if (templatePage.kind === 'static') {
      const ctx = contexts[0];
      const expanded: ExpandedPdfPage = {
        root: templatePage.root,
        ctx,
        surface: resolvePageSurfaceBackground(templatePage, template, ctx),
      };
      await onBeforeRasterPage?.(expanded, 0);
      const blob = await generateTemplateDocumentBlob(
        template,
        contexts,
        undefined,
        [expanded],
        onBeforeRasterPage,
      );
      const sub = await PDFDocument.load(new Uint8Array(await blob.arrayBuffer()));
      const copied = await merged.copyPages(sub, sub.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    } else {
      const bytes = await generateCartelPlatePdfBytes(
        template,
        templatePage,
        contexts,
        undefined,
        onBeforeRasterPage,
      );
      const sub = await PDFDocument.load(bytes);
      const copied = await merged.copyPages(sub, sub.getPageIndices());
      copied.forEach((p) => merged.addPage(p));
    }
  }

  downloadPdfBytes(await merged.save(), filename);
}

export function getCartelPlatePageCount(template: DocTemplate, workCount: number): number {
  const perPage = getCartelPerPlate(template);
  return Math.ceil(Math.max(1, workCount) / perPage);
}

export function getCartelPerPlate(template: DocTemplate): number {
  return getCartelPlateGeometry(resolveCartelLayout(template)).perPage;
}
