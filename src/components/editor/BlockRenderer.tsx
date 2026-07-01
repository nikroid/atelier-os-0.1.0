import { type CSSProperties, type DragEvent, type ReactNode, useEffect } from 'react';
import type { DocBlock } from '../../types/templates';
import { useFontsOptional } from '../../hooks/useFonts';
import { formatFontSizePt } from '../../utils/fonts';
import { flexAxis } from '../../utils/flexDirection';
import type { FlexAxis } from '../../utils/flexDirection';
import { FIELD_CATALOG, isImageField, resolveField, resolveImage, type TemplateContext } from '../../utils/templateFields';
import { resolveShortcodes } from '../../utils/templateShortcodes';
import {
  buildImageBlockLayout,
  getImageChildWrapLayout,
  hasFixedImageHeight,
  isImageBlock,
  isPercentSize,
  resolveImageHeight,
  resolveImageWidth,
} from '../../utils/imageBlockLayout';
import { normalizeContainerSize } from '../../utils/containerDimensions';
import {
  resolveBlockSurfaceBackground,
  surfaceBackgroundToCss,
} from '../../utils/backgroundStyle';
import { useDropHover } from './DropHoverContext';

type LayoutAxis = FlexAxis;

interface ParentLayoutContext {
  direction: LayoutAxis;
  container: DocBlock;
}

interface BlockRendererProps {
  block: DocBlock;
  ctx: TemplateContext;
  mode?: 'preview' | 'edit';
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Clic sur la zone vide de la page (conteneur racine, profondeur 0). */
  onPageBackgroundClick?: () => void;
  onDrop?: (parentId: string, data: string, index?: number) => void;
  depth?: number;
  parentLayout?: ParentLayoutContext;
}

function imageFillParentHeight(
  block: DocBlock,
  parentLayout?: ParentLayoutContext,
): boolean {
  if (!parentLayout || parentLayout.direction !== 'row') return false;
  const h = resolveImageHeight(block.imageHeight);
  if (!isPercentSize(h)) return false;
  const { height } = parentLayout.container;
  return Boolean(height && height !== 'auto');
}

function imageCenterInRow(
  block: DocBlock,
  parentLayout?: ParentLayoutContext,
): boolean {
  if (!parentLayout || parentLayout.direction !== 'row') return false;
  if (!isImageBlock(block)) return false;
  return parentJustifyDistributesMain(parentLayout.container.justify);
}

interface ContainerDragHandlers {
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
}

function setDropEffect(e: DragEvent) {
  const types = Array.from(e.dataTransfer.types);
  e.dataTransfer.dropEffect = types.includes('application/atelier-block-id') ? 'move' : 'copy';
}

function computeInsertIndex(e: DragEvent, direction: LayoutAxis): number {
  const container = e.currentTarget as HTMLElement;
  const wraps = Array.from(container.querySelectorAll(':scope > .block-child-wrap'));
  if (wraps.length === 0) return 0;

  const pos = direction === 'column' ? e.clientY : e.clientX;

  for (let i = 0; i < wraps.length; i++) {
    const rect = wraps[i].getBoundingClientRect();
    const mid =
      direction === 'column'
        ? rect.top + rect.height / 2
        : rect.left + rect.width / 2;
    if (pos < mid) return i;
  }
  return wraps.length;
}

function createContainerDragHandlers(
  blockId: string,
  direction: LayoutAxis,
  isEdit: boolean,
  onDrop: BlockRendererProps['onDrop'],
  setDropHover: (target: { parentId: string; index: number } | null) => void,
): ContainerDragHandlers | undefined {
  if (!isEdit || !onDrop) return undefined;

  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDropEffect(e);
    setDropHover({ parentId: blockId, index: computeInsertIndex(e, direction) });
  };

  return {
    onDragEnter: handleDrag,
    onDragOver: handleDrag,
    onDragLeave: (e) => {
      e.stopPropagation();
      const next = e.relatedTarget as Node | null;
      if (next && e.currentTarget.contains(next)) return;
      setDropHover(null);
    },
    onDrop: (e) => {
      e.preventDefault();
      e.stopPropagation();
      const index = computeInsertIndex(e, direction);
      setDropHover(null);
      const payload = e.dataTransfer.getData('application/atelier-block');
      const moveId = e.dataTransfer.getData('application/atelier-block-id');
      if (moveId) onDrop(blockId, moveId, index);
      else if (payload) onDrop(blockId, payload, index);
    },
  };
}

