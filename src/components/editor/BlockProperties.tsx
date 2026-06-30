import { useEffect, useRef, useState } from 'react';
import { FONT_FAMILIES, FONT_SIZE_PRESETS } from '../../utils/fonts';
import type { DocBlock, ImageDropShadow } from '../../types/templates';
import { FIELD_CATALOG, isImageField, type TemplateContext } from '../../utils/templateFields';
import { resolveShortcodes, shortcodeTag, TEXT_SHORTCODE_FIELDS } from '../../utils/templateShortcodes';
import { IconToggleGroup } from './IconToggleGroup';
import { FlexDirectionControls } from './FlexDirectionControls';
import { flexAxis, flexDirectionLabel } from '../../utils/flexDirection';
import {
  DEFAULT_IMAGE_DROP_SHADOW,
  imageObjectFitApplies,
  normalizeImageDropShadow,
} from '../../utils/imageBlockLayout';
import { blockSupportsBackground, getBlockBackgroundValues } from '../../utils/blockBackground';
import { deleteImageGroup, saveImageGroupFromFile } from '../../utils/mediaStore';
import { BackgroundControls } from './BackgroundControls';

type CssUnit = 'px' | '%' | 'rem' | 'em' | 'auto';

const SELF_ALIGN_OPTIONS = [
  { value: 'flex-start' as const, label: '←', title: 'Gauche' },
  { value: 'center' as const, label: '↔', title: 'Centre' },
  { value: 'flex-end' as const, label: '→', title: 'Droite' },
];

const CONTAINER_CROSS_ALIGN_COLUMN = [
  { value: 'flex-start' as const, label: '←', title: 'Début' },
  { value: 'center' as const, label: '↔', title: 'Centre' },
  { value: 'flex-end' as const, label: '→', title: 'Fin' },
  { value: 'stretch' as const, label: '⟺', title: 'Étirer' },
];

const CONTAINER_MAIN_JUSTIFY_COLUMN = [
  { value: 'flex-start' as const, label: '↑', title: 'Début' },
  { value: 'center' as const, label: '↕', title: 'Centre' },
  { value: 'flex-end' as const, label: '↓', title: 'Fin' },
  { value: 'space-between' as const, label: '⇕', title: 'Espace entre' },
  { value: 'space-around' as const, label: '◈', title: 'Espace autour' },
  { value: 'space-evenly' as const, label: '≡', title: 'Espace égal' },
];

const CONTAINER_CROSS_ALIGN_ROW = [
  { value: 'flex-start' as const, label: '↑', title: 'Début' },
  { value: 'center' as const, label: '↕', title: 'Centre' },
  { value: 'flex-end' as const, label: '↓', title: 'Fin' },
  { value: 'stretch' as const, label: '⟺', title: 'Étirer' },
];

const CONTAINER_MAIN_JUSTIFY_ROW = [
  { value: 'flex-start' as const, label: '←', title: 'Début' },
  { value: 'center' as const, label: '↔', title: 'Centre' },
  { value: 'flex-end' as const, label: '→', title: 'Fin' },
  { value: 'space-between' as const, label: '⇔', title: 'Espace entre' },
  { value: 'space-around' as const, label: '◈', title: 'Espace autour' },
  { value: 'space-evenly' as const, label: '≡', title: 'Espace égal' },
];

function parseDimension(
  raw: string | undefined,
  fallback: { value: number; unit: Exclude<CssUnit, 'auto'> } | 'auto',
): { value: number; unit: CssUnit } {
  if (raw === 'auto') return { value: 0, unit: 'auto' };
  if (!raw) {
    if (fallback === 'auto') return { value: 0, unit: 'auto' };
    return { ...fallback };
  }
  const match = raw.trim().match(/^(\d+(?:\.\d+)?)(px|%|rem|em)?$/);
  if (!match) {
    if (fallback === 'auto') return { value: 0, unit: 'auto' };
    return { ...fallback };
  }
  return {
    value: parseFloat(match[1]),
    unit: (match[2] as CssUnit) || 'px',
  };
}

