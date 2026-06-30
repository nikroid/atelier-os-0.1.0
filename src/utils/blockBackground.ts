import type { CSSProperties } from 'react';
import type { DocBlock } from '../types/templates';
import { resolveBackgroundStyle } from './backgroundStyle';

export function blockSupportsBackground(block: DocBlock): boolean {
  return block.type === 'container';
}

export function getBlockBackgroundValues(block: DocBlock) {
  return {
    bgType: block.blockBgType ?? 'none',
    bgColor: block.blockBgColor ?? '#f5f2ed',
    imageGroupId: block.blockBgImageGroupId,
    imageFit: block.blockBgImageFit,
  };
}

export function blockBackgroundStyle(
  block: DocBlock,
  imageUrl?: string | null,
): CSSProperties {
  return resolveBackgroundStyle(getBlockBackgroundValues(block), imageUrl) as CSSProperties;
}

export function collectBlockMediaGroupIds(block: DocBlock, ids: Set<string> = new Set()): Set<string> {
  if (block.imageMediaGroupId) ids.add(block.imageMediaGroupId);
  if (block.blockBgImageGroupId) ids.add(block.blockBgImageGroupId);
  for (const child of block.children ?? []) {
    collectBlockMediaGroupIds(child, ids);
  }
  return ids;
}
