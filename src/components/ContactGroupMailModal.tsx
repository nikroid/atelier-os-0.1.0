import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ContactMailAttachments } from './ContactMailAttachments';
import { Modal } from '../components/Modal';
import { db, now, uid } from '../db/database';
import { useGmailAuth } from '../hooks/useGmailAuth';
import { useMailTemplates } from '../hooks/useDatabase';
import type { Contact } from '../types';
import { contactFullName } from '../utils/helpers';
import { ensureGmailAccessToken } from '../utils/gmailAuth';
import { sendGmailMessage } from '../utils/gmailSend';
import { attachmentsToMimeParts, type MailAttachmentDraft } from '../utils/mailAttachments';
import { attachmentsToSentMailMeta, logSentMail } from '../utils/sentMailLog';
import { ensureDefaultMailTemplates } from '../utils/mailTemplates';

interface ContactGroupMailModalProps {
  open: boolean;
  recipients: Contact[];
  onClose: () => void;
  title?: string;
}

export function ContactGroupMailModal({
  open,
  recipients,
  onClose,
  title = 'Envoyer un mail groupé',
}: ContactGroupMailModalProps) {
  const mailTemplates = useMailTemplates();
  const { auth, isConfigured, isConnected, isExpired, connecting, connect } = useGmailAuth();

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [mailSubject, setMailSubject] = useState('');
  const [mailBody, setMailBody] = useState('');
  const [saveTemplateName, setSaveTemplateName] = useState('');
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [attachments, setAttachments] = useState<MailAttachmentDraft[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const isGroup = recipients.length > 1;

  useEffect(() => {
    if (open) void ensureDefaultMailTemplates();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedTemplateId('');
    setMailSubject('');
    setMailBody('');
    setShowSaveTemplate(false);
    setSaveTemplateName('');
    setAttachments([]);
    setError('');
  }, [open]);

  const selectedMailTemplate = mailTemplates?.find((t) => t.id === selectedTemplateId);

  const applyMailTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const tpl = mailTemplates?.find((t) => t.id === templateId);
    if (!tpl) return;
    setMailSubject(tpl.subject);
    setMailBody(tpl.body);
  };

  const saveAsTemplate = async () => {
    const nom = saveTemplateName.trim();
    if (!nom) return;
    const ts = now();
    const id = uid('mailtpl');
    await db.mailTemplates.add({
      id,
      nom,
      subject: mailSubject,
      body: mailBody,
      createdAt: ts,
      updatedAt: ts,
    });
    setSelectedTemplateId(id);
    setShowSaveTemplate(false);
    setSaveTemplateName('');
  };

  const deleteMailTemplate = async (id: string) => {
    if (!confirm('Supprimer ce modèle de mail ?')) return;
    await db.mailTemplates.delete(id);
    if (selectedTemplateId === id) setSelectedTemplateId('');
  };

  const send = async () => {
    const emails = recipients.map((c) => c.email.trim()).filter(Boolean);
    if (!emails.length) return;

    setSending(true);
    setError('');
    try {
      const accessToken = await ensureGmailAccessToken();
      const mimeAttachments = attachments.length ? await attachmentsToMimeParts(attachments) : undefined;
      const messageId = await sendGmailMessage(accessToken, {
        subject: mailSubject,
        body: mailBody,
        to: isGroup ? undefined : emails,
        bcc: isGroup ? emails : undefined,
        attachments: mimeAttachments,
      });
      await logSentMail({
        sentAt: now(),
        subject: mailSubject,
        body: mailBody,
        recipientEmails: emails,
        contactIds: recipients.map((c) => c.id),
        isGroup,
        mailTemplateId: selectedTemplateId || undefined,
        gmailMessageId: messageId,
        attachments: attachmentsToSentMailMeta(attachments),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l’envoi Gmail.');
    } finally {
      setSending(false);
    }
  };

  const gmailReady = isConfigured && isConnected && !isExpired;

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      {!isConfigured && (
        <p className="hint contact-mail-hint">
          Gmail n’est pas configuré pour cette installation. Ajoutez{' '}
          <code>VITE_GOOGLE_CLIENT_ID</code> (voir DEPLOY.md).
        </p>
      )}

      {isConfigured && !gmailReady && (
        <div className="contact-gmail-connect card-section" style={{ marginBottom: '1rem' }}>
          <p className="hint" style={{ marginTop: 0 }}>
            {isExpired
              ? 'Votre session Gmail a expiré. Reconnectez-vous pour envoyer des mails.'
              : 'Connectez votre compte Gmail pour envoyer depuis Atelier OS.'}
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={connecting}
            onClick={() => void connect().catch((e) => setError(e instanceof Error ? e.message : 'Erreur'))}
          >
            {connecting ? 'Connexion…' : 'Connecter Gmail'}
          </button>
          <p className="hint">
            Ou configurez Gmail dans <Link to="/parametres">Paramètres</Link>.
          </p>
        </div>
      )}

      {gmailReady && (
        <p className="hint contact-mail-hint">
          Envoyé depuis <strong>{auth?.email}</strong>
          {isGroup && (
            <>
              {' '}
              — les {recipients.length} destinataires seront en <strong>CCI</strong> (copie cachée).
            </>
          )}
        </p>
      )}

      <ul className="contact-mail-recipients">
        {recipients.map((c) => (
          <li key={c.id}>
            {contactFullName(c)}
            <span className="meta"> — {c.email}</span>
          </li>
        ))}
      </ul>

      {error && <p className="form-error">{error}</p>}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <div className="form-row form-row-dense">
          <label className="editor-toolbar-field-grow">
            Modèle de mail
            <select
              value={selectedTemplateId}
              onChange={(e) => applyMailTemplate(e.target.value)}
              disabled={!gmailReady}
            >
              <option value="">— Message personnalisé —</option>
              {mailTemplates?.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.nom}
                </option>
              ))}
            </select>
          </label>
          {selectedMailTemplate && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{ alignSelf: 'flex-end' }}
              onClick={() => deleteMailTemplate(selectedMailTemplate.id)}
            >
              Supprimer modèle
            </button>
          )}
        </div>

        {!showSaveTemplate ? (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={!gmailReady}
            onClick={() => setShowSaveTemplate(true)}
          >
            Enregistrer ce message comme modèle
          </button>
        ) : (
          <div className="form-row form-row-dense">
            <label className="editor-toolbar-field-grow">
              Nom du modèle
              <input
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="Ex. Invitation vernissage"
              />
            </label>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void saveAsTemplate()}>
              Enregistrer
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowSaveTemplate(false);
                setSaveTemplateName('');
              }}
            >
              Annuler
            </button>
          </div>
        )}

        <label>
          Objet
          <input
            value={mailSubject}
            onChange={(e) => setMailSubject(e.target.value)}
            placeholder="Objet du message"
            disabled={!gmailReady}
          />
        </label>

        <label>
          Message
          <textarea
            rows={6}
            value={mailBody}
            onChange={(e) => setMailBody(e.target.value)}
            placeholder="Votre message…"
            disabled={!gmailReady}
          />
        </label>

        <ContactMailAttachments
          disabled={!gmailReady || sending}
          attachments={attachments}
          onChange={setAttachments}
        />

        <div className="form-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={sending}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={!gmailReady || sending}>
            {sending
              ? 'Envoi en cours…'
              : attachments.length
                ? `Envoyer via Gmail (${attachments.length} PJ)`
                : 'Envoyer via Gmail'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
