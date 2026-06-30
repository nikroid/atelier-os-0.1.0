import type { DocBlock } from '../types/templates';
import { isImageField } from './templateFields';

export type BlockBackgroundType = 'none' | 'color' | 'image';

export function blockSupportsBackground(block: DocBlock): boolean {
  if (block.type === 'text' || block.type === 'image') return false;
  if (block.type === 'field' && block.field && isImageField(block.field)) return false;
  return (
    block.type === 'container' ||
    block.type === 'field' ||
    block.type === 'spacer' ||
    block.type === 'rectangle'
  );
}

export function getEffectiveBlockBgType(block: DocBlock): BlockBackgroundType {
  if (block.blockBgType && block.blockBgType !== 'none') return block.blockBgType;
  if (block.type === 'rectangle' && block.backgroundColor) return 'color';
  return 'none';
}

export function getEffectiveBlockBgColor(block: DocBlock): string {
  return block.blockBgColor ?? block.backgroundColor ?? '#e8e4dc';
}

export function resolveBlockBackgroundStyle(
  block: DocBlock,
  imageUrl?: string | null,
): Record<string, string | number | undefined> {
  return resolveBlockBackgroundStylePlain(block, imageUrl);
}

type CSSProperties = Record<string, string | number | undefined>;

export function resolveBlockBackgroundStylePlain(
  block: DocBlock,
  imageUrl?: string | null,
): CSSProperties {
  const type = getEffectiveBlockBgType(block);
  if (type === 'color') {
    return { backgroundColor: getEffectiveBlockBgColor(block) };
  }
  if (type === 'image' && imageUrl) {
    const fit = block.blockBgImageFit ?? 'cover';
    return {
      backgroundImage: `url("${imageUrl}")`,
      backgroundSize: fit,
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return {};
}

export function collectBlockMediaGroupIds(block: DocBlock, ids: Set<string> = new Set()): Set<string> {
  if (block.imageMediaGroupId) ids.add(block.imageMediaGroupId);
  if (block.blockBgImageGroupId) ids.add(block.blockBgImageGroupId);
  for (const child of block.children ?? []) {
    collectBlockMediaGroupIds(child, ids);
  }
  return ids;
}
