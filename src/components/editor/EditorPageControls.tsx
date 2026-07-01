import type { DocTemplatePage, PageKind } from '../../types/templates';
import {
  blockBackgroundValueFromPage,
  clearPageBackgroundPatch,
  pageHasCustomBackground,
  pagePatchFromBackgroundValue,
} from '../../utils/backgroundStyle';
import type { TemplateContext } from '../../utils/templateFields';
import { pageKindLabel } from '../../utils/templatePages';
import { BackgroundControls } from './BackgroundControls';
import { IconToggleGroup } from './IconToggleGroup';

const PAGE_KIND_OPTIONS = [
  { value: 'static' as const, label: 'Unique', title: 'Page unique (une fois dans le PDF)' },
  { value: 'dynamic' as const, label: 'Dynamique', title: 'Page dynamique (répétée par œuvre sélectionnée)' },
];

interface EditorPageSettingsProps {
  page: DocTemplatePage;
  pageIndex: number;
  pageCount: number;
  templateBackground: string;
  previewCtx?: TemplateContext;
  readonly?: boolean;
  onKindChange: (kind: PageKind) => void;
  onBackgroundPatch: (patch: Partial<DocTemplatePage>) => void;
  onSaveAsPageTemplate?: () => void;
  onLoadPageTemplate?: () => void;
  onRemove?: () => void;
}

export function EditorPageSettings({
  page,
  pageIndex,
  pageCount,
  templateBackground,
  previewCtx,
  readonly = false,
  onKindChange,
  onBackgroundPatch,
  onSaveAsPageTemplate,
  onLoadPageTemplate,
  onRemove,
}: EditorPageSettingsProps) {
  const hasCustomBackground = pageHasCustomBackground(page);

  return (
    <div className="editor-page-settings">
      <p className="editor-page-settings-title">
        Page {pageIndex + 1}
        <span className="editor-page-settings-kind">{pageKindLabel(page.kind)}</span>
      </p>
      <BackgroundControls
        label="Arrière-plan"
        disabled={readonly}
        previewCtx={previewCtx}
        value={blockBackgroundValueFromPage(page, { background: templateBackground })}
        onChange={(value) => onBackgroundPatch(pagePatchFromBackgroundValue(value))}
        resetLabel="Par défaut"
        onReset={() => onBackgroundPatch(clearPageBackgroundPatch())}
        resetDisabled={!hasCustomBackground}
        hint={
          !hasCustomBackground
            ? "Utilise l'arrière-plan du modèle (réglages du document)."
            : undefined
        }
      />
      <IconToggleGroup
        label="Type de page"
        value={page.kind}
        onChange={onKindChange}
        options={PAGE_KIND_OPTIONS}
      />
      <p className="hint editor-page-settings-hint">
        {page.kind === 'dynamic'
          ? 'Cette page sera dupliquée pour chaque œuvre sélectionnée à la génération PDF.'
          : 'Cette page n\'apparaît qu\'une seule fois dans le PDF (couverture, sommaire…).'}
      </p>
      {!readonly && (onSaveAsPageTemplate || onLoadPageTemplate) && (
        <div className="editor-page-template-actions">
          {onLoadPageTemplate && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={onLoadPageTemplate}>
              Charger un modèle de page
            </button>
          )}
          {onSaveAsPageTemplate && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={onSaveAsPageTemplate}>
              Enregistrer cette page comme modèle
            </button>
          )}
        </div>
      )}
      {pageCount > 1 && onRemove && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>
          Supprimer cette page
        </button>
      )}
    </div>
  );
}
