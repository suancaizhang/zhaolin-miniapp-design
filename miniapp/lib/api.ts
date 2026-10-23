import type { GalleryApp } from '../app';
import type { Catalog, Work, GallerySeries } from '../../shared/types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function baseUrl(): string {
  return getApp<GalleryApp>().globalData.apiBaseUrl.replace(/\/$/, '');
}

export function mediaUrl(path: string): string {
  return path.startsWith('/media/') ? `${baseUrl()}${path}` : '';
}

export function seriesCoverUrl(imageId: string): string {
  return imageId ? mediaUrl(`/media/${encodeURIComponent(imageId)}/thumb.webp`) : '';
}

function get<T>(path: string): Promise<T> {
  // Keep the request bridge compatible with the miniapp's ES2020 runtime baseline.
  return new Promise((resolve, reject) => {
    wx.request({
      url: `${baseUrl()}${path}`,
      method: 'GET',
      timeout: 15000,
      header: { Accept: 'application/json' },
      success(response) {
        const body = response.data as { data?: T; error?: { message?: string } } | null;
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new ApiError(body?.error?.message || '暂时无法载入，请稍后重试。', response.statusCode));
          return;
        }
        if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'data')) {
          reject(new ApiError('服务返回了无法读取的内容，请重试。'));
          return;
        }
        resolve(body.data as T);
      },
      fail() {
        reject(new ApiError('无法连接作品馆。请确认本地服务已启动，以及开发者工具的网络设置。'));
      },
    });
  });
}

export const fetchCatalog = (): Promise<Catalog> => get('/api/catalog');
export const fetchWork = (id: string): Promise<Work> => get(`/api/works/${encodeURIComponent(id)}`);
export const fetchSeries = (id: string): Promise<{ series: GallerySeries; works: Work[] }> =>
  get(`/api/series/${encodeURIComponent(id)}`);

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '暂时无法载入，请稍后重试。';
}
