import { useCallback, useRef, useState } from 'react';
import type { BackgroundFillType, BackgroundImageFieldKey, BackgroundImageFit, BackgroundValue } from '../../utils/backgroundStyle';
import {
  BACKGROUND_IMAGE_FIELD_OPTIONS,
  DEFAULT_IMAGE_SIZE,
  backgroundImageFieldLabel,
} from '../../utils/backgroundStyle';
import { fileToDataUrl } from '../../utils/helpers';
import { shortcodeTag } from '../../utils/templateShortcodes';
import type { TemplateContext } from '../../utils/templateFields';
import { resolveImage } from '../../utils/templateFields';
import { BackgroundPositionPicker } from './BackgroundPositionPicker';
import { BackgroundSizePicker } from './BackgroundSizePicker';
import { ColorFieldRow } from './ColorFieldRow';
import { IconToggleGroup } from './IconToggleGroup';

const FILL_TYPE_OPTIONS = [
  { value: 'color' as const, label: 'Couleur', title: 'Couleur unie' },
  { value: 'image' as const, label: 'Image', title: 'Image de fond' },
];

const IMAGE_SOURCE_OPTIONS = [
  { value: 'static' as const, label: 'Importée', title: 'Image fixe importée depuis un fichier' },
  { value: 'dynamic' as const, label: 'Dynamique', title: 'Image liée aux données (œuvre, artiste, exposition)' },
];

const IMAGE_FIT_OPTIONS = [
  { value: 'cover' as const, label: 'Couvrir', title: 'Remplir la zone en conservant les proportions (recadrée si besoin)' },
  { value: 'contain' as const, label: 'Contenir', title: 'Image entière visible, taille et position réglables' },
  { value: 'stretch' as const, label: 'Étirer', title: 'Déformer l\'image pour remplir toute la zone' },
];

interface BackgroundControlsProps {
  label: string;
  value: BackgroundValue;
  disabled?: boolean;
  previewCtx?: TemplateContext;
  onChange: (value: BackgroundValue) => void;
  resetLabel?: string;
  onReset?: () => void;
  resetDisabled?: boolean;
  hint?: string;
}