function serializeDimension(value: number, unit: CssUnit): string | undefined {
  if (unit === 'auto') return undefined;
  return `${value}${unit}`;
}

function DimensionField({
  label,
  value,
  onChange,
  units,
  fallback,
  min = 0,
  max,
  step = 1,
  autoValue,
}: {
  label: string;
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  units: Exclude<CssUnit, 'auto'>[];
  fallback: { value: number; unit: Exclude<CssUnit, 'auto'> } | 'auto';
  min?: number;
  max?: number;
  step?: number;
  /** Si défini, la valeur « auto » est stockée sous cette chaîne (ex. `'auto'`) au lieu de `undefined`. */
  autoValue?: string;
}) {
  const parsed = parseDimension(value, fallback);
  const isAuto = parsed.unit === 'auto';
  const unitOptions: CssUnit[] = fallback === 'auto' ? [...units, 'auto'] : units;

  const apply = (nextValue: number, nextUnit: CssUnit) => {
    if (nextUnit === 'auto') {
      onChange(autoValue);
      return;
    }
    const unitMax = nextUnit === '%' ? 100 : max;
    const clamped = Math.max(min, unitMax !== undefined ? Math.min(unitMax, nextValue) : nextValue);
    onChange(serializeDimension(clamped, nextUnit));
  };

  return (
    <label>
      {label}
      <div className="dimension-input">
        <input
          type="number"
          min={min}
          max={parsed.unit === '%' ? 100 : max}
          step={step}
          disabled={isAuto}
          value={isAuto ? '' : parsed.value}
          onChange={(e) => apply(parseInt(e.target.value) || 0, parsed.unit === 'auto' ? 'px' : parsed.unit)}
        />
        <select
          value={parsed.unit}
          onChange={(e) => {
            const unit = e.target.value as CssUnit;
            if (unit === 'auto') apply(0, 'auto');
            else apply(isAuto ? (fallback === 'auto' ? 0 : fallback.value) : parsed.value, unit);
          }}
        >
          {unitOptions.map((u) => (
            <option key={u} value={u}>
              {u === 'auto' ? 'auto' : u}
            </option>
          ))}
        </select>
      </div>
    </label>
  );
}

function imageDimensionFieldValue(raw: string | number | undefined): string | undefined {
  if (typeof raw === 'number') return `${raw}px`;
  return raw;
}

function ImageSizeFields({
  width,
  height,
  onChange,
}: {
  width: string | number | undefined;
  height: string | number | undefined;
  onChange: (patch: Partial<Pick<DocBlock, 'imageWidth' | 'imageHeight'>>) => void;
}) {
  return (
    <>
      <DimensionField
        label="Largeur image"
        value={imageDimensionFieldValue(width)}
        onChange={(imageWidth) => onChange({ imageWidth })}
        units={['px', '%']}
        fallback={{ value: 100, unit: '%' }}
        min={0}
        max={2000}
        step={1}
        autoValue="auto"
      />
      <DimensionField
        label="Hauteur image"
        value={imageDimensionFieldValue(height)}
        onChange={(imageHeight) => onChange({ imageHeight })}
        units={['px', '%']}
        fallback={{ value: 100, unit: 'px' }}
        min={0}
        max={2000}
        step={1}
        autoValue="auto"
      />
    </>
  );
}

function ImageObjectFitField({
  block,
  onChange,
}: {
  block: DocBlock;
  onChange: (patch: Partial<DocBlock>) => void;
}) {
  if (!imageObjectFitApplies(block.imageHeight)) return null;

  return (
    <label>
      Ajustement
      <select
        value={block.objectFit ?? 'cover'}
        onChange={(e) => onChange({ objectFit: e.target.value as 'cover' | 'contain' })}
      >
        <option value="cover">Couvrir</option>
        <option value="contain">Contenir</option>
      </select>
    </label>
  );
}

