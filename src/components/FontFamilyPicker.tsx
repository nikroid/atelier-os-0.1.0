import { useRef } from 'react';
import type { FontFamily } from '../types/templates';
import { useFontsOptional } from '../hooks/useFonts';
import { isGoogleFontRef } from '../utils/fontRegistry';

const GROUP_LABELS = {
  builtin: 'Classiques',
  google: 'Google Fonts',
  custom: 'Mes polices',
} as const;

interface FontFamilyPickerProps {
  value: FontFamily | undefined;
  onChange: (family: FontFamily) => void;
  showImport?: boolean;
}

export function FontFamilyPicker({ value, onChange, showImport = true }: FontFamilyPickerProps) {
  const { fontOptions, importFont, ensureLoaded } = useFontsOptional();
  const fileRef = useRef<HTMLInputElement>(null);
  const current = value ?? 'serif';

  const grouped = {
    builtin: fontOptions.filter((o) => o.group === 'builtin'),
    google: fontOptions.filter((o) => o.group === 'google'),
    custom: fontOptions.filter((o) => o.group === 'custom'),
  };

  const handleChange = async (next: string) => {
    if (isGoogleFontRef(next)) {
      await ensureLoaded([next]);
    }
    onChange(next as FontFamily);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const font = await importFont(file);
      onChange(`custom:${font.id}` as FontFamily);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Import impossible');
    }
    e.target.value = '';
  };

  return (
    <div className="font-family-picker">
      <label>
        Police
        <select value={current} onChange={(e) => void handleChange(e.target.value)}>
          {(Object.keys(grouped) as Array<keyof typeof grouped>).map((group) => {
            const options = grouped[group];
            if (options.length === 0) return null;
            return (
              <optgroup key={group} label={GROUP_LABELS[group]}>
                {options.map((o) => (
                  <option key={o.value} value={o.value} style={{ fontFamily: o.previewCss }}>
                    {o.label}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </label>
      {showImport && (
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm font-import-btn"
            onClick={() => fileRef.current?.click()}
          >
            Importer une police…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            hidden
            onChange={(e) => void handleImport(e)}
          />
        </>
      )}
    </div>
  );
}
