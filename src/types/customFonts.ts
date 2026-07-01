export type FontFileFormat = 'woff2' | 'woff' | 'truetype' | 'opentype';

/** Police importée par l'utilisateur, stockée localement. */
export interface CustomFont {
  id: string;
  /** Nom affiché dans l'interface. */
  name: string;
  /** Nom CSS `font-family` (unique par fichier). */
  familyName: string;
  format: FontFileFormat;
  data: ArrayBuffer;
  createdAt: string;
  updatedAt: string;
}

/** Sérialisation JSON pour export .artdb (ArrayBuffer → base64). */
export interface CustomFontBackup {
  id: string;
  name: string;
  familyName: string;
  format: FontFileFormat;
  dataBase64: string;
  createdAt: string;
  updatedAt: string;
}
