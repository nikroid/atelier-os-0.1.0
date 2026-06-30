import { useEffect, useState } from 'react';
import { ArtistForm, emptyArtistForm } from '../components/ArtistForm';
import { EmptyState } from '../components/EmptyState';
import { MediaThumb } from '../components/MediaThumb';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { db, now, uid } from '../db/database';
import { useSettings } from '../hooks/useSettings';
import { useArtists } from '../hooks/useDatabase';
import { MODE_LABELS } from '../types/settings';
import type { Artist } from '../types';
import { detachArtistPhoto } from '../utils/mediaMigration';

function artistToForm(artist: Artist) {
  return {
    nom: artist.nom,
    bio_fr: artist.bio_fr,
    bio_en: artist.bio_en,
    site: artist.site,
    instagram: artist.instagram,
    email: artist.email,
    photoId: artist.photoId,
  };
}

function ArtistProfilePage() {
  const artists = useArtists();
  const profile = artists?.[0] ?? null;
  const [form, setForm] = useState(emptyArtistForm);
  const [saved, setSaved] = useState(true);
  const [artistId, setArtistId] = useState(() => profile?.id ?? uid('artist'));

  useEffect(() => {
    if (profile) {
      setForm(artistToForm(profile));
      setArtistId(profile.id);
    } else {
      setForm(emptyArtistForm());
      setArtistId(uid('artist'));
    }
    setSaved(true);
  }, [profile?.id, profile?.updatedAt]);

  const save = async () => {
    const ts = now();
    if (profile) {
      await db.artists.update(profile.id, { ...form, updatedAt: ts });
    } else {
      await db.artists.add({ id: artistId, ...form, createdAt: ts, updatedAt: ts });
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
          artistId={artistId}
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
  const [draftArtistId, setDraftArtistId] = useState<string | null>(null);

  const openCreate = () => {
    setEditing(null);
    setDraftArtistId(uid('artist'));
    setForm(emptyArtistForm());
    setModalOpen(true);
  };

  const openEdit = (artist: Artist) => {
    setEditing(artist);
    setDraftArtistId(artist.id);
    setForm(artistToForm(artist));
    setModalOpen(true);
  };

  const save = async () => {
    const ts = now();
    if (editing) {
      await db.artists.update(editing.id, { ...form, updatedAt: ts });
    } else {
      const id = draftArtistId ?? uid('artist');
      await db.artists.add({ id, ...form, createdAt: ts, updatedAt: ts });
    }
    setDraftArtistId(null);
    setModalOpen(false);
  };

  const remove = async (id: string) => {
    if (!confirm('Supprimer cet artiste ?')) return;
    const artist = await db.artists.get(id);
    if (artist?.photoId) await detachArtistPhoto(artist.photoId);
    await db.artists.delete(id);
  };

  return (
    <>
      <PageHeader
        title="Artistes"
        subtitle="Biographies et identité visuelle"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nouvel artiste
          </button>
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
      ) : (
        <div className="list-table">
          {artists.map((artist) => (
            <div key={artist.id} className="list-row">
              <div className="list-avatar">
                {artist.photoId ? (
                  <MediaThumb groupId={artist.photoId} alt="" />
                ) : (
                  <span>{artist.nom[0]}</span>
                )}
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
                <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(artist.id)}>
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
          artistId={draftArtistId ?? editing?.id ?? ''}
          onChange={setForm}
          onSubmit={save}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>
    </>
  );
}

export function ArtistsPage() {
  const { isGallery } = useSettings();
  return isGallery ? <ArtistsGalleryPage /> : <ArtistProfilePage />;
}
