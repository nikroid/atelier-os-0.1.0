import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ConfirmDeleteModal } from '../ConfirmDeleteModal';
import type { DocTemplate, PageFormatRef } from '../../types/templates';
import { PAGE_FORMATS, TEMPLATE_TYPES } from '../../types/templates';
import { isBuiltinTemplate } from '../../utils/templateCatalog';
import { ensureCartelLayout } from '../../utils/cartelLayout';
import { usePageFormats } from '../../hooks/usePageFormats';
import { IconToggleGroup } from './IconToggleGroup';
import {
  applyPreset,
  formatAspectRatio,
  getOrientation,
  getTemplatePageDimensions,
  resolveFormatRef,
  toggleOrientation,
  matchesPreset,
} from '../../utils/pageLayout';
import { DEFAULT_PAGE_BACKGROUND } from '../../utils/backgroundStyle';

interface EditorToolbarProps {
  activeId: string | null;
  onActiveIdChange: (id: string | null) => void;
  allTemplates: DocTemplate[] | undefined;
  customTemplates: DocTemplate[];
  draft: DocTemplate | null;
  isReadonly: boolean;
  saved: boolean;
  onPatchDraft: (updater: (t: DocTemplate) => DocTemplate) => void;
  onSave: () => void;
  onCreateNew: () => void;
  onCreateCopy: () => void;
  onRemove: () => void;
}

const PAGE_DIM_MIN = 50;
const PAGE_DIM_MAX = 600;

