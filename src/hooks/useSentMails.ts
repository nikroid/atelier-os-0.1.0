import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '../db/database';
import type { SentMailLog } from '../types/sentMails';

export function useSentMails(): SentMailLog[] | undefined {
  const [sentMails, setSentMails] = useState<SentMailLog[] | undefined>();

  useEffect(() => {
    const sub = liveQuery(() => db.sentMails.orderBy('sentAt').reverse().toArray()).subscribe({
      next: setSentMails,
      error: (err) => console.error(err),
    });
    return () => sub.unsubscribe();
  }, []);

  return sentMails;
}