function blockBaseStyle(block: DocBlock): CSSProperties {
  const isPageContent = block.containerRole === 'page-content';
  const padding =
    block.type === 'container'
      ? (block.padding ?? 0) + (isPageContent ? 0 : (block.blockPadding ?? 0))
      : (block.blockPadding ?? 0);

  const style: CSSProperties = {
    padding,
    marginTop: isPageContent ? 0 : (block.blockMarginTop ?? 0),
    marginRight: isPageContent ? 0 : (block.blockMarginRight ?? 0),
    marginBottom: isPageContent ? 0 : (block.blockMarginBottom ?? 0),
    marginLeft: isPageContent ? 0 : (block.blockMarginLeft ?? 0),
    boxSizing: 'border-box',
  };

  if (block.type !== 'container') {
    style.flex = block.flex;
    style.width = block.width;
  }

  return style;
}

function resolveContainerLayout(block: DocBlock, depth: number): CSSProperties {
  const layout: CSSProperties = {
    width: '100%',
    maxWidth: '100%',
    minHeight: 0,
    minWidth: 0,
    boxSizing: 'border-box',
  };

  // Conteneur imbriqué : le wrap parent porte la taille, l'intérieur remplit le wrap.
  if (depth > 0) {
    return {
      ...layout,
      flex: '1 1 auto',
      height: '100%',
    };
  }

  if (block.height === 'auto') {
    layout.flex = '0 1 auto';
    layout.height = 'auto';
  } else if (block.height) {
    const height = normalizeContainerSize(block.height) ?? block.height;
    layout.flex = `0 0 ${height}`;
    layout.height = height;
    layout.maxHeight = height;
  } else {
    layout.flex = '1 1 0%';
    layout.height = '100%';
  }

  if (block.width && block.width !== '100%') {
    const width = normalizeContainerSize(block.width) ?? block.width;
    layout.width = width;
    layout.maxWidth = width;
  }

  return layout;
}

function parentJustifyDistributesMain(justify?: DocBlock['justify']): boolean {
  return (
    justify === 'center' ||
    justify === 'flex-end' ||
    justify === 'space-around' ||
    justify === 'space-evenly'
  );
}

function getChildWrapStyle(
  child: DocBlock,
  parentDirection: LayoutAxis,
  parentAlign?: DocBlock['align'],
  parentJustify?: DocBlock['justify'],
  parentContainer?: DocBlock,
): CSSProperties {
  const style: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    minHeight: 0,
    boxSizing: 'border-box',
  };

  if (child.type !== 'container') {
    const crossAlign = parentAlign && parentAlign !== 'stretch' ? parentAlign : undefined;

    if (parentDirection === 'row') {
      const imageLayout = getImageChildWrapLayout(child, 'row', parentContainer);
      const imageHeight = isImageBlock(child) ? resolveImageHeight(child.imageHeight) : null;
      const pctHeight = imageHeight !== null && isPercentSize(imageHeight);
      const parentRowHasHeight = Boolean(
        parentContainer?.height && parentContainer.height !== 'auto',
      );
      const isFullWidth = !imageLayout || imageLayout.width === '100%';
      const distributeMain = parentJustifyDistributesMain(parentJustify);

      const rowItem: CSSProperties = {
        ...style,
        minWidth: 0,
        maxWidth: '100%',
        flex: distributeMain || !isFullWidth ? '0 1 auto' : '1 1 0%',
      };

      if (imageLayout) {
        Object.assign(rowItem, imageLayout);
      } else if (rowItem.flex === '1 1 0%') {
        rowItem.width = 'auto';
      } else {
        rowItem.width = 'auto';
      }

      if (distributeMain && isImageBlock(child)) {
        const w = resolveImageWidth(child.imageWidth);
        rowItem.width = 'auto';
        rowItem.maxWidth = w === 'auto' ? '100%' : w;
        rowItem.flex = '0 1 auto';
      }

      if (pctHeight) {
        if (parentRowHasHeight) {
          rowItem.alignSelf = 'stretch';
          rowItem.height = '100%';
        } else {
          rowItem.alignSelf = crossAlign ?? 'auto';
          rowItem.height = 'auto';
        }
        rowItem.alignItems = distributeMain ? 'center' : 'stretch';
      } else if (crossAlign) {
        rowItem.alignSelf = crossAlign;
      } else if (imageHeight !== null && hasFixedImageHeight(imageHeight)) {
        rowItem.alignSelf = 'flex-start';
      }

      if (!pctHeight) {
        rowItem.alignItems = !isFullWidth || distributeMain ? 'center' : 'stretch';
      }
      return rowItem;
    }

    const base: CSSProperties = { ...style, flexShrink: 0 };
    if (crossAlign) {
      base.alignItems = crossAlign;
    }
    const imageLayout = getImageChildWrapLayout(child, 'column');
    if (imageLayout) return { ...base, ...imageLayout };
    return { ...base, width: '100%' };
  }

  const customWidth = Boolean(child.width && child.width !== '100%');
  const customHeight = Boolean(child.height && child.height !== 'auto');
  const heightCss = customHeight ? normalizeContainerSize(child.height) ?? child.height : undefined;
  const widthCss = customWidth ? normalizeContainerSize(child.width) ?? child.width : undefined;

  if (parentDirection === 'column') {
    style.width = '100%';
    if (customHeight && heightCss) {
      // Axe principal = vertical : flex-basis en % comme en CSS flex.
      style.flex = `0 0 ${heightCss}`;
      style.minHeight = 0;
    } else {
      style.flex = '1 1 0%';
      style.minHeight = 0;
    }
    return style;
  }

  if (customWidth && widthCss) {
    style.flex = `0 0 ${widthCss}`;
    style.width = widthCss;
    style.maxWidth = widthCss;
  } else {
    style.flex = '1 1 0%';
    style.width = 'auto';
    style.minWidth = 0;
  }

  if (customHeight && heightCss) {
    // Axe secondaire = vertical dans une ligne : height en % du parent (comme en CSS flex).
    style.height = heightCss;
    style.maxHeight = heightCss;
    style.minHeight = 0;
    style.flexShrink = 0;
    const crossAlign =
      parentAlign && parentAlign !== 'stretch' ? parentAlign : 'flex-start';
    style.alignSelf = crossAlign;
  } else {
    style.alignSelf = 'stretch';
    style.minHeight = 0;
  }

  return style;
}

