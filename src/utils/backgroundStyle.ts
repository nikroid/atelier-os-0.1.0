import type { BlockBackgroundImageFit, BlockBackgroundType } from '../types/templates';

export interface BackgroundValues {
  bgType: BlockBackgroundType;
  bgColor: string;
  imageGroupId?: string;
  imageFit?: BlockBackgroundImageFit;
}

export function resolveBackgroundStyle(
  values: BackgroundValues,
  imageUrl?: string | null,
): Record<string, string | number | undefined> {
  if (values.bgType === 'color') {
    return { backgroundColor: values.bgColor };
  }
  if (values.bgType === 'image' && imageUrl) {
    const fit = values.imageFit ?? 'cover';
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: fit,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return {};
}
