import type { DocTemplate } from '../types/templates';
import type { BlockBackgroundType } from '../types/templates';
import { resolveBackgroundStyle } from './backgroundStyle';

export function getEffectivePageBgType(template: DocTemplate): BlockBackgroundType {
  if (template.pageBgType) return template.pageBgType;
  return template.background ? 'color' : 'none';
}

export function getPageBackgroundValues(template: DocTemplate) {
  return {
    bgType: getEffectivePageBgType(template),
    bgColor: template.background ?? '#f5f2ed',
    imageGroupId: template.pageBgImageGroupId,
    imageFit: template.pageBgImageFit,
  };
}

export function pageBackgroundStyle(
  template: DocTemplate,
  imageUrl?: string | null,
): Record<string, string | number | undefined> {
  return resolveBackgroundStyle(getPageBackgroundValues(template), imageUrl);
}
