import { Link } from 'react-router-dom';
import type { DocTemplate, PageFormat } from '../../types/templates';
import { PAGE_FORMATS, TEMPLATE_TYPES } from '../../types/templates';
import { isBuiltinTemplate } from '../../utils/templateCatalog';

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
  return (
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
              onChange={(e) => onPatchDraft((t) => ({ ...t, type: e.target.value as DocTemplate['type'] }))}
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
              value={draft?.format ?? 'a4'}
              disabled={isReadonly}
              onChange={(e) => onPatchDraft((t) => ({ ...t, format: e.target.value as PageFormat }))}
            >
              {PAGE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className="editor-toolbar-field">
            <span className="editor-compact-label">Marges (mm)</span>
            <input
              type="number"
              min={0}
              max={80}
              disabled={isReadonly}
              value={draft?.margin ?? 12}
              onChange={(e) =>
                onPatchDraft((t) => ({ ...t, margin: Math.max(0, parseInt(e.target.value) || 0) }))
              }
            />
          </label>
          <label className="editor-toolbar-field editor-toolbar-field-color">
            <span className="editor-compact-label">Fond</span>
            <input
              type="color"
              disabled={isReadonly}
              value={draft?.background ?? '#f5f2ed'}
              onChange={(e) =>
                onPatchDraft((t) => ({ ...t, background: e.target.value, pageBgType: 'color' }))
              }
            />
          </label>
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
  );
}
