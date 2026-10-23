export type CreativeStatus = '创作中' | '已完成';
export type CreationStage = '线稿' | '设色' | '完成效果';
export type ImageView = '整体' | '局部';

export interface GalleryImage {
  id: string;
  alt: string;
  view: ImageView;
  width: number;
  height: number;
  url: string;
  thumbUrl: string;
}
export interface CreationRecord {
  id: string;
  stage: CreationStage;
  view: ImageView;
  caption: string;
  date: string;
  imageId: string;
}
export interface WorkInput {
  title: string;
  description: string;
  status: CreativeStatus;
  year: string;
  material: string;
  dimensions: string;
  featured: boolean;
  sort: number;
  seriesIds: string[];
  imageIds: string[];
  coverImageId: string;
  overallImageId: string;
  records: CreationRecord[];
  sourceRefs: string[];
}
export interface Work extends Omit<WorkInput, 'imageIds'> {
  id: string;
  images: GalleryImage[];
}
export interface GallerySeries {
  id: string;
  name: string;
  description: string;
  coverImageId: string;
  sort: number;
}
export type SeriesInput = Omit<GallerySeries, 'id'>;
export interface SourceNote {
  id: string;
  index: string;
  publishedAt: string;
  summary: string;
  workId: string | null;
  recordId: string | null;
  reason: string;
}
export interface Catalog {
  works: Work[];
  series: GallerySeries[];
}
export interface AdminCatalog extends Catalog {
  images: GalleryImage[];
  sources: SourceNote[];
}
export interface SessionInfo {
  user: { username: string } | null;
  csrfToken: string | null;
}
export interface ApiErrorBody {
  error: { code: string; message: string; fields?: Record<string, string> };
}
