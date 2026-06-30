import { useMediaUrl } from '../hooks/useMediaUrl';
import type { MediaVariant } from '../types/media';

export function MediaThumb({
  groupId,
  alt = '',
  variant = 'thumb',
  className,
}: {
  groupId: string | null | undefined;
  alt?: string;
  variant?: MediaVariant;
  className?: string;
}) {
  const url = useMediaUrl(groupId, variant);
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}
