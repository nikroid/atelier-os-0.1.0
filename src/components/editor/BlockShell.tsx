import { type CSSProperties, type ReactNode } from 'react';
import type { DocBlock } from '../../types/templates';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { blockBackgroundStyle } from '../../utils/blockBackground';

interface BlockShellProps {
  block: DocBlock;
  className: string;
  style?: CSSProperties;
  isEdit: boolean;
  isSelected: boolean;
  depth: number;
  onClick?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  dragHandlers?: {
    onDragEnter?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    onDrop?: (e: React.DragEvent) => void;
  };
  children: ReactNode;
}

export function BlockShell({
  block,
  className,
  style,
  isEdit,
  isSelected,
  depth,
  onClick,
  onDragStart,
  onDragEnd,
  dragHandlers,
  children,
}: BlockShellProps) {
  const bgType = block.blockBgType ?? 'none';
  const bgUrl = useMediaUrl(
    bgType === 'image' ? block.blockBgImageGroupId : null,
    'display',
  );
  const merged: CSSProperties = {
    ...style,
    ...blockBackgroundStyle(block, bgUrl),
  };

  if (!isEdit) {
    return (
      <div className={className} style={merged}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={`${className} ${isSelected ? 'block-selected' : ''} block-editable`}
      style={merged}
      onClick={onClick}
      draggable={depth > 0}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      {...dragHandlers}
    >
      {children}
    </div>
  );
}
