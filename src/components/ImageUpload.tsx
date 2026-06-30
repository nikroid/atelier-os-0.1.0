import { useCallback, useState } from 'react';
import { MediaThumb } from './MediaThumb';
import type { MediaEntityType } from '../types/media';
import { deleteImageGroup, saveImageGroupFromFile } from '../utils/mediaStore';

interface ImageUploadProps {
  groupIds: string[];
  onChange: (groupIds: string[]) => void;
  entityType: MediaEntityType;
  entityId: string;
  max?: number;
}

export function ImageUpload({
  groupIds,
  onChange,
  entityType,
  entityId,
  max = 5,
}: ImageUploadProps) {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter((f) => f.type.startsWith('image/'));
      const remaining = max - groupIds.length;
      const toAdd = list.slice(0, remaining);
      if (!toAdd.length || !entityId) return;
      setProcessing(true);
      setError(null);
      try {
        const newIds: string[] = [];
        for (let i = 0; i < toAdd.length; i++) {
          const id = await saveImageGroupFromFile(toAdd[i], entityType, entityId, groupIds.length + i);
          newIds.push(id);
        }
        onChange([...groupIds, ...newIds]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors de l\'import');
      } finally {
        setProcessing(false);
      }
    },
    [groupIds, max, onChange, entityType, entityId],
  );

  const removeAt = async (index: number) => {
    const id = groupIds[index];
    onChange(groupIds.filter((_, j) => j !== index));
    if (id) await deleteImageGroup(id);
  };

  return (
    <div className="image-upload">
      <div
        className={`dropzone ${dragging ? 'dragging' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <p>{processing ? 'Traitement des images…' : 'Glisser-déposer des images ici'}</p>
        <label className="btn btn-secondary btn-sm">
          Parcourir
          <input
            type="file"
            accept="image/*"
            multiple
            hidden
            disabled={processing || groupIds.length >= max}
            onChange={(e) => e.target.files && void handleFiles(e.target.files)}
          />
        </label>
      </div>
      {error && <p className="hint error-hint">{error}</p>}
      {groupIds.length > 0 && (
        <div className="image-grid">
          {groupIds.map((id, i) => (
            <div key={id} className="image-thumb">
              <MediaThumb groupId={id} variant="thumb" />
              <button
                type="button"
                className="btn-icon remove"
                onClick={() => void removeAt(i)}
                aria-label="Supprimer"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
