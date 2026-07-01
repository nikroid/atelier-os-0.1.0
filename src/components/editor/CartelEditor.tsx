import type { CartelLayoutConfig, DocBlock, DocTemplate } from '../../types/templates';
import { CARTEL_PLATE_MARGIN_DEFAULT, getCartelPlateGeometry, resolveCartelLayout } from '../../utils/cartelLayout';
import type { TemplateContext } from '../../utils/templateFields';
import { BlockRenderer } from './BlockRenderer';
import { pageContentCssVars } from '../../utils/containerDimensions';
import { IconToggleGroup } from './IconToggleGroup';
import { PREVIEW_SCALE } from './EditorMiniPreview';

const BOOL_OPTIONS = [
  { value: 'on' as const, label: 'Oui', title: 'Activé' },
  { value: 'off' as const, label: 'Non', title: 'Désactivé' },
];

interface CartelPageSettingsFieldsProps {
  draft: DocTemplate;
  readonly: boolean;
  onPatch: (updater: (t: DocTemplate) => DocTemplate) => void;
}

export function patchCartelLayout(
  draft: DocTemplate,
  patch: Partial<CartelLayoutConfig>,
): DocTemplate {
  const cartelLayout = { ...resolveCartelLayout(draft), ...patch };
  return {
    ...draft,
    cartelLayout,
    format: 'cartel_cilas',
    formatRef: draft.formatRef === 'free' ? 'free' : 'cartel_cilas',
  };
}

export function cartelPlateSummary(template: DocTemplate): string {
  const layout = resolveCartelLayout(template);
  const geo = getCartelPlateGeometry(layout);
  return `${layout.widthMm}×${layout.heightMm} mm · ${geo.cols}×${geo.rows} planche`;
}

function PlateMarginField({
  value,
  disabled,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <label className="cartel-plate-margin-field">
      <span className="editor-compact-label">Marge planche (mm)</span>
      <div className="cartel-mm-input">
        <input
          type="number"
          min={0}
          max={40}
          step={1}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(Math.max(0, parseFloat(e.target.value) || 0))}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          disabled={disabled || value === CARTEL_PLATE_MARGIN_DEFAULT}
          title={`Réinitialiser à ${CARTEL_PLATE_MARGIN_DEFAULT} mm`}
          onClick={() => onChange(CARTEL_PLATE_MARGIN_DEFAULT)}
        >
          {CARTEL_PLATE_MARGIN_DEFAULT}
        </button>
      </div>
      <span className="hint cartel-plate-margin-hint">
        Zone non imprimable autour de la feuille A4 (impression classique).
      </span>
    </label>
  );
}

export function CartelPageSettingsFields({ draft, readonly, onPatch }: CartelPageSettingsFieldsProps) {
  const layout = resolveCartelLayout(draft);
  const geo = getCartelPlateGeometry(layout);

  const update = (patch: Partial<CartelLayoutConfig>) => {
    if (readonly) return;
    onPatch((t) => patchCartelLayout(t, patch));
  };

  return (
    <div className="cartel-page-settings-fields">
      <p className="hint cartel-plate-hint">
        {geo.cols} × {geo.rows} = {geo.perPage} cartel(s) par feuille A4 · visible dans l&apos;onglet
        Aperçu.
      </p>

      <PlateMarginField
        value={layout.plateMarginMm}
        disabled={readonly}
        onChange={(plateMarginMm) => update({ plateMarginMm })}
      />

      <IconToggleGroup
        compact
        label="Contours planche (PDF)"
        value={layout.showBorders ? 'on' : 'off'}
        options={BOOL_OPTIONS}
        onChange={(v) => update({ showBorders: v === 'on' })}
      />
    </div>
  );
}

interface CartelPlateMiniPreviewProps {
  template: DocTemplate;
  root: DocBlock;
  previewCtx: TemplateContext;
  cartelPageW: number;
  cartelPageH: number;
  marginPx: number;
  selected?: boolean;
}

export function CartelPlateMiniPreview({
  template,
  root,
  previewCtx,
  cartelPageW,
  cartelPageH,
  marginPx,
  selected,
}: CartelPlateMiniPreviewProps) {
  const layout = resolveCartelLayout(template);
  const geo = getCartelPlateGeometry(layout);
  const cells: { col: number; row: number }[] = [];
  for (let row = 0; row < geo.rows; row++) {
    for (let col = 0; col < geo.cols; col++) {
      cells.push({ col, row });
    }
  }

  const sheetWmm = geo.pageWmm;
  const sheetHmm = geo.pageHmm;
  const scaledW = sheetWmm * PREVIEW_SCALE;
  const scaledH = sheetHmm * PREVIEW_SCALE;

  return (
    <div
      className={`editor-preview-mini-frame cartel-plate-mini-frame${selected ? ' is-selected' : ''}`}
      style={{ width: `${scaledW}mm`, height: `${scaledH}mm` }}
      title={`Planche A4 · ${geo.cols}×${geo.rows} · marge ${layout.plateMarginMm} mm`}
    >
      <div
        className="cartel-plate-preview-scaler"
        style={{
          width: `${sheetWmm}mm`,
          height: `${sheetHmm}mm`,
          transform: `scale(${PREVIEW_SCALE})`,
          transformOrigin: 'top left',
        }}
      >
        <div className="cartel-plate-sheet">
          <div className="cartel-plate-crop-marks" aria-hidden />
          {cells.map(({ col, row }) => (
            <div
              key={`${col}-${row}`}
              className={`cartel-plate-cell${layout.showBorders ? ' show-border' : ''}`}
              style={{
                left: `${geo.offX + col * layout.widthMm}mm`,
                top: `${geo.offY + row * layout.heightMm}mm`,
                width: `${layout.widthMm}mm`,
                height: `${layout.heightMm}mm`,
              }}
            >
              <div
                className="cartel-plate-cell-content"
                style={{
                  padding: marginPx,
                  boxSizing: 'border-box',
                  width: '100%',
                  height: '100%',
                  overflow: 'hidden',
                  background: template.background ?? '#fff',
                  ...pageContentCssVars(cartelPageW - marginPx * 2, cartelPageH - marginPx * 2),
                }}
              >
                <BlockRenderer block={root} ctx={previewCtx} mode="preview" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