export function EditorToolbar({
  activeId,
  onActiveIdChange,
  allTemplates,
  customTemplates,
  draft,
  isReadonly,
  saved,
  onPatchDraft,
  onSave,
  onCreateNew,
  onCreateCopy,
  onRemove,
}: EditorToolbarProps) {
  const { customPageFormats, customPageFormatMap, saveFormat, deleteFormat } = usePageFormats();
  const [saveFormatOpen, setSaveFormatOpen] = useState(false);
  const [saveFormatName, setSaveFormatName] = useState('');
  const [deleteFormatOpen, setDeleteFormatOpen] = useState(false);

  const widthMm = draft?.widthMm ?? 210;
  const heightMm = draft?.heightMm ?? 297;
  const formatRef = draft?.formatRef ?? draft?.format ?? 'a4';
  const orientation = getOrientation(widthMm, heightMm);
  const dimLabel = draft ? getTemplatePageDimensions(draft, customPageFormatMap).label : 'A4';

  const patchDimensions = (w: number, h: number) => {
    const clampedW = Math.min(PAGE_DIM_MAX, Math.max(PAGE_DIM_MIN, w));
    const clampedH = Math.min(PAGE_DIM_MAX, Math.max(PAGE_DIM_MIN, h));
    onPatchDraft((t) => {
      const nextRef = resolveFormatRef(clampedW, clampedH, t.formatRef ?? t.format, customPageFormatMap);
      const legacyFormat = nextRef !== 'free' && !String(nextRef).startsWith('custom:')
        ? (nextRef as DocTemplate['format'])
        : t.format;
      return {
        ...t,
        widthMm: clampedW,
        heightMm: clampedH,
        formatRef: nextRef,
        format: legacyFormat,
      };
    });
  };

  const handleFormatSelect = (value: string) => {
    if (value === 'free') return;
    const ref = value as PageFormatRef;
    const applied = applyPreset(ref, orientation, customPageFormatMap);
    if (!applied) return;
    onPatchDraft((t) => ({
      ...t,
      ...applied,
      format: ref !== 'free' && !String(ref).startsWith('custom:') ? (ref as DocTemplate['format']) : t.format,
    }));
  };

  const handleOrientationChange = (next: 'portrait' | 'landscape') => {
    if (next === orientation) return;
    const swapped = toggleOrientation(widthMm, heightMm);
    patchDimensions(swapped.w, swapped.h);
  };

  const handleSaveFormat = async () => {
    if (!draft) return;
    const saved = await saveFormat(saveFormatName, widthMm, heightMm);
    onPatchDraft((t) => ({
      ...t,
      formatRef: `custom:${saved.id}`,
    }));
    setSaveFormatOpen(false);
    setSaveFormatName('');
  };

  const handleDeleteCustomFormat = async () => {
    if (!formatRef.startsWith('custom:')) return;
    const id = formatRef.slice('custom:'.length);
    await deleteFormat(id);
    onPatchDraft((t) => ({ ...t, formatRef: 'free' }));
    setDeleteFormatOpen(false);
  };

  const selectValue =
    formatRef !== 'free' && !matchesPreset(widthMm, heightMm, formatRef, customPageFormatMap)
      ? 'free'
      : formatRef;

  return (
    <>
    <div className="editor-toolbar-compact">
      <div className="editor-toolbar-primary">
        <label className="editor-toolbar-field editor-toolbar-field-grow">
          <span className="editor-compact-label">Modèle</span>
          <select value={activeId ?? ''} onChange={(e) => onActiveIdChange(e.target.value || null)}>
            <option value="">— Choisir —</option>
            <optgroup label="Par défaut">
              {allTemplates?.filter((t) => isBuiltinTemplate(t)).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nom}
                </option>
              ))}
            </optgroup>
            {customTemplates.length > 0 && (
              <optgroup label="Mes modèles">
                {customTemplates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nom}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label className="editor-toolbar-field editor-toolbar-field-grow">
          <span className="editor-compact-label">Nom</span>
          <input
            value={draft?.nom ?? ''}
            disabled={isReadonly}
            onChange={(e) => onPatchDraft((t) => ({ ...t, nom: e.target.value }))}
          />
        </label>
        <div className="editor-toolbar-actions btn-row">
          <Link to="/generer" className="btn btn-secondary btn-sm">
            → Générer PDF
          </Link>
          {!isReadonly && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onSave}
              disabled={!draft || saved}
            >
              {saved ? 'Enregistré' : 'Enregistrer'}
            </button>
          )}
          {!isReadonly && (
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={onRemove}
              disabled={!draft}
              title="Supprimer ce modèle"
            >
              Supprimer
            </button>
          )}
          {isReadonly && draft && (
            <button type="button" className="btn btn-primary btn-sm" onClick={onCreateCopy}>
              Créer une copie
            </button>
          )}
        </div>
      </div>

      <details className="editor-toolbar-details">
        <summary>Réglages du document</summary>
        <div className="editor-toolbar-secondary">
          <label className="editor-toolbar-field">
            <span className="editor-compact-label">Type</span>
            <select
              value={draft?.type ?? 'custom'}
              disabled={isReadonly}
              onChange={(e) =>
                onPatchDraft((t) =>
                  ensureCartelLayout({ ...t, type: e.target.value as DocTemplate['type'] }),
                )
              }
            >
              {TEMPLATE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-toolbar-field">
            <span className="editor-compact-label">Format</span>
            <select
              value={selectValue}
              disabled={isReadonly}
              onChange={(e) => handleFormatSelect(e.target.value)}
            >
              <optgroup label="Prédéfinis">
                {PAGE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
              {customPageFormats.length > 0 && (
                <optgroup label="Mes formats">
                  {customPageFormats.map((f) => (
                    <option key={f.id} value={`custom:${f.id}`}>
                      {f.name}
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="free">Personnalisé</option>
            </select>
          </label>
          <label className="editor-toolbar-field editor-toolbar-field-dim">
            <span className="editor-compact-label">Largeur (mm)</span>
            <input
              type="number"
              min={PAGE_DIM_MIN}
              max={PAGE_DIM_MAX}
              disabled={isReadonly}
              value={Math.round(widthMm)}
              onChange={(e) => patchDimensions(parseInt(e.target.value, 10) || PAGE_DIM_MIN, heightMm)}
            />
          </label>
          <label className="editor-toolbar-field editor-toolbar-field-dim">
            <span className="editor-compact-label">Hauteur (mm)</span>
            <input
              type="number"
              min={PAGE_DIM_MIN}
              max={PAGE_DIM_MAX}
              disabled={isReadonly}
              value={Math.round(heightMm)}
              onChange={(e) => patchDimensions(widthMm, parseInt(e.target.value, 10) || PAGE_DIM_MIN)}
            />
          </label>
          <span className="editor-toolbar-ratio" title={dimLabel}>
            {Math.round(widthMm)} × {Math.round(heightMm)} mm · 1∶{formatAspectRatio(widthMm, heightMm)}
          </span>
          <IconToggleGroup
            label="Orientation"
            value={orientation}
            compact
            iconOnly
            options={[
              { value: 'portrait', label: '▯', title: 'Portrait' },
              { value: 'landscape', label: '▭', title: 'Paysage' },
            ]}
            onChange={handleOrientationChange}
          />
          <label className="editor-toolbar-field">
            <span className="editor-compact-label">Marges (mm)</span>
            <input
              type="number"
              min={0}
              max={80}
              disabled={isReadonly}
              value={draft?.margin ?? 12}
              onChange={(e) =>
                onPatchDraft((t) => ({ ...t, margin: Math.max(0, parseInt(e.target.value, 10) || 0) }))
              }
            />
          </label>
          <label className="editor-toolbar-field editor-toolbar-field-color">
            <span className="editor-compact-label">Arrière-plan</span>
            <input
              type="color"
              disabled={isReadonly}
              value={draft?.background ?? DEFAULT_PAGE_BACKGROUND}
              onChange={(e) => onPatchDraft((t) => ({ ...t, background: e.target.value }))}
            />
          </label>
          {!isReadonly && (
            <div className="editor-toolbar-format-actions">
              {!saveFormatOpen ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setSaveFormatOpen(true)}
                >
                  Enregistrer ce format…
                </button>
              ) : (
                <div className="editor-toolbar-save-format">
                  <input
                    type="text"
                    placeholder="Nom du format"
                    value={saveFormatName}
                    onChange={(e) => setSaveFormatName(e.target.value)}
                  />
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => void handleSaveFormat()}>
                    OK
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSaveFormatOpen(false)}>
                    Annuler
                  </button>
                </div>
              )}
              {formatRef.startsWith('custom:') && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleteFormatOpen(true)}>
                  Supprimer le format
                </button>
              )}
            </div>
          )}
          <div className="editor-toolbar-secondary-actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCreateNew}>
              + Nouveau
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCreateCopy} disabled={!draft}>
              {isReadonly ? 'Personnaliser' : 'Dupliquer'}
            </button>
          </div>
        </div>
      </details>
    </div>

    <ConfirmDeleteModal
      open={deleteFormatOpen}
      title="Supprimer le format"
      onClose={() => setDeleteFormatOpen(false)}
      onConfirm={handleDeleteCustomFormat}
    >
      <p>Supprimer ce format enregistré ? Cette action est irréversible.</p>
    </ConfirmDeleteModal>
    </>
  );
}
