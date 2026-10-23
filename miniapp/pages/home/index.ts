import { errorMessage, fetchCatalog, seriesCoverUrl } from '../../lib/api';
import { workCard } from '../../lib/presentation';
import type { WorkCard } from '../../lib/presentation';
import { openCatalog } from '../../lib/navigation';
import type { GallerySeries } from '../../../shared/types';

type SeriesCard = GallerySeries & { coverUrl: string; path: string; count: number };

Page({
  data: {
    state: 'loading', error: '', loaded: false, refreshing: false,
    featured: [] as WorkCard[],
    series: [] as SeriesCard[],
    count: 0,
  },
  requestVersion: 0,
  onShow() { void this.load(); },
  onUnload() { this.requestVersion += 1; },
  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },
  async load() {
    const version = ++this.requestVersion;
    this.setData({ state: this.data.loaded ? 'ready' : 'loading', refreshing: this.data.loaded, error: '' });
    try {
      const catalog = await fetchCatalog();
      if (version !== this.requestVersion) return;
      this.setData({
        featured: catalog.works.filter((work) => work.featured).map(workCard),
        series: catalog.series.map((series) => ({
          ...series,
          coverUrl: seriesCoverUrl(series.coverImageId),
          path: `/pages/series/index?id=${encodeURIComponent(series.id)}`,
          count: catalog.works.filter((work) => work.seriesIds.includes(series.id)).length,
        })),
        count: catalog.works.length,
        state: 'ready', loaded: true, refreshing: false,
      });
    } catch (error) {
      if (version !== this.requestVersion) return;
      this.setData({ state: this.data.loaded ? 'ready' : 'error', error: errorMessage(error), refreshing: false });
    }
  },
  openCatalog,
});
