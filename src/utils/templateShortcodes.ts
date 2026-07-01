import type { FieldKey } from '../types/templates';
import { FIELD_CATALOG, isImageField, resolveField, type TemplateContext } from './templateFields';

const SHORTCODE_PATTERN = /\[([^\]]+)\]/g;

function normalizeShortcodeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

const SHORTCODE_LOOKUP = new Map<string, FieldKey>();

for (const field of FIELD_CATALOG) {
  SHORTCODE_LOOKUP.set(normalizeShortcodeKey(field.label), field.key);
  SHORTCODE_LOOKUP.set(normalizeShortcodeKey(field.key), field.key);
  const shortKey = field.key.split('.').pop();
  if (shortKey) SHORTCODE_LOOKUP.set(normalizeShortcodeKey(shortKey), field.key);
}

/** Champs utilisables comme shortcode dans un bloc texte (hors images). */
export const TEXT_SHORTCODE_FIELDS = FIELD_CATALOG.filter((f) => !isImageField(f.key));

export function shortcodeTag(label: string): string {
  return `[${label}]`;
}

export function resolveShortcodeToken(token: string, ctx: TemplateContext): string {
  const key = SHORTCODE_LOOKUP.get(normalizeShortcodeKey(token));
  if (!key) return `[${token}]`;

  const def = FIELD_CATALOG.find((f) => f.key === key);
  if (key === 'work.image' || key === 'artist.photo' || key === 'expo.affiche') return def?.preview ?? '[image]';

  const value = resolveField(key, ctx);
  return value || def?.preview || `[${token}]`;
}

/** Remplace les shortcodes `[Année]`, `[work.annee]`, etc. par les données du contexte. */
export function resolveShortcodes(content: string, ctx: TemplateContext): string {
  if (!content) return '';
  return content.replace(SHORTCODE_PATTERN, (_match, token: string) => resolveShortcodeToken(token, ctx));
}

export function contentHasShortcodes(content: string | undefined): boolean {
  if (!content) return false;
  SHORTCODE_PATTERN.lastIndex = 0;
  return SHORTCODE_PATTERN.test(content);
}