function ImageShadowControls({
  block,
  onChange,
}: {
  block: DocBlock;
  onChange: (patch: Partial<DocBlock>) => void;
}) {
  const shadow = normalizeImageDropShadow(block.imageShadow) ?? { enabled: false };
  const enabled = shadow.enabled ?? false;
  const values = { ...DEFAULT_IMAGE_DROP_SHADOW, ...shadow };

  const patchShadow = (patch: Partial<ImageDropShadow>) => {
    onChange({
      imageShadow: {
        ...values,
        ...shadow,
        ...patch,
        enabled: patch.enabled ?? enabled,
      },
    });
  };

  return (
    <div className="block-spacing-inner">
      <label className="checkbox-label">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) =>
            patchShadow(
              e.target.checked
                ? { ...DEFAULT_IMAGE_DROP_SHADOW, enabled: true }
                : { enabled: false },
            )
          }
        />
        Activer l&apos;ombre
      </label>
      {enabled && (
        <>
          <div className="form-row form-row-dense">
            <label>
              <span className="editor-compact-label">Décalage X (px)</span>
              <input
                type="number"
                min={-80}
                max={80}
                value={values.offsetX}
                onChange={(e) => patchShadow({ offsetX: parseInt(e.target.value) || 0 })}
              />
            </label>
            <label>
              <span className="editor-compact-label">Décalage Y (px)</span>
              <input
                type="number"
                min={-80}
                max={80}
                value={values.offsetY}
                onChange={(e) => patchShadow({ offsetY: parseInt(e.target.value) || 0 })}
              />
            </label>
          </div>
          <div className="form-row form-row-dense">
            <label>
              <span className="editor-compact-label">Flou (px)</span>
              <input
                type="number"
                min={0}
                max={80}
                value={values.blur}
                onChange={(e) => patchShadow({ blur: Math.max(0, parseInt(e.target.value) || 0) })}
              />
            </label>
            <label>
              <span className="editor-compact-label">Opacité (%)</span>
              <input
                type="number"
                min={0}
                max={100}
                value={values.opacity}
                onChange={(e) =>
                  patchShadow({
                    opacity: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                  })
                }
              />
            </label>
          </div>
          <label className="color-field-compact">
            <span className="editor-compact-label">Couleur</span>
            <input
              type="color"
              value={values.color}
              onChange={(e) => patchShadow({ color: e.target.value })}
            />
          </label>
        </>
      )}
    </div>
  );
}

function ImageShadowDetails({
  block,
  onChange,
}: {
  block: DocBlock;
  onChange: (patch: Partial<DocBlock>) => void;
}) {
  return (
    <details className="block-spacing-details">
      <summary>Ombre</summary>
      <ImageShadowControls block={block} onChange={onChange} />
    </details>
  );
}

interface BlockPropertiesProps {
  block: DocBlock | null;
  previewCtx?: TemplateContext;
  templateId?: string;
  canDelete?: boolean;
  onChange: (patch: Partial<DocBlock>) => void;
  onMove: (dir: 'up' | 'down') => void;
  onDelete: () => void;
  onDuplicate?: () => void;
}

