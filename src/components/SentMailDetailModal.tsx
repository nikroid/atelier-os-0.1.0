import { useState } from 'react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { Modal } from './Modal';
import type { Contact } from '../types';
import type { SentMailLog } from '../types/sentMails';
import { contactFullName } from '../utils/helpers';
import { formatAttachmentSize } from '../utils/mailAttachments';
import {
  deleteSentMailLog,
  formatSentMailDate,
  gmailSentMessageUrl,
} from '../utils/sentMailLog';

interface SentMailDetailModalProps {
  log: SentMailLog | null;
  contacts: Contact[] | undefined;
  onClose: () => void;
}

export function SentMailDetailModal({ log, contacts, onClose }: SentMailDetailModalProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!log) return null;

  const contactMap = new Map(contacts?.map((c) => [c.id, c]) ?? []);

  const confirmRemove = async () => {
    await deleteSentMailLog(log.id);
    setDeleteOpen(false);
    onClose();
  };

  return (
    <>
      <Modal open={Boolean(log)} title="Détail de l'envoi" onClose={onClose} wide>
        <div className="sent-mail-detail">
          <p className="sent-mail-detail-meta">
            <strong>Date</strong> — {formatSentMailDate(log.sentAt)}
          </p>
          <p className="sent-mail-detail-meta">
            <strong>Objet</strong> — {log.subject || '(Sans objet)'}
          </p>
          {log.isGroup && (
            <p className="hint">Envoi groupé en copie cachée (CCI).</p>
          )}

          <div className="sent-mail-detail-section">
            <strong>Destinataires</strong>
            <ul className="contact-mail-recipients">
              {log.contactIds.map((contactId, i) => {
                const contact = contactMap.get(contactId);
                const email = log.recipientEmails[i] ?? contact?.email ?? '';
                return (
                  <li key={contactId}>
                    {contact ? contactFullName(contact) : email}
                    <span className="meta"> — {email}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="sent-mail-detail-section">
            <strong>Message</strong>
            <pre className="sent-mail-body">{log.body}</pre>
          </div>

          {log.attachments.length > 0 && (
            <div className="sent-mail-detail-section">
              <strong>Pièces jointes</strong>
              <ul className="sent-mail-attachments">
                {log.attachments.map((att) => (
                  <li key={att.filename}>
                    {att.filename}
                    <span className="meta"> — {formatAttachmentSize(att.sizeBytes)}</span>
                  </li>
                ))}
              </ul>
              <p className="hint">Les fichiers ne sont pas conservés localement.</p>
            </div>
          )}

          <div className="btn-row sent-mail-detail-actions">
            {log.gmailMessageId && (
              <a
                href={gmailSentMessageUrl(log.gmailMessageId)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
              >
                Ouvrir dans Gmail
              </a>
            )}
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setDeleteOpen(true)}>
              Supprimer de l'historique
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={deleteOpen}
        title="Supprimer de l'historique"
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmRemove}
        confirmLabel="Supprimer"
      >
        <p>Supprimer cet envoi de l'historique local ? Le mail reste dans Gmail.</p>
      </ConfirmDeleteModal>
    </>
  );
}
