/** Ratio ISO 216 format A en portrait (largeur / hauteur), ex. A4 = 210/297. */
export const A_FORMAT_ASPECT_RATIO = 210 / 297;

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatPrice(price: number | null): string {
  if (price === null || price === undefined) return '—';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(price);
}

export function contactFullName(c: { nom: string; prenom: string }): string {
  return [c.prenom, c.nom].filter(Boolean).join(' ');
}

export interface WorkDimensionsInput {
  height: string;
  width: string;
  depth: string;
  isVolume: boolean;
}

export function emptyWorkDimensions(): WorkDimensionsInput {
  return { height: '', width: '', depth: '', isVolume: false };
}

/** Parse une chaîne stockée (ex. « 120 × 80 cm », « 70 × 50 × 30 cm »). */
export function parseWorkDimensions(dimensions: string): WorkDimensionsInput {
  const trimmed = dimensions.trim();
  if (!trimmed) return emptyWorkDimensions();

  const nums = [...trimmed.matchAll(/(\d+(?:[.,]\d+)?)/g)].map((m) => m[1].replace(',', '.'));
  const isVolume = nums.length >= 3 || /\d\s*×\s*\d\s*×\s*\d/.test(trimmed);

  return {
    height: nums[0] ?? '',
    width: nums[1] ?? '',
    depth: nums[2] ?? '',
    isVolume,
  };
}

/** Compose la chaîne `dimensions` pour la base et les modèles PDF. */
export function formatWorkDimensions(input: WorkDimensionsInput): string {
  const h = input.height.trim();
  const w = input.width.trim();
  const d = input.depth.trim();
  if (!h || !w) return '';
  if (input.isVolume && d) return `${h} × ${w} × ${d} cm`;
  return `${h} × ${w} cm`;
}
