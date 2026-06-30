import { useState } from 'react';
import type { BlockBackgroundImageFit, BlockBackgroundType } from '../../types/templates';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { deleteImageGroup, saveImageGroupFromFile } from '../../utils/mediaStore';

export interface BackgroundControlValues {
  bgType: BlockBackgroundType;
  bgColor: string;
  imageGroupId?: string;
  imageFit?: BlockBackgroundImageFit;
}

interface BackgroundControlsProps {
  title?: string;
  values: BackgroundControlValues;
  templateId: string;
  defaultColor?: string;
  onChange: (values: BackgroundControlValues) => void;
}

export function BackgroundControls({
  title = 'Arrière-plan',
  values,
  templateId,
  defaultColor = '#f5f2ed',
  onChange,
}: BackgroundControlsProps) {
  const previewUrl = useMediaUrl(
    values.bgType === 'image' ? values.imageGroupId : null,
    'thumb',
  );
  const [uploading, setUploading] = useState(false);

  const setBgType = (type: BlockBackgroundType) => {
    if (type === 'none') {
      onChange({ ...values, bgType: 'none', imageGroupId: undefined });
      return;
    }
    if (type === 'color') {
      onChange({
        ...values,
        bgType: 'color',
        bgColor: values.bgColor || defaultColor,
        imageGroupId: undefined,
      });
      return;
    }
    onChange({ ...values, bgType: 'image' });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !templateId) return;
    setUploading(true);
    try {
      const oldId = values.imageGroupId;
      const groupId = await saveImageGroupFromFile(file, 'template', templateId);
      onChange({ ...values, bgType: 'image', imageGroupId: groupId });
      if (oldId && oldId !== groupId) void deleteImageGroup(oldId);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = () => {
    const oldId = values.imageGroupId;
    onChange({ ...values, bgType: 'none', imageGroupId: undefined });
    if (oldId) void deleteImageGroup(oldId);
  };

  return (
    <details className="block-spacing-details" open>
      <summary>{title}</summary>
      <div className="bg-type-row">
        {(['none', 'color', 'image'] as BlockBackgroundType[]).map((t) => (
          <button
            key={t}
            type="button"
            className={`btn btn-sm ${values.bgType === t ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setBgType(t)}
          >
            {t === 'none' ? 'Aucun' : t === 'color' ? 'Couleur' : 'Image'}
          </button>
        ))}
      </div>
      {values.bgType === 'color' && (
        <label>
          Couleur
          <input
            type="color"
            value={values.bgColor || defaultColor}
            onChange={(e) => onChange({ ...values, bgType: 'color', bgColor: e.target.value })}
          />
        </label>
      )}
      {values.bgType === 'image' && (
        <>
          <label className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', marginTop: '0.5rem' }}>
            {uploading ? 'Import…' : values.imageGroupId ? "Remplacer l'image" : 'Choisir une image'}
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} disabled={uploading} />
          </label>
          {previewUrl && (
            <div className="block-bg-preview">
              <img src={previewUrl} alt="" />
            </div>
          )}
          <label>
            Ajustement
            <select
              value={values.imageFit ?? 'cover'}
              onChange={(e) =>
                onChange({ ...values, imageFit: e.target.value as BlockBackgroundImageFit })
              }
            >
              <option value="cover">Remplir (cover)</option>
              <option value="contain">Contenir (contain)</option>
            </select>
          </label>
          {values.imageGroupId && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={removeImage}>
              Retirer l&apos;image
            </button>
          )}
        </>
      )}
    </details>
  );
}
