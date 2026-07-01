import { useState } from 'react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EmptyState } from '../components/EmptyState';
import { ImageUpload } from '../components/ImageUpload';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { db, now, uid } from '../db/database';
import { useArtistMap, useArtists, useExhibitions, useWorks } from '../hooks/useDatabase';
import { usePersistedViewMode } from '../hooks/useViewMode';
import type { Exhibition } from '../types';
import { formatDate } from '../utils/helpers';
import {
  normalizeExhibitionArtists,
  resolveExhibitionArtistNames,
} from '../utils/templateFields';

const EXPO_VIEW_KEY = 'atelier-expo-view';

type ExpoForm = Omit<Exhibition, 'id' | 'createdAt' | 'updatedAt' | 'artisteIds'> & {
  artisteIds: string[];
};

const emptyExpo = (): ExpoForm => ({
  titre: '',
  lieu: '',
  date_debut: '',
  date_fin: '',
  texte_curatorial: '',
  artisteId: '',
  artisteIds: [],
  oeuvreIds: [],
  affiche: '',
});

function expoToForm(expo: Exhibition): ExpoForm {
  const { artisteIds, artisteId } = normalizeExhibitionArtists(expo);
  return {
    titre: expo.titre,
    lieu: expo.lieu,
    date_debut: expo.date_debut,
    date_fin: expo.date_fin,
    texte_curatorial: expo.texte_curatorial,
    artisteId,
    artisteIds,
    oeuvreIds: [...expo.oeuvreIds],
    affiche: expo.affiche ?? '',
  };
}

