import type { CSSProperties } from 'react';
import type { DocTemplate } from '../../types/templates';
import { useMediaUrl } from '../../hooks/useMediaUrl';
import { getEffectivePageBgType, pageBackgroundStyle } from '../../utils/pageBackground';

export function PageBackgroundSurface({
  template,
  style,
  className,
  children,
  onClick,
}: {
  template: DocTemplate;
  style?: CSSProperties;
  className?: string;
  children?: React.ReactNode;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const bgType = getEffectivePageBgType(template);
  const imageUrl = useMediaUrl(
    bgType === 'image' ? template.pageBgImageGroupId : null,
    'display',
  );
  const bgStyle = pageBackgroundStyle(template, imageUrl);

  return (
    <div className={className} style={{ ...bgStyle, ...style }} onClick={onClick}>
      {children}
    </div>
  );
}
