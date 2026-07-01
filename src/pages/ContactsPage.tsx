import { useMemo, useState } from 'react';
import { ConfirmDeleteModal } from '../components/ConfirmDeleteModal';
import { ContactGroupMailModal } from '../components/ContactGroupMailModal';
import { EmptyState } from '../components/EmptyState';
import { Modal } from '../components/Modal';
import { PageHeader } from '../components/PageHeader';
import { SentMailDetailModal } from '../components/SentMailDetailModal';
import { SentMailHistoryList } from '../components/SentMailHistoryList';
import { db, now, uid } from '../db/database';
import { useContacts } from '../hooks/useDatabase';
import { useSentMails } from '../hooks/useSentMails';
import type { Contact, ContactCategory } from '../types';
import type { SentMailLog } from '../types/sentMails';
import { CONTACT_CATEGORIES } from '../types';
import { contactFullName } from '../utils/helpers';

type ContactsTab = 'contacts' | 'history';

const emptyContact = (): Omit<Contact, 'id' | 'createdAt' | 'updatedAt'> => ({
  nom: '',
  prenom: '',
  categorie: 'journaliste',
  email: '',
  telephone: '',
  organisation: '',
  notes: '',
});

export function ContactsPage() {
  const contacts = useContacts();
  const sentMails = useSentMails();
  const [activeTab, setActiveTab] = useState<ContactsTab>('contacts');
  const [historyContactFilter, setHistoryContactFilter] = useState<string | null>(null);
  const [selectedMailLog, setSelectedMailLog] = useState<SentMailLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);
  const [mailRecipients, setMailRecipients] = useState<Contact[]>([]);
  const [mailModalTitle, setMailModalTitle] = useState('Envoyer un mail groupé');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(emptyContact());
  const [filter, setFilter] = useState<ContactCategory | 'all'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Contact | null>(null);

  const filtered =
    contacts?.filter((c) => filter === 'all' || c.categorie === filter) ?? [];

  const selectableContacts = useMemo(
    () => filtered.filter((c) => c.email.trim()),
    [filtered],
  );

  const selectedWithEmail = useMemo(
    () => selectableContacts.filter((c) => selected.has(c.id)),
    [selectableContacts, selected],
  );

  const allSelectableSelected =
    selectableContacts.length > 0 &&
    selectableContacts.every((c) => selected.has(c.id));

  const openCreate = () => {
    setEditing(null);
    setForm(emptyContact());
    setModalOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditing(contact);
    setForm({
      nom: contact.nom,
      prenom: contact.prenom,
      categorie: contact.categorie,
      email: contact.email,
      telephone: contact.telephone,
      organisation: contact.organisation,
      notes: contact.notes,
    });
    setModalOpen(true);
  };

  const save = async () => {
    const ts = now();
    if (editing) {
      await db.contacts.update(editing.id, { ...form, updatedAt: ts });
    } else {
      await db.contacts.add({ id: uid('contact'), ...form, createdAt: ts, updatedAt: ts });
    }
    setModalOpen(false);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    await db.contacts.delete(id);
    setDeleteTarget(null);
    setSelected((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    const contact = filtered.find((c) => c.id === id);
    if (!contact?.email.trim()) return;

    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableContacts.map((c) => c.id)));
  };

  const openMailModal = () => {
    if (!selectedWithEmail.length) {
      alert('Sélectionnez au moins un contact avec une adresse email.');
      return;
    }
    setMailRecipients(selectedWithEmail);
    setMailModalTitle('Envoyer un mail groupé');
    setMailModalOpen(true);
  };

  const openSingleMail = (contact: Contact) => {
    setMailRecipients([contact]);
    setMailModalTitle(`Email — ${contactFullName(contact)}`);
    setMailModalOpen(true);
  };

  const openContactHistory = (contact: Contact) => {
    setHistoryContactFilter(contact.id);
    setActiveTab('history');
  };

  return (
    <>
      <PageHeader
        title="Contacts"
        subtitle="Journalistes, galeries, collectionneurs"
        action={
          <button type="button" className="btn btn-primary" onClick={openCreate}>
            + Nouveau contact
          </button>
        }
      />

      <div className="contacts-page-tabs">
        <div className="page-tabs" role="tablist" aria-label="Sections contacts">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'contacts'}
            className={activeTab === 'contacts' ? 'active' : ''}
            onClick={() => setActiveTab('contacts')}
          >
            Contacts
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'history'}
            className={activeTab === 'history' ? 'active' : ''}
            onClick={() => {
              setActiveTab('history');
              setHistoryContactFilter(null);
            }}
          >
            Historique
            {sentMails && sentMails.length > 0 && (
              <span className="contacts-tab-count">{sentMails.length}</span>
            )}
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <SentMailHistoryList
          logs={sentMails ?? []}
          contacts={contacts}
          contactFilterId={historyContactFilter}
          onSelect={setSelectedMailLog}
          onClearFilter={() => setHistoryContactFilter(null)}
        />
      ) : (
        <>
      <div className="toolbar">
        <div className="filter-pills">
          <button
            type="button"
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            Tous
          </button>
          {CONTACT_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={filter === c.value ? 'active' : ''}
              onClick={() => setFilter(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {selectableContacts.length > 0 && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSelectAll}>
            {allSelectableSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
          </button>
        )}
        {selectedWithEmail.length > 0 && (
          <button type="button" className="btn btn-secondary" onClick={openMailModal}>
            Envoyer un mail ({selectedWithEmail.length})
          </button>
        )}
      </div>

      {!filtered.length ? (
        <EmptyState message="Aucun contact dans cette catégorie." />
      ) : (
        <div className="list-table">
          {filtered.map((contact) => {
            const hasEmail = Boolean(contact.email.trim());
            return (
              <div key={contact.id} className="list-row">
                <input
                  type="checkbox"
                  checked={selected.has(contact.id)}
                  disabled={!hasEmail}
                  title={hasEmail ? 'Sélectionner pour envoi groupé' : 'Aucune adresse email'}
                  onChange={() => toggleSelect(contact.id)}
                />
                <div className="list-content">
                  <h3>{contactFullName(contact)}</h3>
                  <span className="badge">{contact.categorie}</span>
                  <p className="meta">
                    {contact.organisation && `${contact.organisation} · `}
                    {contact.email || contact.telephone || '—'}
                  </p>
                </div>
                <div className="list-actions">
                  {hasEmail && (
                    <>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openSingleMail(contact)}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => openContactHistory(contact)}
                      >
                        Historique
                      </button>
                    </>
                  )}
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => openEdit(contact)}>
                    Modifier
                  </button>
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteTarget(contact)}>
                    Supprimer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
        </>
      )}

      <SentMailDetailModal
        log={selectedMailLog}
        contacts={contacts}
        onClose={() => setSelectedMailLog(null)}
      />

      <ContactGroupMailModal
        open={mailModalOpen}
        recipients={mailRecipients}
        title={mailModalTitle}
        onClose={() => setMailModalOpen(false)}
      />

      <Modal open={modalOpen} title={editing ? 'Modifier le contact' : 'Nouveau contact'} onClose={() => setModalOpen(false)}>
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div className="form-row">
            <label>
              Prénom
              <input value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
            </label>
            <label>
              Nom *
              <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
            </label>
          </div>
          <label>
            Catégorie
            <select
              value={form.categorie}
              onChange={(e) => setForm({ ...form, categorie: e.target.value as ContactCategory })}
            >
              {CONTACT_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <div className="form-row">
            <label>
              Email
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </label>
            <label>
              Téléphone
              <input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
            </label>
          </div>
          <label>
            Organisation
            <input value={form.organisation} onChange={(e) => setForm({ ...form, organisation: e.target.value })} />
          </label>
          <label>
            Notes
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </label>
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
        title="Supprimer le contact"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemove}
      >
        <p>
          Supprimer le contact <strong>{deleteTarget ? contactFullName(deleteTarget) : ''}</strong> ? Cette action
          est irréversible.
        </p>
      </ConfirmDeleteModal>
    </>
  );
}
