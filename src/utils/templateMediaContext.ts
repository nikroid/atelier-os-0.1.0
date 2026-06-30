import type { TemplateContext } from './templateFields';
import { preloadMediaUrls } from './mediaStore';

function collectContextMediaIds(ctx: TemplateContext): string[] {
  const ids: string[] = [];
  const workImage = ctx.work?.imageIds?.[0];
  if (workImage) ids.push(workImage);
  if (ctx.artist?.photoId) ids.push(ctx.artist.photoId);
  return ids;
}

function attachUrls(ctx: TemplateContext, urls: Record<string, string>): TemplateContext {
  const ids = collectContextMediaIds(ctx);
  if (!ids.length) return ctx;
  const mediaUrlByGroupId: Record<string, string> = { ...(ctx.mediaUrlByGroupId ?? {}) };
  for (const id of ids) {
    if (urls[id]) mediaUrlByGroupId[id] = urls[id];
  }
  return { ...ctx, mediaUrlByGroupId };
}

export async function enrichTemplateContext(ctx: TemplateContext): Promise<TemplateContext> {
  const ids = collectContextMediaIds(ctx);
  if (!ids.length) return ctx;
  const urls = await preloadMediaUrls(ids, 'display');
  return attachUrls(ctx, urls);
}

export async function enrichTemplateContexts(contexts: TemplateContext[]): Promise<TemplateContext[]> {
  const allIds = new Set<string>();
  for (const ctx of contexts) {
    for (const id of collectContextMediaIds(ctx)) allIds.add(id);
  }
  if (!allIds.size) return contexts;
  const urls = await preloadMediaUrls([...allIds], 'display');
  return contexts.map((ctx) => attachUrls(ctx, urls));
}