function FontControls({
  block,
  onChange,
}: {
  block: DocBlock;
  onChange: (patch: Partial<DocBlock>) => void;
}) {
  return (
    <>
      <label>
        Police
        <select
          value={block.fontFamily ?? 'serif'}
          onChange={(e) => onChange({ fontFamily: e.target.value as DocBlock['fontFamily'] })}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Taille prédéfinie
        <select
          value={block.fontSize ?? 11}
          onChange={(e) => onChange({ fontSize: parseInt(e.target.value) })}
        >
          {FONT_SIZE_PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label} ({p.value}px)
            </option>
          ))}
        </select>
      </label>
      <div className="form-row form-row-dense">
        <label>
          <span className="editor-compact-label">Taille (px)</span>
          <input
            type="number"
            min={6}
            max={72}
            value={block.fontSize ?? 11}
            onChange={(e) => onChange({ fontSize: parseInt(e.target.value) || 11 })}
          />
        </label>
        <IconToggleGroup
          label="Align."
          compact
          value={block.textAlign ?? 'left'}
          onChange={(textAlign) => onChange({ textAlign })}
          options={[
            { value: 'left', label: '←', title: 'Gauche' },
            { value: 'center', label: '↔', title: 'Centre' },
            { value: 'right', label: '→', title: 'Droite' },
          ]}
        />
      </div>
      <div className="form-row form-row-dense">
        <IconToggleGroup
          label="Graisse"
          compact
          value={block.fontWeight ?? 'normal'}
          onChange={(fontWeight) => onChange({ fontWeight })}
          options={[
            { value: 'normal', label: 'N', title: 'Normal' },
            { value: 'bold', label: 'B', title: 'Gras' },
          ]}
        />
        <label className="color-field-compact">
          <span className="editor-compact-label">Couleur</span>
          <input
            type="color"
            value={block.color ?? '#1a1a18'}
            onChange={(e) => onChange({ color: e.target.value })}
          />
        </label>
      </div>
      <div className="form-row form-row-dense">
        <IconToggleGroup
          label="Sens"
          compact
          value={block.writingMode ?? 'horizontal-tb'}
          onChange={(writingMode) => onChange({ writingMode })}
          options={[
            { value: 'horizontal-tb', label: '→', title: 'Horizontal' },
            { value: 'vertical-rl', label: '↓', title: 'Vertical' },
            { value: 'vertical-lr', label: '↑', title: 'Vertical inversé' },
          ]}
        />
        <IconToggleGroup
          label="Casse"
          compact
          value={block.textTransform ?? 'none'}
          onChange={(textTransform) => onChange({ textTransform })}
          options={[
            { value: 'none', label: 'Aa', title: 'Normal' },
            { value: 'uppercase', label: 'AA', title: 'Majuscules' },
          ]}
        />
      </div>
    </>
  );
}

function BlockSpacingControls({
  block,
  onChange,
}: {
  block: DocBlock;
  onChange: (p: Partial<DocBlock>) => void;
}) {
  const marginField = (side: keyof Pick<DocBlock, 'blockMarginTop' | 'blockMarginRight' | 'blockMarginBottom' | 'blockMarginLeft'>, label: string) => (
    <label>
      {label}
      <input
        type="number"
        min={0}
        max={120}
        value={block[side] ?? 0}
        onChange={(e) => onChange({ [side]: parseInt(e.target.value) || 0 })}
      />
    </label>
  );

  return (
    <div className="block-spacing-inner">
      <label>
        <span className="editor-compact-label">Padding intérieur (px)</span>
        <input
          type="number"
          min={0}
          max={48}
          value={block.blockPadding ?? 0}
          onChange={(e) => onChange({ blockPadding: parseInt(e.target.value) || 0 })}
        />
      </label>
      <p className="hint">Marges extérieures (px)</p>
      <div className="form-row form-row-dense">
        {marginField('blockMarginTop', 'Haut')}
        {marginField('blockMarginBottom', 'Bas')}
      </div>
      <div className="form-row form-row-dense">
        {marginField('blockMarginLeft', 'Gauche')}
        {marginField('blockMarginRight', 'Droite')}
      </div>
    </div>
  );
}

