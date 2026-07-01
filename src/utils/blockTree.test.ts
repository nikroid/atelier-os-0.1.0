import { describe, expect, it } from 'vitest';
import {
  addChild,
  createBlockId,
  duplicateBlock,
  duplicateBlockAfter,
  duplicateBlocksAt,
  findBlock,
  moveBlock,
  moveBlockToParent,
  removeBlock,
  sortBlockIdsByDocumentOrder,
  updateBlock,
} from './blockTree';
import type { DocBlock } from '../types/templates';

function sampleRoot(): DocBlock {
  return {
    id: 'root',
    type: 'container',
    direction: 'column',
    children: [
      { id: 'a', type: 'text', content: 'A' },
      { id: 'b', type: 'text', content: 'B' },
      {
        id: 'c',
        type: 'container',
        direction: 'row',
        children: [{ id: 'd', type: 'text', content: 'D' }],
      },
    ],
  };
}

describe('blockTree', () => {
  it('findBlock locates nested nodes', () => {
    const root = sampleRoot();
    expect(findBlock(root, 'd')?.content).toBe('D');
    expect(findBlock(root, 'missing')).toBeNull();
  });

  it('updateBlock patches a single node', () => {
    const root = updateBlock(sampleRoot(), 'b', { content: 'B2' });
    expect(findBlock(root, 'b')?.content).toBe('B2');
    expect(findBlock(root, 'a')?.content).toBe('A');
  });

  it('removeBlock removes nested node', () => {
    const root = removeBlock(sampleRoot(), 'd');
    expect(findBlock(root, 'd')).toBeNull();
    expect(findBlock(root, 'c')?.children).toEqual([]);
  });

  it('addChild inserts at index', () => {
    const child: DocBlock = { id: 'x', type: 'spacer', spacerHeight: 8 };
    const root = addChild(sampleRoot(), 'root', child, 1);
    expect(root.children?.map((c) => c.id)).toEqual(['a', 'x', 'b', 'c']);
  });

  it('moveBlock swaps siblings', () => {
    const root = moveBlock(sampleRoot(), 'b', 'up');
    expect(root.children?.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('moveBlockToParent moves nested block to root', () => {
    const root = moveBlockToParent(sampleRoot(), 'd', 'root', 1);
    expect(root.children?.map((c) => c.id)).toEqual(['a', 'd', 'b', 'c']);
    expect(findBlock(root, 'c')?.children).toEqual([]);
  });

  it('moveBlockToParent reorders within same parent', () => {
    const root = moveBlockToParent(sampleRoot(), 'a', 'root', 2);
    expect(root.children?.map((c) => c.id)).toEqual(['b', 'a', 'c']);
  });

  it('moveBlockToParent rejects moving into descendant', () => {
    const before = sampleRoot();
    const root = moveBlockToParent(before, 'c', 'd');
    expect(findBlock(root, 'c')?.children?.[0].id).toBe('d');
    expect(root.children?.map((c) => c.id)).toEqual(before.children?.map((c) => c.id));
  });

  it('duplicateBlock assigns new ids recursively', () => {
    const src = findBlock(sampleRoot(), 'c')!;
    const clone = duplicateBlock(src);
    expect(clone.id).not.toBe('c');
    expect(clone.children?.[0].id).not.toBe('d');
  });

  it('duplicateBlockAfter inserts sibling clone', () => {
    const root = duplicateBlockAfter(sampleRoot(), 'b');
    const siblings = root.children ?? [];
    expect(siblings).toHaveLength(4);
    expect(siblings[1].id).toBe('b');
    expect(siblings[2].type).toBe('text');
    expect(siblings[2].id).not.toBe('b');
    expect(siblings[2].content).toBe('B');
  });

  it('sortBlockIdsByDocumentOrder preserves tree order', () => {
    const root = sampleRoot();
    expect(sortBlockIdsByDocumentOrder(root, ['d', 'a', 'b'])).toEqual(['a', 'b', 'd']);
  });

  it('duplicateBlocksAt inserts clones without removing originals', () => {
    const root = sampleRoot();
    const { root: next, newIds } = duplicateBlocksAt(root, ['a', 'b'], 'c', 0);
    expect(findBlock(root, 'a')).not.toBeNull();
    expect(findBlock(root, 'b')).not.toBeNull();
    expect(newIds).toHaveLength(2);
    expect(findBlock(next, 'c')?.children?.map((child) => child.id)).toEqual([
      newIds[0],
      newIds[1],
      'd',
    ]);
    expect(findBlock(next, newIds[0])?.content).toBe('A');
    expect(findBlock(next, newIds[1])?.content).toBe('B');
  });
});

describe('createBlockId', () => {
  it('generates unique prefixed ids', () => {
    const a = createBlockId();
    const b = createBlockId();
    expect(a).toMatch(/^blk_/);
    expect(a).not.toBe(b);
  });
});
