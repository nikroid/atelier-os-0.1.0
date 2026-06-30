import { ImageUpload } from './ImageUpload';
import type { Artist } from '../types';

export type ArtistFormData = Omit<Artist, 'id' | 'createdAt' | 'updatedAt'>;

interface ArtistFormProps {
  form: ArtistFormData;
  artistId: string;
  onChange: (form: ArtistFormData) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
}

export function ArtistForm({
  form,
  artistId,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Enregistrer',
}: ArtistFormProps) {
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <label>
        Nom *
        <input required value={form.nom} onChange={(e) => onChange({ ...form, nom: e.target.value })} />
      </label>
      <label>
        Email
        <input type="email" value={form.email} onChange={(e) => onChange({ ...form, email: e.target.value })} />
      </label>
      <div className="form-row">
        <label>
          Site web
          <input value={form.site} onChange={(e) => onChange({ ...form, site: e.target.value })} />
        </label>
        <label>
          Instagram
          <input value={form.instagram} onChange={(e) => onChange({ ...form, instagram: e.target.value })} />
        </label>
      </div>
      <label>
        Bio (FR)
        <textarea rows={4} value={form.bio_fr} onChange={(e) => onChange({ ...form, bio_fr: e.target.value })} />
      </label>
      <label>
        Bio (EN)
        <textarea rows={4} value={form.bio_en} onChange={(e) => onChange({ ...form, bio_en: e.target.value })} />
      </label>
      <fieldset>
        <legend>Photo</legend>
        <ImageUpload
          groupIds={form.photoId ? [form.photoId] : []}
          onChange={(ids) => onChange({ ...form, photoId: ids[0] ?? null })}
          entityType="artist"
          entityId={artistId}
          max={1}
        />
      </fieldset>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

export const emptyArtistForm = (): ArtistFormData => ({
  nom: '',
  bio_fr: '',
  bio_en: '',
  site: '',
  instagram: '',
  email: '',
  photoId: null,
});
