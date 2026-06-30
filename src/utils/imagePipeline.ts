import type { MediaVariant, ProcessedImageSet, ProcessedVariant } from '../types/media';

export const VARIANT_SPECS: Record<
  MediaVariant,
  { maxSide: number; quality: number }
> = {
  thumb: { maxSide: 300, quality: 0.75 },
  display: { maxSide: 1600, quality: 0.82 },
  original: { maxSide: 3000, quality: 0.9 },
};

const OUTPUT_MIME = 'image/jpeg';

export function computeScaledDimensions(
  width: number,
  height: number,
  maxSide: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxSide) return { width, height };
  const scale = maxSide / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function loadImageFromSource(src: string | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = typeof src === 'string' ? src : URL.createObjectURL(src);
    img.onload = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      if (typeof src !== 'string') URL.revokeObjectURL(url);
      reject(new Error('Impossible de lire cette image'));
    };
    img.src = url;
  });
}

async function renderVariant(
  img: HTMLImageElement,
  variant: MediaVariant,
): Promise<ProcessedVariant> {
  const spec = VARIANT_SPECS[variant];
  const { width, height } = computeScaledDimensions(img.naturalWidth, img.naturalHeight, spec.maxSide);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas non disponible');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Échec encodage JPEG'))),
      OUTPUT_MIME,
      spec.quality,
    );
  });
  return {
    variant,
    blob,
    width,
    height,
    byteSize: blob.size,
  };
}

async function processImageSource(
  source: string | Blob,
  originalName?: string,
): Promise<ProcessedImageSet> {
  const img = await loadImageFromSource(source);
  const variants: ProcessedVariant[] = [];
  for (const variant of ['thumb', 'display', 'original'] as MediaVariant[]) {
    variants.push(await renderVariant(img, variant));
  }
  return { variants, originalName };
}

export async function processImageFile(file: File): Promise<ProcessedImageSet> {
  if (!file.type.startsWith('image/')) {
    if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif')) {
      throw new Error('Format HEIC non supporté sur ce navigateur — convertissez en JPEG.');
    }
    throw new Error('Fichier non reconnu comme image');
  }
  return processImageSource(file, file.name);
}

export async function processDataUrl(dataUrl: string): Promise<ProcessedImageSet> {
  if (!dataUrl.startsWith('data:image/')) {
    throw new Error('Data URL image invalide');
  }
  return processImageSource(dataUrl);
}
