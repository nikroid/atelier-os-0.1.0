import { useEffect, useState } from 'react';
import { ArtistForm, emptyArtistForm } from '../components/ArtistForm';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { ViewModeToggle } from '../components/ViewModeToggle';
import { db, now, uid } from '../db/database';
import { useSettings } from '../hooks/useSettings';
import { useArtists } from '../hooks/useDatabase';
import { usePersistedViewMode } from '../hooks/useViewMode';
import { MODE_LABELS } from '../types/settings';
import type { Artist } from '../types';

const ARTISTS_VIEW_KEY = 'atelier-artists-view';

function artistToForm(artist: Artist) {
  return {
    nom: artist.nom,
    bio_fr: artist.bio_fr,
    bio_en: artist.bio_en,
    site: artist.site,
    instagram: artist.instagram,
    email: artist.email,
    photo: artist.photo,
  };
}

function ArtistProfilePage() {
  const artists = useArtists();
  const profile = artists?.[0] ?? null;
  const [form, setForm] = useState(emptyArtistForm);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    if (profile) setForm(artistToForm(profile));
    else setForm(emptyArtistForm());
    setSaved(true);
  }, [profile?.id, profile?.updatedAt]);

  const save = async () => {
    const ts = now();
    if (profile) {
      await db.artists.update(profile.id, { ...form, updatedAt: ts });
    } else {
      await db.artists.add({ id: uid('artist'), ...form, createdAt: ts, updatedAt: ts });
    }
    setSaved(true);
  };

  const handleChange = (next: typeof form) => {
    setForm(next);
    setSaved(false);
  };

  return (
    <>
      <PageHeader
        title={MODE_LABELS.artist.artists}
        subtitle="Votre biographie et identité visuelle — utilisées sur cartels, fiches et certificats"
        action={
          !saved ? (
            <span className="unsaved-hint">Modifications non enregistrées</span>
          ) : profile ? (
            <span className="saved-hint">Profil enregistré</span>
          ) : undefined
        }
      />

      <section className="card-section artist-profile">
        {!profile && !form.nom ? (
          <p className="hint profile-intro">
            Complétez votre profil pour alimenter automatiquement les champs « artiste » dans vos documents.
          </p>
        ) : null}
        <ArtistForm
          form={form}
          onChange={handleChange}
          onSubmit={save}
          submitLabel={profile ? 'Enregistrer le profil' : 'Créer mon profil'}
        />
      </section>
    </>
  );
}

function ArtistsGalleryPage() {
  const artists = useArtists();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Artist | null>(null);
  const [form, setForm] = useState(emptyArtistForm);
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);
  const [viewMode, setViewMode] = usePersistedViewMode(ARTISTS_VIEW_KEY);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyArtistForm());
    setModalOpen(true);
  };

  const openEdit = (artist: Artist) => {
    setEditing(artist);
    setForm(artistToForm(artist));
    setModalOpen(true);
  };

  const save = async () => {
    const ts = now();
    if (editing) {
      await db.artists.update(editing.id, { ...form, updatedAt: ts });
    } else {
      await db.artists.add({ id: uid('artist'), ...form, createdAt: ts, updatedAt: ts });
    }
    setModalOpen(false);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    await db.artists.delete(deleteTarget.id);
    setDeleteTarget(null);
  };

  return (
    <>
      <PageHeader
        title="Artistes"
        subtitle="Biographies et identité visuelle"
        action={
          <div className="page-header-actions">
            {artists?.length ? (
              <ViewModeToggle value={viewMode} onChange={setViewMode} />
            ) : null}
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              + Nouvel artiste
            </button>
          </div>
        }
      />

      {!artists?.length ? (
        <EmptyState
          message="Aucun artiste enregistré."
          action={
            <button type="button" className="btn btn-primary" onClick={openCreate}>
              Ajouter un artiste
            </button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="artist-grid">
          {artists.map((artist) => (
            <article key={artist.id} className="artist-card">
              <div className="artist-card-photo">
                {artist.photo ? <img src={artist.photo} alt="" /> : <span>{artist.nom[0]}</span>}
              </div>
              <div className="artist-card-body">
                <h3>{artist.nom}</h3>
                <p className="meta">{artist.email || artist.site || '—'}</p>
                {artist.bio_fr && <p className="bio-preview">{artist.bio_fr.slice(0, 120)}…</p>}
                <div className="card-actions">
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(artist)}>
                    Modifier
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(artist)}>
                    Supprimer
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="list-table">
          {artists.map((artist) => (
            <div key={artist.id} className="list-row">
              <div className="list-avatar">
                {artist.photo ? <img src={artist.photo} alt="" /> : <span>{artist.nom[0]}</span>}
              </div>
              <div className="list-content">
                <h3>{artist.nom}</h3>
                <p className="meta">{artist.email || artist.site || '—'}</p>
                {artist.bio_fr && <p className="bio-preview">{artist.bio_fr.slice(0, 120)}…</p>}
              </div>
              <div className="list-actions">
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(artist)}>
                  Modifier
                </button>
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(artist)}>
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? "Modifier l'artiste" : 'Nouvel artiste'}
        onClose={() => setModalOpen(false)}
        wide
      >
        <ArtistForm
          form={form}
          onChange={setForm}
          onSubmit={save}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDeleteModal
        open={deleteTarget !== null}
        title="Supprimer l'artiste"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      >
        <p>
          Supprimer l'artiste <strong>{deleteTarget?.nom || 'sans nom'}</strong> ? Cette action est irréversible.
        </p>
      </ConfirmDeleteModal>
    </>
  );
}

export function ArtistsPage() {
  const { isGallery } = useSettings();
  return isGallery ? <ArtistsGalleryPage /> : <ArtistProfilePage />;
}
