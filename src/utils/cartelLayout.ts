import type { CartelLayoutConfig, DocTemplate } from '../types/templates';
import type { TemplateContext } from './templateFields';

export const CARTEL_ACCENT_DEFAULT = '#d91a1a';
export const CARTEL_META_WEIGHT = 400;
/** Marge feuille A4 non imprimable — standard impression classique (~12 mm). */
export const CARTEL_PLATE_MARGIN_DEFAULT = 12;

export const DEFAULT_CARTEL_LAYOUT: CartelLayoutConfig = {
  widthMm: 45,
  heightMm: 50,
  paddingTop: 14,
  paddingLeft: 8,
  paddingRight: 8,
  accentColor: CARTEL_ACCENT_DEFAULT,
  artistSize: 8,
  titleSize: 8,
  metaSize: 8,
  artistWeight: 900,
  titleWeight: 900,
  afterArtist: 3.5,
  titleLeading: 3,
  afterTitle: 0,
  barW: 6,
  barH: 0.8,
  barGap: 0,
  afterBar: 6,
  metaLeading: 4,
  metaWrapLeading: 3,
  fontFamily: 'google:poppins',
  showPaddingGuides: true,
  showBorders: false,
  plateMarginMm: CARTEL_PLATE_MARGIN_DEFAULT,
};

export const CARTEL_PREVIEW_SAMPLE = {
  artist: "Nom de l'artiste",
  title: "Titre de l'œuvre",
  meta: ['Technique', 'Dimensions', '2026'],
};

export interface CartelFields {
  artist: string;
  title: string;
  meta: string[];
}

export type CartelLayoutElement =
  | {
      type: 'text';
      role: 'artist' | 'title' | 'meta';
      text: string;
      baselineFromTopMm: number;
      sizePt: number;
      weight: number;
      xMm: number;
      widthMm: number;
    }
  | {
      type: 'bar';
      role: 'bar';
      topMm: number;
      xMm: number;
      widthMm: number;
      heightMm: number;
    };

const MM_TO_PT = 2.8346456693;
const PT_TO_MM = 25.4 / 72;
const ASCENDER = 0.73;

export function mmToPt(mm: number): number {
  return mm * MM_TO_PT;
}

export function ptToMm(pt: number): number {
  return pt * PT_TO_MM;
}

export function normalizeCartelWeight(weight: number): number {
  const n = Math.round(Number(weight) / 100) * 100;
  const allowed = [100, 200, 300, 400, 500, 600, 700, 800, 900];
  return allowed.includes(n) ? n : CARTEL_META_WEIGHT;
}

export function resolveCartelLayout(template: DocTemplate): CartelLayoutConfig {
  const base = { ...DEFAULT_CARTEL_LAYOUT, ...template.cartelLayout };
  return {
    ...base,
    widthMm: template.widthMm ?? base.widthMm,
    heightMm: template.heightMm ?? base.heightMm,
  };
}

export function ensureCartelLayout(template: DocTemplate): DocTemplate {
  if (template.type !== 'cartel') return template;
  const base = { ...DEFAULT_CARTEL_LAYOUT, ...template.cartelLayout };
  const widthMm = template.widthMm ?? base.widthMm;
  const heightMm = template.heightMm ?? base.heightMm;
  const cartelLayout = {
    ...base,
    widthMm,
    heightMm,
    plateMarginMm: template.cartelLayout?.plateMarginMm ?? base.plateMarginMm,
  };
  return {
    ...template,
    cartelLayout,
    format: 'cartel_cilas',
    formatRef: template.formatRef === 'free' ? 'free' : 'cartel_cilas',
    widthMm: cartelLayout.widthMm,
    heightMm: cartelLayout.heightMm,
    margin: template.margin ?? 0,
  };
}

export function buildCartelFields(ctx: TemplateContext): CartelFields {
  const artist = (ctx.artist?.nom ?? '').trim();
  const title = (ctx.work?.titre ?? '').trim();
  const meta = [
    (ctx.work?.technique ?? '').trim(),
    (ctx.work?.dimensions ?? '').trim(),
    ctx.work?.annee ? String(ctx.work.annee) : '',
  ].filter(Boolean);
  return { artist, title, meta };
}

export function cartelFieldsWithFallback(fields: CartelFields): CartelFields {
  return {
    artist: fields.artist || CARTEL_PREVIEW_SAMPLE.artist,
    title: fields.title || CARTEL_PREVIEW_SAMPLE.title,
    meta: fields.meta.length
      ? fields.meta
      : [...CARTEL_PREVIEW_SAMPLE.meta],
  };
}

export function textInnerWidthMm(config: CartelLayoutConfig): number {
  return Math.max(1, config.widthMm - config.paddingLeft - config.paddingRight);
}

