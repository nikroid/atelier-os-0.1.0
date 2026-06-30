export type DocTemplateType =
  | 'cartel'
  | 'fiche'
  | 'catalogue_page'
  | 'portfolio'
  | 'certificat'
  | 'presse'
  | 'custom';

export type PageFormat = 'a4' | 'a6' | 'a5';

export type FieldKey =
  | 'work.image'
  | 'work.titre'
  | 'work.annee'
  | 'work.technique'
  | 'work.dimensions'
  | 'work.prix'
  | 'work.ref'
  | 'work.description'
  | 'work.statut'
  | 'artist.nom'
  | 'artist.bio_fr'
  | 'artist.photo'
  | 'artist.email'
  | 'artist.site'
  | 'expo.titre'
  | 'expo.lieu'
  | 'expo.dates'
  | 'expo.texte_curatorial';

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';
export type AlignItems = 'flex-start' | 'center' | 'flex-end' | 'stretch';
export type JustifyContent =
  | 'flex-start'
  | 'center'
  | 'flex-end'
  | 'space-between'
  | 'space-around'
  | 'space-evenly';
export type SelfAlign = 'flex-start' | 'center' | 'flex-end';
export type TextAlign = 'left' | 'center' | 'right';
export type FontFamily = 'serif' | 'sans' | 'mono';

export type BlockBackgroundType = 'none' | 'color' | 'image';
export type BlockBackgroundImageFit = 'cover' | 'contain';

export interface ImageDropShadow {
  enabled?: boolean;
  offsetX?: number;
  offsetY?: number;
  blur?: number;
  color?: string;
  /** Opacité de l'ombre, 0–100 */
  opacity?: number;
}

export interface DocBlock {
  id: string;
  type: 'container' | 'field' | 'text' | 'spacer' | 'image' | 'rectangle';
  direction?: FlexDirection;
  gap?: number;
  align?: AlignItems;
  justify?: JustifyContent;
  padding?: number;
  blockPadding?: number;
  blockMarginTop?: number;
  blockMarginRight?: number;
  blockMarginBottom?: number;
  blockMarginLeft?: number;
  flex?: number;
  width?: string;
  height?: string;
  selfAlign?: SelfAlign;
  children?: DocBlock[];
  field?: FieldKey;
  content?: string;
  fontSize?: number;
  fontFamily?: FontFamily;
  fontWeight?: 'normal' | 'bold';
  textAlign?: TextAlign;
  color?: string;
  writingMode?: 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
  textTransform?: 'none' | 'uppercase';
  imageHeight?: string | number;
  imageWidth?: string | number;
  imageMediaGroupId?: string;
  /** @deprecated Utiliser imageMediaGroupId */
  imageSrc?: string;
  objectFit?: 'cover' | 'contain';
  /** Ombre portée (drop-shadow) autour de l'image */
  imageShadow?: ImageDropShadow;
  spacerHeight?: number;
  rectHeight?: number;
  backgroundColor?: string;
  /** Arrière-plan : aucun, couleur unie ou image */
  blockBgType?: BlockBackgroundType;
  blockBgColor?: string;
  blockBgImageGroupId?: string;
  blockBgImageFit?: BlockBackgroundImageFit;
  borderColor?: string;
  borderWidth?: number;
}

export type PageKind = 'static' | 'dynamic';

export interface DocTemplatePage {
  id: string;
  kind: PageKind;
  root: DocBlock;
}

export interface DocTemplate {
  id: string;
  nom: string;
  type: DocTemplateType;
  format: PageFormat;
  margin: number;
  background: string;
  pageBgType?: BlockBackgroundType;
  pageBgImageGroupId?: string;
  pageBgImageFit?: BlockBackgroundImageFit;
  /** @deprecated Conservé pour compatibilité — utiliser `pages[0].root`. */
  root: DocBlock;
  /** Pages du modèle (simple = 1×, dynamique = répétée par œuvre sélectionnée). */
  pages?: DocTemplatePage[];
  createdAt: string;
  updatedAt: string;
}

export const PAGE_FORMATS: { value: PageFormat; label: string; w: number; h: number }[] = [
  { value: 'a4', label: 'A4', w: 210, h: 297 },
  { value: 'a5', label: 'A5', w: 148, h: 210 },
  { value: 'a6', label: 'A6 (cartel)', w: 105, h: 148 },
];

export const TEMPLATE_TYPES: { value: DocTemplateType; label: string }[] = [
  { value: 'cartel', label: 'Cartel' },
  { value: 'fiche', label: 'Fiche œuvre' },
  { value: 'catalogue_page', label: 'Catalogue' },
  { value: 'certificat', label: 'Certificat' },
  { value: 'presse', label: 'Dossier presse' },
  { value: 'custom', label: 'Personnalisé' },
];
