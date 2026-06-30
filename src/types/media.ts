export type MediaEntityType = 'work' | 'artist' | 'template';

export type MediaVariant = 'thumb' | 'display' | 'original';

export interface MediaAsset {
  id: string;
  groupId: string;
  entityType: MediaEntityType;
  entityId: string;
  variant: MediaVariant;
  blob: Blob;
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  sortOrder: number;
  originalName?: string;
  createdAt: string;
}

export interface ProcessedVariant {
  variant: MediaVariant;
  blob: Blob;
  width: number;
  height: number;
  byteSize: number;
}

export interface ProcessedImageSet {
  variants: ProcessedVariant[];
  originalName?: string;
}

export interface StorageStats {
  imageCount: number;
  totalBytes: number;
}
