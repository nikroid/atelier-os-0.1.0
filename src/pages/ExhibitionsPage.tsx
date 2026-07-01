import { useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { ImageUpload } from '../components/ImageUpload';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { db, now, uid } from '../db/database';
import { useArtistMap, useArtists, useExhibitions, useWorks } from '../hooks/useDatabase';
import type { Exhibition } from '../types';
import { formatDate } from '../utils/helpers';

const emptyExpo = (): Omit<Exhibition, 'id' | 'createdAt' | 'updatedAt'> => ({
  titre: '',
  lieu: '',
  date_debut: '',
  date_fin: '',
  texte_curatorial: '',
  artisteId: '',
  oeuvreIds: [],
  affiche: '',
});

export function ExhibitionsPage() {
  const exhibitions = useExhibitions();
  const artists = useArtists();
  const works = useWorks();
  const artistMap = useArtistMap(artists);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Exhibition | null>(null);
  const [form, setForm] = useState(emptyExpo());

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyExpo(), artisteId: artists?.[0]?.id ?? '' });
    setModalOpen(true);
  };

  const openEdit = (expo: Exhibition) => {
    setEditing(expo);
    setForm({
      titre: expo.titre,
      lieu: expo.lieu,
      date_debut: expo.date_debut,
      date_fin: expo.date_fin,
      texte_curatorial: expo.texte_curatorial,
      artisteId: expo.artisteId,
      oeuvreIds: [...expo.oeuvreIds],
      affiche: expo.affiche ?? '',
    });
    setModalOpen(true);
  };

  const save = async () => {
    const ts = now();
    if (editing) {
      await db.exhibitions.update(editing.id, { ...form, updatedAt: ts });
    } else {
      await db.exhibitions.add({ id: uid('expo'), ...form, createdAt: ts, updatedAt: ts });
    }
    setModalOpen(false);
  };

  const remove = async (id: string) => {
    if (confirm('Supprimer cette exposition ?')) await db.exhibitions.delete(id);
  };

  const toggleWork = (workId: string) => {
    const ids = form.oeuvreIds.includes(workId)
      ? form.oeuvreIds.filter((id) => id !== workId)
      : [...form.oeuvreIds, workId];
    setForm({ ...form, oeuvreIds: ids });
  };

  const artistWorks = works?.filter((w) => w.artisteId === form.artisteId) ?? [];

  return (
    <>
      <PageHeader
        title="Expositions"
        subtitle="Regrouper des œuvres pour générer catalogues et dossiers presse"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nouvelle exposition
          </button>
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
      ) : (
        <div className="expo-list">
          {exhibitions.map((expo) => (
            <article key={expo.id} className="expo-card">
              <div className="expo-card-poster" aria-hidden={!expo.affiche}>
                {expo.affiche ? (
                  <img src={expo.affiche} alt="" />
                ) : (
                  <span className="expo-card-poster-placeholder">A</span>
                )}
              </div>
              <div className="expo-card-body">
                <h3>{expo.titre}</h3>
                <p className="meta">{artistMap.get(expo.artisteId)?.nom ?? '—'}</p>
                <p className="meta">{expo.lieu}</p>
                <p className="dates">
                  {formatDate(expo.date_debut)} — {formatDate(expo.date_fin)}
                </p>
                <p className="work-count">{expo.oeuvreIds.length} œuvre(s)</p>
              </div>
              <div className="card-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(expo)}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(expo.id)}>
                  Supprimer
                </button>
              </div>
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
          <label>
            Artiste
            <select
              value={form.artisteId}
              onChange={(e) => setForm({ ...form, artisteId: e.target.value, oeuvreIds: [] })}
            >
              <option value="">— Choisir —</option>
              {artists?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </label>
          <label>
            Texte curatorial / communiqué
            <textarea
              rows={4}
              value={form.texte_curatorial}
              onChange={(e) => setForm({ ...form, texte_curatorial: e.target.value })}
            />
          </label>
          {form.artisteId && (
            <fieldset>
              <legend>Œuvres de l'exposition</legend>
              <div className="checkbox-list">
                {artistWorks.length === 0 ? (
                  <p className="hint">Aucune œuvre pour cet artiste.</p>
                ) : (
                  artistWorks.map((work) => (
                    <label key={work.id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={form.oeuvreIds.includes(work.id)}
                        onChange={() => toggleWork(work.id)}
                      />
                      {work.titre} ({work.annee})
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
    </>
  );
}
