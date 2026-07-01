import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PageTemplate } from '../types/pageTemplates';

const artistsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const worksStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const contactsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const exhibitionsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const templatesStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const pageTemplatesStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const customFontsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const customPageFormatsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const mailTemplatesStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};
const sentMailsStore = {
  clear: vi.fn(async () => {}),
  bulkAdd: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
  add: vi.fn(async () => {}),
  delete: vi.fn(async () => {}),
};
const settingsStore = {
  get: vi.fn(async () => undefined),
  put: vi.fn(async () => {}),
  toArray: vi.fn(async () => []),
};

const db = {
  artists: artistsStore,
  works: worksStore,
  contacts: contactsStore,
  exhibitions: exhibitionsStore,
  templates: templatesStore,
  pageTemplates: pageTemplatesStore,
  customFonts: customFontsStore,
  customPageFormats: customPageFormatsStore,
  mailTemplates: mailTemplatesStore,
  sentMails: sentMailsStore,
  settings: settingsStore,
  transaction: vi.fn(async (_mode: string, _stores: unknown[], cb: () => Promise<void>) => cb()),
};

vi.mock('../db/database', () => ({
  db,
  now: () => '2026-01-03T00:00:00.000Z',
}));

vi.mock('./templateCatalog', () => ({
  isBuiltinTemplate: vi.fn(() => false),
}));

vi.mock('./templatePages', () => ({
  normalizeTemplate: vi.fn((value) => value),
  normalizePageTemplate: vi.fn((value) => value),
}));

describe('backup page templates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exportBackup includes pageTemplates, customFonts, customPageFormats, sentMails and version 1.7', async () => {
    const pageTemplates: PageTemplate[] = [
      {
        id: 'pagetpl_1',
        nom: 'Page test',
        kind: 'static',
        root: { id: 'blk_1', type: 'container', direction: 'column', children: [] },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ];
    pageTemplatesStore.toArray.mockResolvedValueOnce(pageTemplates as never);
    customFontsStore.toArray.mockResolvedValueOnce([
      {
        id: 'font_1',
        name: 'Ma police',
        familyName: 'Ma Police',
        format: 'woff2',
        data: new Uint8Array([1, 2]).buffer,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ] as never);
    customPageFormatsStore.toArray.mockResolvedValueOnce([
      {
        id: 'fmt_1',
        name: 'Mon format',
        widthMm: 210,
        heightMm: 297,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    ] as never);
    sentMailsStore.toArray.mockResolvedValueOnce([
      {
        id: 'mail_1',
        sentAt: '2026-01-02T10:00:00.000Z',
        subject: 'Test',
        body: 'Corps',
        recipientEmails: ['a@example.com'],
        contactIds: ['contact_1'],
        isGroup: false,
        attachments: [],
        createdAt: '2026-01-02T10:00:00.000Z',
      },
    ] as never);

    const { exportBackup } = await import('./backup');
    const backup = await exportBackup();

    expect(backup.version).toBe('1.7');
    expect(backup.pageTemplates).toEqual(pageTemplates);
    expect(backup.customFonts).toHaveLength(1);
    expect(backup.customFonts?.[0].dataBase64).toBeTruthy();
    expect(backup.customPageFormats).toHaveLength(1);
    expect(backup.sentMails).toHaveLength(1);
  });

  it('importBackupFromData imports pageTemplates and customFonts', async () => {
    const { importBackupFromData } = await import('./backup');
    const result = await importBackupFromData({
      version: '1.5',
      exportedAt: '2026-01-02T00:00:00.000Z',
      artists: [],
      works: [],
      contacts: [],
      exhibitions: [],
      templates: [],
      pageTemplates: [
        {
          id: 'pagetpl_1',
          nom: 'Page test',
          kind: 'static',
          root: { id: 'blk_1', type: 'container', direction: 'column', children: [] },
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      customFonts: [
        {
          id: 'font_1',
          name: 'Ma police',
          familyName: 'Ma Police',
          format: 'woff2',
          dataBase64: 'AQID',
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-02T00:00:00.000Z',
        },
      ],
      mailTemplates: [],
    });

    expect(pageTemplatesStore.bulkAdd).toHaveBeenCalledTimes(1);
    expect(customFontsStore.bulkAdd).toHaveBeenCalledTimes(1);
    expect(result.counts.modelesDePage).toBe(1);
    expect(result.counts.polices).toBe(1);
  });

  it('importBackupFromData imports sentMails', async () => {
    const { importBackupFromData } = await import('./backup');
    const result = await importBackupFromData({
      version: '1.7',
      exportedAt: '2026-01-02T00:00:00.000Z',
      artists: [],
      works: [],
      contacts: [],
      exhibitions: [],
      templates: [],
      sentMails: [
        {
          id: 'mail_1',
          sentAt: '2026-01-02T10:00:00.000Z',
          subject: 'Invitation',
          body: 'Bonjour',
          recipientEmails: ['j@example.com'],
          contactIds: ['c1'],
          isGroup: false,
          attachments: [],
          createdAt: '2026-01-02T10:00:00.000Z',
        },
      ],
      mailTemplates: [],
    });

    expect(sentMailsStore.bulkAdd).toHaveBeenCalledTimes(1);
    expect(result.counts.mailsEnvoyes).toBe(1);
  });

  it('importBackupFromData reste compatible sans customFonts', async () => {
    const { importBackupFromData } = await import('./backup');
    const result = await importBackupFromData({
      version: '1.4',
      exportedAt: '2026-01-02T00:00:00.000Z',
      artists: [],
      works: [],
      contacts: [],
      exhibitions: [],
      templates: [],
      pageTemplates: [],
      mailTemplates: [],
    });

    expect(customFontsStore.bulkAdd).not.toHaveBeenCalled();
    expect(result.counts.polices).toBe(0);
  });
});