export function wrapByWords(text: string, fitsFn: (line: string) => boolean): string[] {
  if (!text) return [];
  const out: string[] = [];
  for (const para of String(text).split(/\r?\n/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    let line = '';
    for (const word of trimmed.split(/\s+/)) {
      const test = line ? `${line} ${word}` : word;
      if (fitsFn(test)) {
        line = test;
      } else {
        if (line) out.push(line);
        line = word;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

export function layoutCartelElements(
  config: CartelLayoutConfig,
  fields: CartelFields,
  wrapFn: (text: string, sizePt: number, maxWidthPt: number, weight: number) => string[],
  measureWidthFn: (text: string, sizePt: number, weight: number) => number,
): CartelLayoutElement[] {
  const innerWidthPt = mmToPt(textInnerWidthMm(config));
  const elements: CartelLayoutElement[] = [];
  const displayArtist = fields.artist ? fields.artist.toUpperCase() : '';
  const firstSizePt = displayArtist
    ? config.artistSize
    : fields.title
      ? config.titleSize
      : config.metaSize;
  let baselineFromTop = config.paddingTop + ptToMm(firstSizePt) * ASCENDER;

  if (displayArtist) {
    const artistWeight = normalizeCartelWeight(config.artistWeight);
    const artistLines = wrapFn(displayArtist, config.artistSize, innerWidthPt, artistWeight);
    for (const line of artistLines) {
      elements.push({
        type: 'text',
        role: 'artist',
        text: line,
        baselineFromTopMm: baselineFromTop,
        sizePt: config.artistSize,
        weight: artistWeight,
        xMm: config.paddingLeft,
        widthMm: measureWidthFn(line, config.artistSize, artistWeight),
      });
      baselineFromTop += config.titleLeading;
    }
    if (artistLines.length) baselineFromTop += config.afterArtist - config.titleLeading;
  }

  const titleWeight = normalizeCartelWeight(config.titleWeight);
  const titleLines = fields.title
    ? wrapFn(fields.title, config.titleSize, innerWidthPt, titleWeight)
    : [];
  for (const line of titleLines) {
    elements.push({
      type: 'text',
      role: 'title',
      text: line,
      baselineFromTopMm: baselineFromTop,
      sizePt: config.titleSize,
      weight: titleWeight,
      xMm: config.paddingLeft,
      widthMm: measureWidthFn(line, config.titleSize, titleWeight),
    });
    baselineFromTop += config.titleLeading;
  }
  baselineFromTop += config.afterTitle + config.barGap;

  const barTopMm = baselineFromTop;
  elements.push({
    type: 'bar',
    role: 'bar',
    topMm: barTopMm,
    xMm: config.paddingLeft,
    widthMm: config.barW,
    heightMm: config.barH,
  });
  baselineFromTop = barTopMm + config.barH + config.afterBar;

  for (const meta of fields.meta) {
    const metaLines = wrapFn(meta, config.metaSize, innerWidthPt, CARTEL_META_WEIGHT);
    metaLines.forEach((line, i) => {
      elements.push({
        type: 'text',
        role: 'meta',
        text: line,
        baselineFromTopMm: baselineFromTop,
        sizePt: config.metaSize,
        weight: CARTEL_META_WEIGHT,
        xMm: config.paddingLeft,
        widthMm: measureWidthFn(line, config.metaSize, CARTEL_META_WEIGHT),
      });
      baselineFromTop += i < metaLines.length - 1 ? config.metaWrapLeading : config.metaLeading;
    });
  }

  return elements;
}

export function baselineToTopMm(baselineFromTopMm: number, sizePt: number): number {
  return baselineFromTopMm - ptToMm(sizePt) * ASCENDER;
}

let measureCtx: CanvasRenderingContext2D | null = null;

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    const canvas = document.createElement('canvas');
    measureCtx = canvas.getContext('2d')!;
  }
  return measureCtx;
}

export function measureCanvasTextWidth(text: string, sizePt: number, weight: number, fontFamily = 'Poppins'): number {
  const ctx = getMeasureCtx();
  const w = normalizeCartelWeight(weight);
  ctx.font = `${w} ${sizePt}pt ${fontFamily}, sans-serif`;
  return ptToMm((ctx.measureText(text).width * 72) / 96);
}

export function wrapCanvasText(
  text: string,
  sizePt: number,
  maxWidthPt: number,
  weight = CARTEL_META_WEIGHT,
  fontFamily = 'Poppins',
): string[] {
  const ctx = getMeasureCtx();
  const maxWidthPx = (maxWidthPt * 96) / 72;
  const w = normalizeCartelWeight(weight);
  return wrapByWords(text, (test) => {
    ctx.font = `${w} ${sizePt}pt ${fontFamily}, sans-serif`;
    return ctx.measureText(test).width <= maxWidthPx;
  });
}

export function layoutCartelForPreview(config: CartelLayoutConfig, fields: CartelFields): CartelLayoutElement[] {
  return layoutCartelElements(
    config,
    fields,
    wrapCanvasText,
    measureCanvasTextWidth,
  );
}

export function countCartelPlateGrid(config: CartelLayoutConfig): { cols: number; rows: number; perPage: number } {
  const geo = getCartelPlateGeometry(config);
  return { cols: geo.cols, rows: geo.rows, perPage: geo.perPage };
}

export interface CartelPlateGeometry {
  pageWmm: number;
  pageHmm: number;
  cols: number;
  rows: number;
  perPage: number;
  offX: number;
  offY: number;
  gridW: number;
  gridH: number;
  margin: number;
}

export function getCartelPlateGeometry(config: CartelLayoutConfig): CartelPlateGeometry {
  const pageWmm = 210;
  const pageHmm = 297;
  const margin = config.plateMarginMm;
  const usableW = pageWmm - 2 * margin;
  const usableH = pageHmm - 2 * margin;
  const cols = Math.max(1, Math.floor(usableW / config.widthMm));
  const rows = Math.max(1, Math.floor(usableH / config.heightMm));
  const gridW = cols * config.widthMm;
  const gridH = rows * config.heightMm;
  const offX = margin + (usableW - gridW) / 2;
  const offY = margin + (usableH - gridH) / 2;
  return {
    pageWmm,
    pageHmm,
    cols,
    rows,
    perPage: cols * rows,
    offX,
    offY,
    gridW,
    gridH,
    margin,
  };
}
