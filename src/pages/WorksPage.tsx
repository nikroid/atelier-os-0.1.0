import { useState } from 'react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EmptyState } from '../components/EmptyState';
import { ImageUpload } from '../components/ImageUpload';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { db, generateWorkRef, now, uid } from '../db/database';
import { useArtistMap, useArtists, useWorks } from '../hooks/useDatabase';
import { useEntityCrud } from '../hooks/useEntityCrud';
import { useSettings } from '../hooks/useSettings';
import { usePersistedViewMode } from '../hooks/useViewMode';
import { MODE_LABELS } from '../types/settings';
import type { Work, WorkStatus } from '../types';
import { WORK_STATUSES } from '../types';
import { formatPrice, formatWorkDimensions, parseWorkDimensions, emptyWorkDimensions, type WorkDimensionsInput } from '../utils/helpers';

const emptyWork = (): Omit<Work, 'id' | 'ref' | 'createdAt' | 'updatedAt'> => ({
  titre: '',
  artisteId: '',
  annee: new Date().getFullYear(),
  technique: '',
  dimensions: '',
  prix: null,
  description: '',
  images: [],
  statut: 'disponible',
  certificat: true,
});

const WORKS_VIEW_KEY = 'atelier-works-view';

export function WorksPage() {
  const works = useWorks();
  const artists = useArtists();
  const artistMap = useArtistMap(artists);
  const { isGallery, mode } = useSettings();
  const labels = MODE_LABELS[mode];
  const myArtistId = artists?.[0]?.id ?? '';
  const crud = useEntityCrud<Omit<Work, 'id' | 'ref' | 'createdAt' | 'updatedAt'>>();
  const [dims, setDims] = useState<WorkDimensionsInput>(emptyWorkDimensions());
  const [viewMode, setViewMode] = usePersistedViewMode(WORKS_VIEW_KEY);
  const [deleteTarget, setDeleteTarget] = useState<Work | null>(null);

  const openCreate = () => {
    crud.openCreate({ ...emptyWork(), artisteId: isGallery ? artists?.[0]?.id ?? '' : myArtistId });
    setDims(emptyWorkDimensions());
  };

  const openEdit = (work: Work) => {
    crud.openEdit(work.id, {
      titre: work.titre,
      artisteId: work.artisteId,
      annee: work.annee,
      technique: work.technique,
      dimensions: work.dimensions,
      prix: work.prix,
      description: work.description,
      images: work.images,
      statut: work.statut,
      certificat: work.certificat,
    });
    setDims(parseWorkDimensions(work.dimensions));
  };

  const save = async () => {
    const ts = now();
    const dimensions = formatWorkDimensions(dims);
    const payload = isGallery
      ? { ...crud.form, dimensions, artisteId: crud.form.artisteId }
      : { ...crud.form, dimensions, artisteId: myArtistId || crud.form.artisteId };
    if (crud.editingId) {
      await db.works.update(crud.editingId, { ...payload, updatedAt: ts });
    } else {
      const ref = await generateWorkRef(payload.annee);
      await db.works.add({
        id: uid('work'),
        ref,
        ...payload,
        createdAt: ts,
        updatedAt: ts,
      });
    }
    crud.closeModal();
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    await db.works.delete(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <PageHeader
        title={labels.works}
        subtitle="La source unique — tout document en découle"
        action={
          <div className="page-header-actions">
            {works?.length ? (
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            ) : null}
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nouvelle œuvre
            </button>
          </div>
        }
      />

      {!works?.length ? (
        <EmptyState
          message="Aucune œuvre enregistrée."
          action={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Créer la première œuvre
            </button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="data-grid">
          {works.map((work) => (
            <article key={work.id} className="work-card">
              <div className="work-card-image">
                {work.images[0] ? (
                  <img src={work.images[0]} alt={work.titre} />
                ) : (
                  <div className="placeholder-image" />
                )}
                <span className={`badge badge-${work.statut}`}>{work.statut}</span>
              </div>
              <div className="work-card-body">
                <span className="ref">{work.ref}</span>
                <h3>{work.titre}</h3>
                <p>
                  {!isGallery ? work.annee : `${artistMap.get(work.artisteId)?.nom ?? '—'} · ${work.annee}`}
                </p>
                <p className="meta">{work.technique} — {work.dimensions}</p>
                <p className="price">{formatPrice(work.prix)}</p>
                <div className="card-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(work)}>
                    Modifier
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(work)}>
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-table works-list">
          {works.map((work) => (
            <article key={work.id} className="list-row work-list-row">
              <div className="work-list-thumb">
                {work.images[0] ? (
                  <img src={work.images[0]} alt="" />
                ) : (
                  <div className="placeholder-image" />
                )}
              </div>
              <div className="list-content">
                <span className="ref">{work.ref}</span>
                <h3>{work.titre}</h3>
                <p className="meta">
                  {!isGallery ? work.annee : `${artistMap.get(work.artisteId)?.nom ?? '—'} · ${work.annee}`}
                  {work.technique && ` · ${work.technique}`}
                  {work.dimensions && ` · ${work.dimensions}`}
                </p>
              </div>
              <span className={`badge badge-${work.statut}`}>{work.statut}</span>
              <span className="work-list-price">{formatPrice(work.prix)}</span>
              <div className="list-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(work)}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(work)}>
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal open={crud.modalOpen} title={crud.editingId ? 'Modifier l\'œuvre' : 'Nouvelle œuvre'} onClose={crud.closeModal} wide>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="form-row">
            <label>
              Titre *
              <input
                required
                value={crud.form.titre}
                onChange={(e) => crud.setForm({ ...crud.form, titre: e.target.value })}
              />
            </label>
            {isGallery && (
              <label>
                Artiste *
                <select
                  required
                  value={crud.form.artisteId}
                  onChange={(e) => crud.setForm({ ...crud.form, artisteId: e.target.value })}
                >
                  <option value="">— Choisir —</option>
                  {artists?.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nom}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="form-row">
            <label>
              Année
              <input
                type="number"
                value={crud.form.annee}
                onChange={(e) => crud.setForm({ ...crud.form, annee: parseInt(e.target.value) || 0 })}
              />
            </label>
            <label>
              Statut
              <select
                value={crud.form.statut}
                onChange={(e) => crud.setForm({ ...crud.form, statut: e.target.value as WorkStatus })}
              >
                {WORK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Prix (€)
              <input
                type="number"
                value={crud.form.prix ?? ''}
                onChange={(e) =>
                  crud.setForm({ ...crud.form, prix: e.target.value ? parseFloat(e.target.value) : null })
                }
              />
            </label>
          </div>
          <label>
            Technique
            <input
              value={crud.form.technique}
              onChange={(e) => crud.setForm({ ...crud.form, technique: e.target.value })}
            />
          </label>
          <fieldset className="dimensions-fieldset">
            <legend>Dimensions</legend>
            <div className="dimensions-inputs">
              <label>
                Hauteur (cm)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={dims.height}
                  onChange={(e) => setDims({ ...dims, height: e.target.value })}
                />
              </label>
              <span className="dimensions-sep" aria-hidden>
                ×
              </span>
              <label>
                Largeur (cm)
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={dims.width}
                  onChange={(e) => setDims({ ...dims, width: e.target.value })}
                />
              </label>
              {dims.isVolume && (
                <>
                  <span className="dimensions-sep" aria-hidden>
                    ×
                  </span>
                  <label>
                    Profondeur (cm)
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={dims.depth}
                      onChange={(e) => setDims({ ...dims, depth: e.target.value })}
                    />
                  </label>
                </>
              )}
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm dimensions-mode-toggle"
              onClick={() =>
                setDims((d) => ({
                  ...d,
                  isVolume: !d.isVolume,
                  depth: !d.isVolume ? d.depth : '',
                }))
              }
            >
              {dims.isVolume ? '2 dimensions (H × L)' : 'Volume (H × L × P)'}
            </button>
          </fieldset>
          <label>
            Description
            <textarea
              rows={3}
              value={crud.form.description}
              onChange={(e) => crud.setForm({ ...crud.form, description: e.target.value })}
            />
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={crud.form.certificat}
              onChange={(e) => crud.setForm({ ...crud.form, certificat: e.target.checked })}
            />
            Certificat d'authenticité disponible
          </label>
          <fieldset>
            <legend>Images</legend>
            <ImageUpload images={crud.form.images} onChange={(images) => crud.setForm({ ...crud.form, images })} />
          </fieldset>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={crud.closeModal}>
              Annuler
            </button>
            <button type="submit" className="btn btn-primary">
              Enregistrer
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Supprimer l'œuvre"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      >
        <p>
          Supprimer l'œuvre <strong>{deleteTarget?.titre || 'sans titre'}</strong> ? Cette action est irréversible.
        </p>
      </ConfirmDeleteModal>
    </>
  );
}