export function BackgroundControls({
  label,
  value,
  disabled = false,
  previewCtx,
  onChange,
  resetLabel,
  onReset,
  resetDisabled = false,
  hint,
}: BackgroundControlsProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const imageSourceMode = value.imageField ? 'dynamic' : 'static';
  const resolvedDynamicImage =
    value.imageField && previewCtx ? resolveImage(value.imageField, previewCtx) : null;

  const setType = (type: BackgroundFillType) => {
    if (type === value.type) return;
    onChange({ ...value, type });
  };

  const setImageSourceMode = (mode: 'static' | 'dynamic') => {
    if (mode === imageSourceMode) return;
    if (mode === 'static') {
      onChange({ ...value, type: 'image', imageField: undefined });
      return;
    }
    onChange({
      ...value,
      type: 'image',
      image: undefined,
      imageField: value.imageField ?? 'work.image',
    });
  };

  const setDynamicField = (imageField: BackgroundImageFieldKey) => {
    onChange({
      ...value,
      type: 'image',
      image: undefined,
      imageField,
    });
  };

  const handleImagePick = useCallback(
    async (file: File | undefined) => {
      if (!file || !file.type.startsWith('image/') || disabled) return;
      const dataUrl = await fileToDataUrl(file);
      onChange({
        ...value,
        type: 'image',
        image: dataUrl,
        imageField: undefined,
      });
    },
    [disabled, onChange, value],
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleImagePick(e.target.files?.[0]);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    void handleImagePick(e.dataTransfer.files?.[0]);
  };

  return (
    <details className="block-spacing-details">
      <summary>{label}</summary>
      <div className="block-spacing-inner background-controls">
      <IconToggleGroup
        label="Type"
        compact
        value={value.type}
        onChange={setType}
        options={FILL_TYPE_OPTIONS}
      />

      {value.type === 'color' ? (
        <ColorFieldRow
          label="Couleur"
          value={value.color}
          disabled={disabled}
          onChange={(color) => onChange({ ...value, type: 'color', color })}
        />
      ) : (
        <div className="background-image-section">
          <IconToggleGroup
            label="Source"
            compact
            value={imageSourceMode}
            onChange={setImageSourceMode}
            options={IMAGE_SOURCE_OPTIONS}
          />

          {imageSourceMode === 'dynamic' ? (
            <div className="background-image-panel">
              <div className="shortcode-insert">
                <p className="hint">Données dynamiques — cliquez pour sélectionner :</p>
                <div className="shortcode-chips">
                  {BACKGROUND_IMAGE_FIELD_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`shortcode-chip${value.imageField === option.value ? ' is-active' : ''}`}
                      disabled={disabled}
                      title={option.title}
                      onClick={() => setDynamicField(option.value)}
                    >
                      {shortcodeTag(option.label)}
                    </button>
                  ))}
                </div>
              </div>
              {value.imageField ? (
                resolvedDynamicImage ? (
                  <div className="background-image-preview-frame">
                    <img src={resolvedDynamicImage} alt="" className="background-image-preview-img" />
                  </div>
                ) : (
                  <p className="shortcode-preview">
                    <span className="hint">Aperçu :</span>{' '}
                    {shortcodeTag(backgroundImageFieldLabel(value.imageField))} — selon les données de
                    prévisualisation
                  </p>
                )
              ) : null}
            </div>
          ) : (
            <div className="background-image-panel">
              {value.image ? (
                <>
                  <div className="background-image-preview-frame">
                    <img src={value.image} alt="" className="background-image-preview-img" />
                  </div>
                  <div className="background-image-toolbar">
                    <label className={`btn btn-secondary btn-sm${disabled ? ' disabled' : ''}`}>
                      Remplacer
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        hidden
                        disabled={disabled}
                        onChange={onFileInput}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={disabled}
                      onClick={() => onChange({ ...value, image: undefined })}
                    >
                      Retirer
                    </button>
                  </div>
                </>
              ) : (
                <label
                  className={`background-image-dropzone${dragging ? ' is-dragging' : ''}${disabled ? ' is-disabled' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!disabled) setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                >
                  <span className="background-image-dropzone-icon" aria-hidden>
                    ↑
                  </span>
                  <span className="background-image-dropzone-title">Ajouter une image</span>
                  <span className="background-image-dropzone-hint">Glisser-déposer ou cliquer</span>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    disabled={disabled}
                    onChange={onFileInput}
                  />
                </label>
              )}
            </div>
          )}

          <div className="form-row form-row-dense background-image-options">
            <IconToggleGroup
              label="Ajustement"
              compact
              value={value.imageFit}
              onChange={(imageFit: BackgroundImageFit) =>
                onChange({
                  ...value,
                  imageFit,
                  imageSize:
                    imageFit === 'contain' ? (value.imageSize ?? DEFAULT_IMAGE_SIZE) : value.imageSize,
                })
              }
              options={IMAGE_FIT_OPTIONS}
            />
            <label className="color-field-compact">
              <span className="editor-compact-label">Fond</span>
              <input
                type="color"
                disabled={disabled}
                value={value.color}
                onChange={(e) => onChange({ ...value, color: e.target.value })}
                title="Couleur visible sous l'image ou dans les marges"
              />
            </label>
          </div>

          {value.imageFit === 'contain' && (
            <>
              <BackgroundSizePicker
                label="Taille"
                value={value.imageSize}
                disabled={disabled}
                onChange={(imageSize) => onChange({ ...value, imageSize })}
              />
              <BackgroundPositionPicker
                label="Position"
                value={value.imagePosition}
                disabled={disabled}
                onChange={(imagePosition) => onChange({ ...value, imagePosition })}
              />
            </>
          )}
        </div>
      )}

      {(resetLabel && onReset) || hint ? (
        <div className="background-controls-footer">
          {resetLabel && onReset ? (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              disabled={disabled || resetDisabled}
              onClick={onReset}
            >
              {resetLabel}
            </button>
          ) : (
            <span />
          )}
          {hint && <p className="hint background-controls-hint">{hint}</p>}
        </div>
      ) : null}
      </div>
    </details>
  );
}
