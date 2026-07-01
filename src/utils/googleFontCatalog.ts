import type { BuiltinFontFamily } from '../types/templates';

export interface GoogleFontEntry {
  id: string;
  label: string;
  /** Nom CSS tel que fourni par Google Fonts. */
  cssFamily: string;
  category: 'serif' | 'sans-serif' | 'display' | 'monospace';
  weights: number[];
}

/** Catalogue intégré — polices libres via Google Fonts. */
export const GOOGLE_FONT_CATALOG: GoogleFontEntry[] = [
  // Serif
  { id: 'playfair-display', label: 'Playfair Display', cssFamily: 'Playfair Display', category: 'serif', weights: [400, 700] },
  { id: 'lora', label: 'Lora', cssFamily: 'Lora', category: 'serif', weights: [400, 700] },
  { id: 'eb-garamond', label: 'EB Garamond', cssFamily: 'EB Garamond', category: 'serif', weights: [400, 700] },
  { id: 'cormorant-garamond', label: 'Cormorant Garamond', cssFamily: 'Cormorant Garamond', category: 'serif', weights: [400, 600, 700] },
  { id: 'libre-baskerville', label: 'Libre Baskerville', cssFamily: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { id: 'merriweather', label: 'Merriweather', cssFamily: 'Merriweather', category: 'serif', weights: [400, 700] },
  { id: 'crimson-text', label: 'Crimson Text', cssFamily: 'Crimson Text', category: 'serif', weights: [400, 600, 700] },
  { id: 'dm-serif-display', label: 'DM Serif Display', cssFamily: 'DM Serif Display', category: 'serif', weights: [400] },
  { id: 'instrument-serif', label: 'Instrument Serif', cssFamily: 'Instrument Serif', category: 'serif', weights: [400, 700] },
  { id: 'fraunces', label: 'Fraunces', cssFamily: 'Fraunces', category: 'serif', weights: [400, 600, 700] },
  // Sans-serif
  { id: 'poppins', label: 'Poppins', cssFamily: 'Poppins', category: 'sans-serif', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { id: 'inter', label: 'Inter', cssFamily: 'Inter', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'roboto', label: 'Roboto', cssFamily: 'Roboto', category: 'sans-serif', weights: [400, 700] },
  { id: 'open-sans', label: 'Open Sans', cssFamily: 'Open Sans', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'montserrat', label: 'Montserrat', cssFamily: 'Montserrat', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'raleway', label: 'Raleway', cssFamily: 'Raleway', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'nunito', label: 'Nunito', cssFamily: 'Nunito', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'work-sans', label: 'Work Sans', cssFamily: 'Work Sans', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'source-sans-3', label: 'Source Sans 3', cssFamily: 'Source Sans 3', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'dm-sans', label: 'DM Sans', cssFamily: 'DM Sans', category: 'sans-serif', weights: [400, 700] },
  { id: 'outfit', label: 'Outfit', cssFamily: 'Outfit', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'lexend', label: 'Lexend', cssFamily: 'Lexend', category: 'sans-serif', weights: [400, 600, 700] },
  { id: 'space-grotesk', label: 'Space Grotesk', cssFamily: 'Space Grotesk', category: 'sans-serif', weights: [400, 600, 700] },
  // Display
  { id: 'josefin-sans', label: 'Josefin Sans', cssFamily: 'Josefin Sans', category: 'display', weights: [400, 600, 700] },
  { id: 'oswald', label: 'Oswald', cssFamily: 'Oswald', category: 'display', weights: [400, 600, 700] },
  { id: 'bebas-neue', label: 'Bebas Neue', cssFamily: 'Bebas Neue', category: 'display', weights: [400] },
  // Monospace
  { id: 'jetbrains-mono', label: 'JetBrains Mono', cssFamily: 'JetBrains Mono', category: 'monospace', weights: [400, 700] },
  { id: 'courier-prime', label: 'Courier Prime', cssFamily: 'Courier Prime', category: 'monospace', weights: [400, 700] },
  { id: 'ibm-plex-mono', label: 'IBM Plex Mono', cssFamily: 'IBM Plex Mono', category: 'monospace', weights: [400, 600, 700] },
];

/** Catalogue Google Fonts trié par nom affiché (ordre alphabétique, locale fr). */
export function getGoogleFontCatalogSorted(): GoogleFontEntry[] {
  return [...GOOGLE_FONT_CATALOG].sort((a, b) =>
    a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }),
  );
}

const googleById = new Map(GOOGLE_FONT_CATALOG.map((f) => [f.id, f]));

export function getGoogleFont(id: string): GoogleFontEntry | undefined {
  return googleById.get(id);
}

export function googleFontRef(id: string): `google:${string}` {
  return `google:${id}`;
}

export function buildGoogleFontsStylesheetUrl(fontIds: string[]): string {
  const families = fontIds
    .map((id) => getGoogleFont(id))
    .filter((f): f is GoogleFontEntry => Boolean(f))
    .map((f) => {
      const weights = f.weights.join(';');
      const name = f.cssFamily.replace(/ /g, '+');
      return `family=${name}:wght@${weights}`;
    });
  if (families.length === 0) return '';
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}

export const BUILTIN_FONT_FAMILIES: {
  value: BuiltinFontFamily;
  label: string;
  css: string;
}[] = [
  { value: 'serif', label: 'Serif (Georgia)', css: "Georgia, 'Times New Roman', serif" },
  { value: 'sans', label: 'Sans-serif', css: "system-ui, -apple-system, 'Helvetica Neue', sans-serif" },
  { value: 'mono', label: 'Monospace', css: "'Courier New', Courier, monospace" },
];
