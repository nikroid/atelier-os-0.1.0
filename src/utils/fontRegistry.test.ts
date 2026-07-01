import { describe, expect, it } from 'vitest';
import type { CustomFont } from '../types/customFonts';
import type { DocBlock } from '../types/templates';
import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  collectFontRefsFromRoot,
  collectFontRefsFromTemplate,
  customFontFromBackup,
  customFontToBackup,
  detectFontFormat,
  formatFontSizePt,
  parseFontSizePt,
  isBuiltinFontFamily,
  isCustomFontRef,
  isGoogleFontRef,
  resolveFontFamilyCss,
  sanitizeFontFamilyName,
} from './fontRegistry';

describe('fontRegistry', () => {
  it('formate et parse les tailles en pt', () => {
    expect(formatFontSizePt(11)).toBe('11pt');
    expect(formatFontSizePt()).toBe('11pt');
    expect(parseFontSizePt('14')).toBe(14);
    expect(parseFontSizePt('8.5')).toBe(8.5);
    expect(parseFontSizePt('abc', 11)).toBe(11);
  });

  it('détecte les formats de fichier', () => {
    expect(detectFontFormat('MaPolice.woff2')).toBe('woff2');
    expect(detectFontFormat('MaPolice.otf')).toBe('opentype');
    expect(detectFontFormat('readme.txt')).toBeNull();
  });

  it('résout les polices classiques', () => {
    expect(isBuiltinFontFamily('serif')).toBe(true);
    expect(resolveFontFamilyCss('sans', new Map())).toContain('system-ui');
  });

  it('résout les polices Google et custom', () => {
    expect(isGoogleFontRef('google:inter')).toBe(true);
    expect(resolveFontFamilyCss('google:inter', new Map())).toContain('Inter');

    const customMap = new Map<string, CustomFont>([
      [
        'f1',
        {
          id: 'f1',
          name: 'Ma police',
          familyName: 'Ma Police Perso',
          format: 'woff2',
          data: new ArrayBuffer(8),
          createdAt: '2026-01-01',
          updatedAt: '2026-01-01',
        },
      ],
    ]);
    expect(isCustomFontRef('custom:f1')).toBe(true);
    expect(resolveFontFamilyCss('custom:f1', customMap)).toBe("'Ma Police Perso', sans-serif");
  });

  it('collecte les références dans un arbre de blocs', () => {
    const root: DocBlock = {
      id: 'r',
      type: 'container',
      children: [
        { id: 't', type: 'text', fontFamily: 'google:lora', content: 'Hi' },
        { id: 'f', type: 'field', field: 'work.titre', fontFamily: 'custom:abc' },
      ],
    };
    const refs = collectFontRefsFromRoot(root);
    expect(refs.has('google:lora')).toBe(true);
    expect(refs.has('custom:abc')).toBe(true);
  });

  it('collecte les références dans un modèle multi-pages', () => {
    const refs = collectFontRefsFromTemplate({
      id: 't',
      nom: 'Test',
      type: 'custom',
      format: 'a4',
      margin: 12,
      background: '#fff',
      root: { id: 'legacy', type: 'container', direction: 'column', children: [] },
      pages: [
        {
          id: 'p1',
          kind: 'static',
          root: { id: 'r1', type: 'text', fontFamily: 'google:inter', content: 'A' },
        },
      ],
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    });
    expect(refs.has('google:inter')).toBe(true);
  });

  it('round-trip backup base64 pour polices custom', () => {
    const original: CustomFont = {
      id: 'font_x',
      name: 'Test Font',
      familyName: sanitizeFontFamilyName('Test Font'),
      format: 'truetype',
      data: new Uint8Array([1, 2, 3, 4]).buffer,
      createdAt: '2026-01-01',
      updatedAt: '2026-01-02',
    };
    const backup = customFontToBackup(original);
    expect(backup.dataBase64).toBe(arrayBufferToBase64(original.data));
    const restored = customFontFromBackup(backup);
    expect(restored.name).toBe(original.name);
    expect(new Uint8Array(restored.data)).toEqual(new Uint8Array(original.data));
    expect(base64ToArrayBuffer(backup.dataBase64).byteLength).toBe(4);
  });
});
