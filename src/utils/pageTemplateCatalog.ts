import type { PageTemplate } from '../types/pageTemplates';

export function sortPageTemplates(pageTemplates: PageTemplate[]): PageTemplate[] {
  return [...pageTemplates].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function resolvePageTemplate(
  id: string,
  pageTemplates: PageTemplate[] | undefined,
): PageTemplate | undefined {
  return pageTemplates?.find((tpl) => tpl.id === id);
}
