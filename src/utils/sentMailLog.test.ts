import { describe, expect, it } from 'vitest';
import { attachmentsToSentMailMeta, gmailSentMessageUrl } from './sentMailLog';
import type { MailAttachmentDraft } from './mailAttachments';

describe('sentMailLog', () => {
  it('maps attachment drafts to metadata without blob content', () => {
    const blob = new Blob(['pdf'], { type: 'application/pdf' });
    const drafts: MailAttachmentDraft[] = [
      {
        id: 'att_1',
        filename: 'catalogue.pdf',
        mimeType: 'application/pdf',
        blob,
        source: 'pdf',
      },
    ];
    expect(attachmentsToSentMailMeta(drafts)).toEqual([
      {
        filename: 'catalogue.pdf',
        mimeType: 'application/pdf',
        sizeBytes: blob.size,
      },
    ]);
  });

  it('builds Gmail sent folder URL', () => {
    expect(gmailSentMessageUrl('abc123')).toBe(
      'https://mail.google.com/mail/u/0/#sent/abc123',
    );
  });
});