function textStyle(block: DocBlock, resolveCss: (family?: DocBlock['fontFamily']) => string): CSSProperties {
  return {
    fontSize: formatFontSizePt(block.fontSize),
    fontFamily: resolveCss(block.fontFamily),
    fontWeight: block.fontWeight ?? 'normal',
    textAlign: block.textAlign ?? 'left',
    color: block.color ?? 'inherit',
    width: block.writingMode && block.writingMode !== 'horizontal-tb' ? 'auto' : '100%',
    writingMode: block.writingMode,
    textTransform:
      block.textTransform && block.textTransform !== 'none' ? block.textTransform : undefined,
    letterSpacing: block.textTransform === 'uppercase' ? '0.06em' : undefined,
    display: 'block',
    lineHeight: 1,
    margin: 0,
  };
}

function DropSlot({
  direction,
  active,
  trailing,
}: {
  direction: LayoutAxis;
  active: boolean;
  trailing?: boolean;
}) {
  return (
    <div
      className={`block-drop-slot block-drop-slot-${direction}${trailing ? ' block-drop-slot-trailing' : ''} ${active ? 'active' : ''}`}
      aria-hidden
    />
  );
}

export function BlockRenderer({
  block,
  ctx,
  mode = 'preview',
  selectedId,
  onSelect,
  onPageBackgroundClick,
  onDrop,
  depth = 0,
  parentLayout,
}: BlockRendererProps) {
  const isEdit = mode === 'edit';
  const isSelected = selectedId === block.id;
  const { hover: dropHover, setHover: setDropHover } = useDropHover();
  const { resolveCss, ensureLoaded } = useFontsOptional();

  useEffect(() => {
    if (block.fontFamily) void ensureLoaded([block.fontFamily]);
  }, [block.fontFamily, ensureLoaded]);

  const wrap = (
    children: ReactNode,
    className: string,
    style?: CSSProperties,
    dragHandlers?: ContainerDragHandlers,
  ) => {
    const merged = { ...blockBaseStyle(block), ...style };
    if (!isEdit) return <div className={className} style={merged}>{children}</div>;
    return (
      <div
        className={`${className} ${isSelected ? 'block-selected' : ''} block-editable`}
        style={merged}
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(block.id);
        }}
        draggable={depth > 0}
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('application/atelier-block-id', block.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragEnd={() => setDropHover(null)}
        {...dragHandlers}
      >
        {children}
      </div>
    );
  };

  if (block.type === 'container') {
    const children = block.children ?? [];
    const isEmpty = children.length === 0;
    const direction = block.direction ?? 'column';
    const layoutAxis = flexAxis(direction);
    const style: CSSProperties = {
      display: 'flex',
      flexDirection: direction,
      gap: block.gap ?? 0,
      alignItems: isEmpty && isEdit ? 'center' : (block.align ?? 'stretch'),
      justifyContent: isEmpty && isEdit ? 'center' : (block.justify ?? 'flex-start'),
      boxShadow: isEdit ? 'inset 0 0 0 1px rgba(0, 0, 0, 0.08)' : undefined,
      ...surfaceBackgroundToCss(resolveBlockSurfaceBackground(block)),
      ...resolveContainerLayout(block, depth),
    };
    const containerDrag = createContainerDragHandlers(
      block.id,
      layoutAxis,
      isEdit,
      onDrop,
      setDropHover,
    );
    return wrap(
      <>
        {isEdit && children.length === 0 && (
          <span className="block-empty-hint">Glissez des blocs ici</span>
        )}
        {children.map((child, i) => (
          <div
            key={child.id}
            className="block-child-wrap"
            style={getChildWrapStyle(child, layoutAxis, block.align, block.justify, block)}
          >
            {isEdit && (
              <DropSlot
                direction={layoutAxis}
                active={dropHover?.parentId === block.id && dropHover.index === i}
              />
            )}
            <BlockRenderer
              block={child}
              ctx={ctx}
              mode={mode}
              selectedId={selectedId}
              onSelect={onSelect}
              onPageBackgroundClick={onPageBackgroundClick}
              onDrop={onDrop}
              depth={depth + 1}
              parentLayout={{ direction: layoutAxis, container: block }}
            />
          </div>
        ))}
        {isEdit && (
          <DropSlot
            direction={layoutAxis}
            trailing
            active={dropHover?.parentId === block.id && dropHover.index === children.length}
          />
        )}
      </>,
      `tpl-container tpl-${layoutAxis}${isEdit && isEmpty ? ' tpl-container-empty' : ''}`,
      style,
      containerDrag,
    );
  }

  if (block.type === 'spacer') {
    return wrap(null, 'tpl-spacer', { height: block.spacerHeight ?? 12, width: '100%' });
  }

  if (block.type === 'rectangle') {
    return wrap(null, 'tpl-rectangle', {
      height: block.rectHeight ?? 24,
      width: block.width ?? '100%',
      maxWidth: '100%',
      alignSelf: block.selfAlign ?? 'center',
      backgroundColor: block.backgroundColor ?? '#e8e4dc',
      border: `${block.borderWidth ?? 1}px solid ${block.borderColor ?? '#d4d0c8'}`,
    });
  }

  if (block.type === 'image') {
    const fillParentHeight = imageFillParentHeight(block, parentLayout);
    const centerInRow = imageCenterInRow(block, parentLayout);
    const { wrapper, inner } = buildImageBlockLayout(
      block.imageWidth,
      block.imageHeight,
      block.objectFit ?? 'cover',
      fillParentHeight,
      centerInRow,
      block.imageShadow,
    );
    return wrap(
      block.imageSrc ? (
        <img src={block.imageSrc} alt="" style={inner} />
      ) : (
        <div className="tpl-image-placeholder" style={inner}>
          Image statique
        </div>
      ),
      'tpl-static-image',
      wrapper,
    );
  }

  if (block.type === 'text') {
    const style = textStyle(block, resolveCss);
    const raw = block.content || (isEdit ? 'Texte libre' : '');
    const text = resolveShortcodes(raw, ctx) || (isEdit ? 'Texte libre' : '');
    return wrap(<span style={style}>{text}</span>, 'tpl-text');
  }

  if (block.type === 'field' && block.field) {
    const def = FIELD_CATALOG.find((f) => f.key === block.field);
    if (isImageField(block.field)) {
      const src = resolveImage(block.field, ctx);
      const fillParentHeight = imageFillParentHeight(block, parentLayout);
      const centerInRow = imageCenterInRow(block, parentLayout);
      const { wrapper, inner } = buildImageBlockLayout(
        block.imageWidth,
        block.imageHeight,
        block.objectFit ?? 'cover',
        fillParentHeight,
        centerInRow,
        block.imageShadow,
      );
      return wrap(
        src ? (
          <img src={src} alt="" style={inner} />
        ) : (
          <div className="tpl-image-placeholder" style={inner}>
            {def?.label ?? 'Image'}
          </div>
        ),
        'tpl-field tpl-image',
        wrapper,
      );
    }
    const text = resolveField(block.field, ctx) || def?.preview || `[${block.field}]`;
    const style = textStyle(block, resolveCss);
    return wrap(<span style={style}>{text}</span>, 'tpl-field');
  }

  return null;
}

export { getPageDimensions } from '../../utils/pageLayout';
export { getChildWrapStyle };
