import { db, now, uid } from '../db/database';
import type { SentMailAttachmentMeta, SentMailLog } from '../types/sentMails';
import type { MailAttachmentDraft } from './mailAttachments';

export function attachmentsToSentMailMeta(
  attachments: MailAttachmentDraft[],
): SentMailAttachmentMeta[] {
  return attachments.map((a) => ({
    filename: a.filename,
    mimeType: a.mimeType || 'application/octet-stream',
    sizeBytes: a.blob.size,
  }));
}

export async function logSentMail(
  entry: Omit<SentMailLog, 'id' | 'createdAt'>,
): Promise<SentMailLog> {
  const ts = now();
  const log: SentMailLog = {
    ...entry,
    id: uid('mail'),
    sentAt: entry.sentAt || ts,
    createdAt: ts,
  };
  await db.sentMails.add(log);
  return log;
}

export async function deleteSentMailLog(id: string): Promise<void> {
  await db.sentMails.delete(id);
}

export function gmailSentMessageUrl(gmailMessageId: string): string {
  return `https://mail.google.com/mail/u/0/#sent/${gmailMessageId}`;
}

export function formatSentMailDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
