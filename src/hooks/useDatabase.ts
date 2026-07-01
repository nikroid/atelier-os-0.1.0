import { liveQuery } from 'dexie';
import { useEffect, useMemo, useState } from 'react';
import { db } from '../db/database';
import type { Artist, Work } from '../types';
import { mergeTemplates } from '../utils/templateCatalog';
import { sortPageTemplates } from '../utils/pageTemplateCatalog';

function useObservable<T>(factory: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [data, setData] = useState<T>();

  useEffect(() => {
    const sub = liveQuery(factory).subscribe({
      next: setData,
      error: (err) => console.error(err),
    });
    return () => sub.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return data;
}

export function useArtists() {
  return useObservable(() => db.artists.orderBy('nom').toArray(), []);
}

export function useWorks() {
  return useObservable(() => db.works.orderBy('updatedAt').reverse().toArray(), []);
}

export function useContacts() {
  return useObservable(() => db.contacts.orderBy('nom').toArray(), []);
}

export function useExhibitions() {
  return useObservable(() => db.exhibitions.orderBy('date_debut').reverse().toArray(), []);
}

export function useTemplates() {
  return useObservable(() => db.templates.orderBy('updatedAt').reverse().toArray(), []);
}

export function useMailTemplates() {
  return useObservable(() => db.mailTemplates.orderBy('updatedAt').reverse().toArray(), []);
}

export function usePageTemplates() {
  return useObservable(async () => sortPageTemplates(await db.pageTemplates.toArray()), []);
}

/** Modèles par défaut + modèles personnels enregistrés. */
export function useAllTemplates() {
  const userTemplates = useTemplates();
  return useMemo(
    () => (userTemplates ? mergeTemplates(userTemplates) : undefined),
    [userTemplates],
  );
}

export function useUserTemplates() {
  return useTemplates();
}

export function useArtistMap(artists: Artist[] | undefined) {
  const map = new Map<string, Artist>();
  artists?.forEach((a) => map.set(a.id, a));
  return map;
}

export function useStats() {
  return useObservable(async () => {
    const [artists, works, contacts, exhibitions, templates, pageTemplates, customFonts] = await Promise.all([
      db.artists.count(),
      db.works.count(),
      db.contacts.count(),
      db.exhibitions.count(),
      db.templates.count(),
      db.pageTemplates.count(),
      db.customFonts.count(),
    ]);
    return { artists, works, contacts, exhibitions, templates, pageTemplates, customFonts };
  }, []);
}

export async function getWorksByIds(ids: string[]): Promise<Work[]> {
  const works = await db.works.bulkGet(ids);
  return works.filter((w): w is Work => w !== undefined);
}

export async function getExhibitionWithWorks(expo: import('../types').Exhibition) {
  const works = await getWorksByIds(expo.oeuvreIds);
  const artist = await db.artists.get(expo.artisteId);
  return { works, artist };
}
