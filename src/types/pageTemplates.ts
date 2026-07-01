import type {
  BackgroundFillType,
  BackgroundImageFieldKey,
  BackgroundImageFit,
  BackgroundImagePosition,
  BackgroundImageSize,
  DocBlock,
  PageKind,
} from './templates';

export interface PageTemplate {
  id: string;
  nom: string;
  kind: PageKind;
  root: DocBlock;
  background?: string;
  backgroundType?: BackgroundFillType;
  backgroundImage?: string;
  backgroundImageField?: BackgroundImageFieldKey;
  backgroundImageFit?: BackgroundImageFit;
  backgroundImageSize?: BackgroundImageSize;
  backgroundImagePosition?: BackgroundImagePosition;
  createdAt: string;
  updatedAt: string;
}