export function ExhibitionsPage() {
  const exhibitions = useExhibitions();
  const artists = useArtists();
  const works = useWorks();
  const artistMap = useArtistMap(artists);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exhibition | null>(null);
  const [form, setForm] = useState<ExpoForm>(emptyExpo());
  const [deleteTarget, setDeleteTarget] = useState<Exhibition | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode(EXPO_VIEW_KEY);

  const openCreate = () => {
    setEditing(null);
    const firstArtistId = artists?.[0]?.id ?? '';
    setForm({
      ...emptyExpo(),
      artisteId: firstArtistId,
      artisteIds: firstArtistId ? [firstArtistId] : [],
    });
    setModalOpen(true);
  };

  const openEdit = (expo: Exhibition) => {
    setEditing(expo);
    setForm(expoToForm(expo));
    setModalOpen(true);
  };

  const save = async () => {
    const ts = now();
    const artistsNorm = normalizeExhibitionArtists(form);
    const payload = { ...form, ...artistsNorm };
    if (editing) {
      await db.exhibitions.update(editing.id, { ...payload, updatedAt: ts });
    } else {
      await db.exhibitions.add({ id: uid('expo'), ...payload, createdAt: ts, updatedAt: ts });
    }
    setModalOpen(false);
  };

  const requestRemove = (expo: Exhibition) => {
    setDeleteTarget(expo);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    await db.exhibitions.delete(deleteTarget.id);
    setDeleteTarget(null);
  };

  const toggleArtist = (artistId: string) => {
    const selected = form.artisteIds.includes(artistId);
    if (selected) {
      const artisteIds = form.artisteIds.filter((id) => id !== artistId);
      const oeuvreIds = form.oeuvreIds.filter((workId) => {
        const work = works?.find((w) => w.id === workId);
        return work?.artisteId !== artistId;
      });
      setForm({
        ...form,
        artisteIds,
        artisteId: artisteIds[0] ?? '',
        oeuvreIds,
      });
      return;
    }
    const artisteIds = [...form.artisteIds, artistId];
    setForm({
      ...form,
      artisteIds,
      artisteId: artisteIds[0] ?? '',
    });
  };

  const toggleWork = (workId: string) => {
    const ids = form.oeuvreIds.includes(workId)
      ? form.oeuvreIds.filter((id) => id !== workId)
      : [...form.oeuvreIds, workId];
    setForm({ ...form, oeuvreIds: ids });
  };

  const selectedArtistSet = new Set(form.artisteIds);
  const artistWorks =
    works?.filter((w) => selectedArtistSet.has(w.artisteId)).sort((a, b) => a.titre.localeCompare(b.titre)) ?? [];

  const renderExpoPoster = (expo: Exhibition, className: string) => (
    <div className={className} aria-hidden={!expo.affiche}>
      {expo.affiche ? (
        <img src={expo.affiche} alt="" />
      ) : (
        <span className="expo-card-poster-placeholder">A</span>
      )}
    </div>
  );

  const renderExpoActions = (expo: Exhibition) => (
    <>
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(expo)}>
        Modifier
      </button>
      <button type="button" className="btn btn-danger btn-sm" onClick={() => requestRemove(expo)}>
        Supprimer
      </button>
    </>
  );

  return (
    <>
      <PageHeader
        title="Expositions"
        subtitle="Regrouper des œuvres pour générer catalogues et dossiers presse"
        action={
          <div className="page-header-actions">
            {exhibitions?.length ? (
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            ) : null}
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nouvelle exposition
            </button>
          </div>
        }
      />

      {!exhibitions?.length ? (
        <EmptyState
          message="Aucune exposition planifiée."
          action={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Créer une exposition
            </button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="expo-grid">
          {exhibitions.map((expo) => (
            <article key={expo.id} className="expo-grid-card">
              {renderExpoPoster(expo, 'expo-grid-card-poster')}
              <div className="expo-grid-card-body">
                <div className="expo-grid-card-text">
                  <h3>{expo.titre}</h3>
                  <p className="meta">{resolveExhibitionArtistNames(expo, artistMap)}</p>
                  <p className="meta">{expo.lieu}</p>
                  <p className="dates">
                    {formatDate(expo.date_debut)} — {formatDate(expo.date_fin)}
                  </p>
                  <p className="work-count">{expo.oeuvreIds.length} œuvre(s)</p>
                </div>
                <div className="card-actions">{renderExpoActions(expo)}</div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-table">
          {exhibitions.map((expo) => (
            <article key={expo.id} className="list-row expo-list-row">
              {renderExpoPoster(expo, 'expo-list-thumb')}
              <div className="list-content">
                <h3>{expo.titre}</h3>
                <p className="meta">{resolveExhibitionArtistNames(expo, artistMap)}</p>
                <p className="meta">{expo.lieu}</p>
                <p className="dates">
                  {formatDate(expo.date_debut)} — {formatDate(expo.date_fin)}
                </p>
                <p className="work-count">{expo.oeuvreIds.length} œuvre(s)</p>
              </div>
              <div className="list-actions">{renderExpoActions(expo)}</div>
            </article>
          ))}
        </div>
      )}

      <Modal open={modalOpen} title={editing ? 'Modifier l\'exposition' : 'Nouvelle exposition'} onClose={() => setModalOpen(false)} wide>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label>
            Titre *
            <input required value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
          </label>
          <label>
            Lieu
            <input value={form.lieu} onChange={(e) => setForm({ ...form, lieu: e.target.value })} />
          </label>
          <label>
            Affiche (format A)
            <span className="hint">Ratio portrait 1∶√2 (ex. A4). Glissez une image ou parcourez.</span>
            <div className="expo-affiche-upload">
              <ImageUpload
                images={form.affiche ? [form.affiche] : []}
                max={1}
                onChange={(imgs) => setForm({ ...form, affiche: imgs[0] ?? '' })}
              />
            </div>
          </label>
          <div className="form-row">
            <label>
              Date début
              <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} />
            </label>
            <label>
              Date fin
              <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} />
            </label>
          </div>
          <fieldset>
            <legend>Artiste(s)</legend>
            <div className="checkbox-list">
              {!artists?.length ? (
                <p className="hint">Aucun artiste enregistré.</p>
              ) : (
                artists.map((artist) => (
                  <label key={artist.id} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={form.artisteIds.includes(artist.id)}
                      onChange={() => toggleArtist(artist.id)}
                    />
                    {artist.nom}
                  </label>
                ))
              )}
            </div>
          </fieldset>
          <label>
            Texte curatorial / communiqué
            <textarea
              rows={4}
              value={form.texte_curatorial}
              onChange={(e) => setForm({ ...form, texte_curatorial: e.target.value })}
            />
          </label>
          {form.artisteIds.length > 0 && (
            <fieldset>
              <legend>Œuvres de l'exposition</legend>
              <div className="checkbox-list">
                {artistWorks.length === 0 ? (
                  <p className="hint">Aucune œuvre pour les artistes sélectionnés.</p>
                ) : (
                  artistWorks.map((work) => (
                    <label key={work.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.oeuvreIds.includes(work.id)}
                        onChange={() => toggleWork(work.id)}
                      />
                      {work.titre} ({work.annee})
                      <span className="meta"> — {artistMap.get(work.artisteId)?.nom ?? '—'}</span>
                    </label>
                  ))
                )}
              </div>
            </fieldset>
          )}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModalOpen(false)}>
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
        title="Supprimer l'exposition"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      >
        <p>
          Supprimer l'exposition <strong>{deleteTarget?.titre || 'sans titre'}</strong> ? Cette action est
          irréversible.
        </p>
      </ConfirmDeleteModal>
    </>
  );
}
