import { useEffect, useState } from 'react';
import type { MediaVariant } from '../types/media';
import { getMediaObjectUrl, releaseMediaObjectUrl } from '../utils/mediaStore';

export function useMediaUrl(groupId: string | null | undefined, variant: MediaVariant = 'thumb'): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!groupId) {
      setUrl(null);
      return;
    }
    let cancelled = false;
    void getMediaObjectUrl(groupId, variant).then((resolved) => {
      if (!cancelled) setUrl(resolved);
    });
    return () => {
      cancelled = true;
      if (groupId) releaseMediaObjectUrl(groupId, variant);
    };
  }, [groupId, variant]);

  return url;
}
