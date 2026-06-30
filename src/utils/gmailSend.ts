export interface GmailMimeAttachment {
  filename: string;
  mimeType: string;
  base64: string;
}

export interface GmailMimeOptions {
  subject: string;
  body: string;
  to?: string[];
  bcc?: string[];
  attachments?: GmailMimeAttachment[];
}

function encodeSubject(subject: string): string {
  if (/^[\x00-\x7F]*$/.test(subject)) return subject;
  const b64 = btoa(unescape(encodeURIComponent(subject)));
  return `=?UTF-8?B?${b64}?=`;
}

function encodeBodyBase64(body: string): string {
  return btoa(unescape(encodeURIComponent(body)));
}

function wrapBase64Lines(b64: string): string {
  return b64.replace(/.{1,76}/g, '$&\r\n').replace(/\r\n$/, '');
}

function encodeMimeFilename(filename: string): string {
  if (/^[\x20-\x7E]*$/.test(filename)) {
    return `filename="${filename.replace(/"/g, '\\"')}"`;
  }
  return `filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function makeBoundary(): string {
  return `atelier_${crypto.randomUUID().replace(/-/g, '')}`;
}

function buildAddressHeaders(to?: string[], bcc?: string[]): string[] {
  const headers: string[] = [];
  if (to?.length) {
    headers.push(`To: ${to.join(', ')}`);
  } else if (bcc?.length) {
    headers.push('To: undisclosed-recipients:;');
  }
  if (bcc?.length) {
    headers.push(`Bcc: ${bcc.join(', ')}`);
  }
  return headers;
}

function buildTextPart(body: string): string {
  return [
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64Lines(encodeBodyBase64(body)),
  ].join('\r\n');
}

function buildAttachmentPart(att: GmailMimeAttachment, boundary: string): string {
  return [
    `--${boundary}`,
    `Content-Type: ${att.mimeType}; ${encodeMimeFilename(att.filename)}`,
    `Content-Disposition: attachment; ${encodeMimeFilename(att.filename)}`,
    'Content-Transfer-Encoding: base64',
    '',
    wrapBase64Lines(att.base64),
  ].join('\r\n');
}

/** Construit un message MIME RFC 2822 pour l'API Gmail. */
export function buildRawMime({ subject, body, to, bcc, attachments }: GmailMimeOptions): string {
  const addressHeaders = buildAddressHeaders(to, bcc);
  const hasAttachments = Boolean(attachments?.length);

  if (!hasAttachments) {
    const headers = [
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      `Subject: ${encodeSubject(subject)}`,
      ...addressHeaders,
    ];
    return `${headers.join('\r\n')}\r\n\r\n${wrapBase64Lines(encodeBodyBase64(body))}`;
  }

  const boundary = makeBoundary();
  const headers = [
    'MIME-Version: 1.0',
    `Subject: ${encodeSubject(subject)}`,
    ...addressHeaders,
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
  ];

  const parts = [
    `--${boundary}`,
    buildTextPart(body),
    ...(attachments ?? []).map((att) => buildAttachmentPart(att, boundary)),
    `--${boundary}--`,
    '',
  ];

  return `${headers.join('\r\n')}\r\n\r\n${parts.join('\r\n')}`;
}

export function mimeToBase64Url(mime: string): string {
  const bytes = new TextEncoder().encode(mime);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendViaGmail(accessToken: string, mime: string): Promise<void> {
  const raw = mimeToBase64Url(mime);
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw enrichGmailApiError(payload.error?.message ?? `Gmail API erreur ${res.status}`);
  }
}

function enrichGmailApiError(message: string): Error {
  if (/insufficient authentication scopes/i.test(message)) {
    return new Error(
      'Permissions Gmail insuffisantes. Paramètres → Déconnecter Gmail → reconnecter en acceptant l’accès à l’envoi de mails (scope gmail.send).',
    );
  }
  return new Error(message);
}

export async function sendGmailMessage(
  accessToken: string,
  options: GmailMimeOptions,
): Promise<void> {
  const mime = buildRawMime(options);
  await sendViaGmail(accessToken, mime);
}
