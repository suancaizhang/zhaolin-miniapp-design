import { localCatalog } from './local-catalog';
import type { GalleryCatalog, GalleryWork } from './local-catalog';
import type { GallerySeries } from '../../shared/types';

export class NotFoundError extends Error {}

export function seriesCoverUrl(imageId: string): string {
  for (const work of localCatalog.works) {
    const image = work.images.find((item) => item.id === imageId);
    if (image) return image.thumbUrl;
  }
  return '';
}

export async function fetchCatalog(): Promise<GalleryCatalog> {
  return localCatalog;
}

export async function fetchWork(id: string): Promise<GalleryWork> {
  const work = localCatalog.works.find((item) => item.id === id);
  if (!work) throw new NotFoundError('未找到这件作品。');
  return work;
}

export async function fetchSeries(id: string): Promise<{ series: GallerySeries; works: GalleryWork[] }> {
  const series = localCatalog.series.find((item) => item.id === id);
  if (!series) throw new NotFoundError('未找到这个系列。');
  return { series, works: localCatalog.works.filter((work) => work.seriesIds.includes(id)) };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '暂时无法载入，请稍后重试。';
}