export function BlockProperties({
  block,
  previewCtx,
  templateId = '',
  canDelete = true,
  onChange,
  onMove,
  onDelete,
  onDuplicate,
}: BlockPropertiesProps) {
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const [localContent, setLocalContent] = useState('');
  const contentTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (block?.type === 'text') setLocalContent(block.content ?? '');
  }, [block?.id, block?.type === 'text' ? block.content : '']);

  if (!block) {
    return (
      <div className="block-properties">
        <p className="hint">Sélectionnez un bloc pour le personnaliser.</p>
      </div>
    );
  }

  const commitContent = (value: string) => {
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    onChange({ content: value });
  };

  const handleContentInput = (value: string) => {
    setLocalContent(value);
    if (contentTimerRef.current) clearTimeout(contentTimerRef.current);
    contentTimerRef.current = setTimeout(() => commitContent(value), 250);
  };

  const fieldLabel = block.field
    ? FIELD_CATALOG.find((f) => f.key === block.field)?.label
    : null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateId) return;
    try {
      const oldId = block.imageMediaGroupId;
      const groupId = await saveImageGroupFromFile(file, 'template', templateId);
      onChange({ imageMediaGroupId: groupId, imageSrc: undefined });
      if (oldId) void deleteImageGroup(oldId);
    } finally {
      e.target.value = '';
    }
  };

  const insertShortcode = (label: string) => {
    const tag = shortcodeTag(label);
    const current = block.content ?? '';
    const ta = contentRef.current;
    if (!ta) {
      onChange({ content: current + tag });
      return;
    }
    const start = ta.selectionStart ?? current.length;
    const end = ta.selectionEnd ?? current.length;
    const next = current.slice(0, start) + tag + current.slice(end);
    onChange({ content: next });
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + tag.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const resolvedPreview =
    block.type === 'text' && previewCtx && block.content
      ? resolveShortcodes(block.content, previewCtx)
      : null;

  return (
    <div className="block-properties">
      <p className="block-type-label">
        {block.type === 'container' && `Conteneur ${flexDirectionLabel(block.direction)}`}
        {block.type === 'field' && fieldLabel}
        {block.type === 'text' && 'Texte libre'}
        {block.type === 'spacer' && 'Espaceur'}
        {block.type === 'image' && 'Image statique'}
        {block.type === 'rectangle' && 'Séparateur'}
      </p>

      <details className="block-spacing-details">
        <summary>Espacement du bloc</summary>
        <BlockSpacingControls block={block} onChange={onChange} />
      </details>

      {blockSupportsBackground(block) && templateId && (
        <BackgroundControls
          title="Arrière-plan du conteneur"
          templateId={templateId}
          values={getBlockBackgroundValues(block)}
          onChange={(values) =>
            onChange({
              blockBgType: values.bgType,
              blockBgColor: values.bgColor,
              blockBgImageGroupId: values.imageGroupId,
              blockBgImageFit: values.imageFit,
            })
          }
        />
      )}

      {block.type === 'text' && (
        <>
          <label>
            Contenu
            <textarea
              ref={contentRef}
              rows={4}
              value={localContent}
              onChange={(e) => handleContentInput(e.target.value)}
              onBlur={() => commitContent(localContent)}
              placeholder="Ex. Dimensions : [Dimensions] — [Année]"
            />
          </label>
          <div className="shortcode-insert">
            <p className="hint">Données dynamiques — cliquez pour insérer :</p>
            <div className="shortcode-chips">
              {TEXT_SHORTCODE_FIELDS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className="shortcode-chip"
                  title={f.key}
                  onClick={() => insertShortcode(f.label)}
                >
                  {shortcodeTag(f.label)}
                </button>
              ))}
            </div>
          </div>
          {resolvedPreview != null && resolvedPreview !== block.content && (
            <p className="shortcode-preview">
              <span className="hint">Aperçu :</span> {resolvedPreview}
            </p>
          )}
        </>
      )}

      {(block.type === 'text' ||
        (block.type === 'field' && block.field && !isImageField(block.field))) && (
        <FontControls block={block} onChange={onChange} />
      )}

      {block.type === 'field' && block.field && isImageField(block.field) && (
        <>
          <ImageSizeFields
            width={block.imageWidth}
            height={block.imageHeight}
            onChange={onChange}
          />
          <ImageObjectFitField block={block} onChange={onChange} />
          <ImageShadowDetails block={block} onChange={onChange} />
        </>
      )}

      {block.type === 'image' && (
        <>
          <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginBottom: '0.5rem' }}>
            Choisir image
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </label>
          <ImageSizeFields
            width={block.imageWidth}
            height={block.imageHeight}
            onChange={onChange}
          />
          <ImageObjectFitField block={block} onChange={onChange} />
          <ImageShadowDetails block={block} onChange={onChange} />
        </>
      )}

      {block.type === 'rectangle' && (
        <>
          <DimensionField
            label="Largeur"
            value={block.width}
            units={['px', '%']}
            fallback={{ value: 100, unit: '%' }}
            onChange={(width) => onChange({ width: width ?? '100%' })}
          />
          <IconToggleGroup
            label="Alignement"
            value={block.selfAlign ?? 'center'}
            onChange={(selfAlign) => onChange({ selfAlign })}
            options={SELF_ALIGN_OPTIONS}
          />
          <label>
            Hauteur (px)
            <input
              type="number"
              min={4}
              max={200}
              value={block.rectHeight ?? 24}
              onChange={(e) => onChange({ rectHeight: parseInt(e.target.value) || 24 })}
            />
          </label>
          <label>
            Fond
            <input
              type="color"
              value={block.backgroundColor ?? '#e8e4dc'}
              onChange={(e) => onChange({ backgroundColor: e.target.value })}
            />
          </label>
          <label>
            Bordure
            <input
              type="color"
              value={block.borderColor ?? '#d4d0c8'}
              onChange={(e) => onChange({ borderColor: e.target.value })}
            />
          </label>
          <label>
            Épaisseur bordure
            <input
              type="number"
              min={0}
              max={8}
              value={block.borderWidth ?? 1}
              onChange={(e) => onChange({ borderWidth: parseInt(e.target.value) || 0 })}
            />
          </label>
        </>
      )}

      {block.type === 'container' && (
        <>
          <FlexDirectionControls value={block.direction} onChange={(direction) => onChange({ direction })} />
          <div className="form-row">
            <DimensionField
              label="Largeur"
              value={block.width}
              units={['px', '%']}
              fallback={{ value: 100, unit: '%' }}
              onChange={(width) => onChange({ width })}
            />
            <DimensionField
              label="Hauteur"
              value={block.height}
              units={['px', '%']}
              fallback="auto"
              onChange={(height) => onChange({ height })}
            />
          </div>
          <div className="form-row">
            {(block.children?.length ?? 0) > 1 && (
              <label>
                Gap (espacement)
                <input
                  type="number"
                  min={0}
                  max={48}
                  value={block.gap ?? 0}
                  onChange={(e) => onChange({ gap: parseInt(e.target.value) || 0 })}
                />
              </label>
            )}
            <label>
              Padding conteneur
              <input
                type="number"
                min={0}
                max={48}
                value={block.padding ?? 0}
                onChange={(e) => onChange({ padding: parseInt(e.target.value) || 0 })}
              />
            </label>
          </div>
          <div className="form-row form-row-dense">
            <IconToggleGroup
              label={flexAxis(block.direction) === 'row' ? 'Align. vertical' : 'Align. horizontal'}
              compact
              value={block.align ?? 'stretch'}
              onChange={(align) => onChange({ align })}
              options={
                flexAxis(block.direction) === 'row'
                  ? CONTAINER_CROSS_ALIGN_ROW
                  : CONTAINER_CROSS_ALIGN_COLUMN
              }
            />
            <IconToggleGroup
              label={flexAxis(block.direction) === 'row' ? 'Distrib. horiz.' : 'Distrib. verticale'}
              compact
              value={block.justify ?? 'flex-start'}
              onChange={(justify) => onChange({ justify })}
              options={
                flexAxis(block.direction) === 'row'
                  ? CONTAINER_MAIN_JUSTIFY_ROW
                  : CONTAINER_MAIN_JUSTIFY_COLUMN
              }
            />
          </div>
        </>
      )}

      {block.type === 'spacer' && (
        <label>
          Hauteur (px)
          <input
            type="number"
            min={0}
            value={block.spacerHeight ?? 12}
            onChange={(e) => onChange({ spacerHeight: Math.max(0, parseInt(e.target.value) || 0) })}
          />
        </label>
      )}

      <div className="btn-row block-actions-row">
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onMove('up')} title="Monter">
          ↑
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={() => onMove('down')} title="Descendre">
          ↓
        </button>
        {onDuplicate && (
          <button type="button" className="btn btn-ghost btn-sm btn-icon" onClick={onDuplicate} title="Dupliquer (Ctrl+D)">
            ⧉
          </button>
        )}
        <button
          type="button"
          className="btn btn-danger btn-sm btn-icon"
          disabled={!canDelete}
          title={canDelete ? 'Supprimer' : 'Le conteneur racine ne peut pas être supprimé'}
          onClick={onDelete}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
