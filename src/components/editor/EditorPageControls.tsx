import type { DocTemplate, DocTemplatePage, PageKind } from '../../types/templates';
import { pageKindLabel } from '../../utils/templatePages';
import { getPageBackgroundValues } from '../../utils/pageBackground';
import { IconToggleGroup } from './IconToggleGroup';
import { BackgroundControls } from './BackgroundControls';

const PAGE_KIND_OPTIONS = [
  { value: 'static' as const, label: 'Unique', title: 'Page unique (une fois dans le PDF)' },
  { value: 'dynamic' as const, label: 'Dynamique', title: 'Page dynamique (répétée par œuvre sélectionnée)' },
];

interface EditorPageSettingsProps {
  page: DocTemplatePage;
  pageIndex: number;
  pageCount: number;
  template: DocTemplate;
  templateId: string;
  onPatchTemplate: (patch: Partial<DocTemplate>) => void;
  onKindChange: (kind: PageKind) => void;
  onRemove?: () => void;
}

export function EditorPageSettings({
  page,
  pageIndex,
  pageCount,
  template,
  templateId,
  onPatchTemplate,
  onKindChange,
  onRemove,
}: EditorPageSettingsProps) {
  return (
    <div className="editor-page-settings">
      <p className="editor-page-settings-title">
        Page {pageIndex + 1}
        <span className="editor-page-settings-kind">{pageKindLabel(page.kind)}</span>
      </p>

      <BackgroundControls
        title="Arrière-plan de la page"
        templateId={templateId}
        values={getPageBackgroundValues(template)}
        defaultColor="#f5f2ed"
        onChange={(values) =>
          onPatchTemplate({
            pageBgType: values.bgType,
            background: values.bgColor,
            pageBgImageGroupId: values.imageGroupId,
            pageBgImageFit: values.imageFit,
          })
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
          : "Cette page n'apparaît qu'une seule fois dans le PDF (couverture, sommaire…)."}
      </p>
      {pageCount > 1 && onRemove && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={onRemove}>
          Supprimer cette page
        </button>
      )}
    </div>
  );
}
