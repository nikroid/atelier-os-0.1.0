export interface SentMailAttachmentMeta {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

/** Journal local d'un mail envoyé depuis Atelier OS. */
export interface SentMailLog {
  id: string;
  sentAt: string;
  subject: string;
  body: string;
  recipientEmails: string[];
  contactIds: string[];
  isGroup: boolean;
  mailTemplateId?: string;
  gmailMessageId?: string;
  attachments: SentMailAttachmentMeta[];
  createdAt: string;
}
