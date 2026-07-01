import type { DocBlock } from '../types/templates';

export function createBlockId(): string {
  return `blk_${crypto.randomUUID().slice(0, 8)}`;
}

export function findBlock(root: DocBlock, id: string): DocBlock | null {
  if (root.id === id) return root;
  if (!root.children) return null;
  for (const child of root.children) {
    const found = findBlock(child, id);
    if (found) return found;
  }
  return null;
}

export function findParent(root: DocBlock, childId: string): DocBlock | null {
  if (!root.children) return null;
  if (root.children.some((c) => c.id === childId)) return root;
  for (const child of root.children) {
    const found = findParent(child, childId);
    if (found) return found;
  }
  return null;
}

function mapTree(root: DocBlock, fn: (b: DocBlock) => DocBlock): DocBlock {
  const mapped = fn(root);
  if (mapped.children) {
    return { ...mapped, children: mapped.children.map((c) => mapTree(c, fn)) };
  }
  return mapped;
}

export function updateBlock(root: DocBlock, id: string, patch: Partial<DocBlock>): DocBlock {
  return mapTree(root, (b) => (b.id === id ? { ...b, ...patch } : b));
}

export function removeBlock(root: DocBlock, id: string): DocBlock {
  if (root.id === id) return root;
  return mapTree(root, (b) => {
    if (b.children) {
      return { ...b, children: b.children.filter((c) => c.id !== id) };
    }
    return b;
  });
}

export function addChild(root: DocBlock, parentId: string, child: DocBlock, index?: number): DocBlock {
  return mapTree(root, (b) => {
    if (b.id === parentId && b.type === 'container') {
      const children = [...(b.children ?? [])];
      const idx = index ?? children.length;
      children.splice(idx, 0, child);
      return { ...b, children };
    }
    return b;
  });
}

export function moveBlock(root: DocBlock, blockId: string, dir: 'up' | 'down'): DocBlock {
  const parent = findParent(root, blockId);
  if (!parent?.children) return root;
  const idx = parent.children.findIndex((c) => c.id === blockId);
  if (idx < 0) return root;
  const newIdx = dir === 'up' ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= parent.children.length) return root;
  const children = [...parent.children];
  [children[idx], children[newIdx]] = [children[newIdx], children[idx]];
  return updateBlock(root, parent.id, { children });
}

function containsBlock(node: DocBlock, targetId: string): boolean {
  if (node.id === targetId) return true;
  if (!node.children) return false;
  return node.children.some((c) => containsBlock(c, targetId));
}

export function moveBlockToParent(
  root: DocBlock,
  blockId: string,
  newParentId: string,
  index?: number,
): DocBlock {
  const block = findBlock(root, blockId);
  if (!block || blockId === newParentId) return root;
  if (containsBlock(block, newParentId)) return root;

  const oldParent = findParent(root, blockId);
  const oldIndex = oldParent?.children?.findIndex((c) => c.id === blockId) ?? -1;

  let updated = removeBlock(root, blockId);
  let insertIndex = index;
  if (
    insertIndex !== undefined &&
    oldParent?.id === newParentId &&
    oldIndex >= 0 &&
    insertIndex > oldIndex
  ) {
    insertIndex -= 1;
  }
  updated = addChild(updated, newParentId, block, insertIndex);
  return updated;
}

export function duplicateBlock(block: DocBlock): DocBlock {
  const clone: DocBlock = {
    ...block,
    id: createBlockId(),
    children: block.children?.map(duplicateBlock),
  };
  return clone;
}

export function duplicateBlockAfter(root: DocBlock, blockId: string): DocBlock {
  const block = findBlock(root, blockId);
  const parent = findParent(root, blockId);
  if (!block || !parent?.children) return root;
  const idx = parent.children.findIndex((c) => c.id === blockId);
  if (idx < 0) return root;
  return addChild(root, parent.id, duplicateBlock(block), idx + 1);
}

/** Ids des descendants en ordre document (hors racine de page). */
export function collectBlockIdsPreorder(root: DocBlock): string[] {
  const ids: string[] = [];
  const walk = (node: DocBlock) => {
    if (!node.children) return;
    for (const child of node.children) {
      ids.push(child.id);
      walk(child);
    }
  };
  walk(root);
  return ids;
}

export function sortBlockIdsByDocumentOrder(root: DocBlock, blockIds: string[]): string[] {
  const wanted = new Set(blockIds);
  return collectBlockIdsPreorder(root).filter((id) => wanted.has(id));
}

export function duplicateBlocksAt(
  root: DocBlock,
  blockIds: string[],
  newParentId: string,
  index?: number,
): { root: DocBlock; newIds: string[] } {
  const ordered = sortBlockIdsByDocumentOrder(
    root,
    blockIds.filter((id) => id !== root.id),
  );
  if (!ordered.length) return { root, newIds: [] };

  const parent = findBlock(root, newParentId);
  if (!parent || parent.type !== 'container') return { root, newIds: [] };

  let updated = root;
  const newIds: string[] = [];
  let insertIndex = index ?? parent.children?.length ?? 0;

  for (const blockId of ordered) {
    const block = findBlock(updated, blockId);
    if (!block) continue;
    const clone = duplicateBlock(block);
    updated = addChild(updated, newParentId, clone, insertIndex);
    newIds.push(clone.id);
    insertIndex += 1;
  }

  return { root: updated, newIds };
}
