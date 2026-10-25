import { NotFoundError, errorMessage, fetchSeries } from '../../lib/catalog';
import { workCard } from '../../lib/presentation';
import type { WorkCard } from '../../lib/presentation';
import { backToGallery, openCatalog } from '../../lib/navigation';
import type { GallerySeries } from '../../../shared/types';

Page({
  data: {
    state: 'loading', error: '', loaded: false, refreshing: false,
    series: null as GallerySeries | null,
    works: [] as WorkCard[],
    backLabel: '返回图集',
  },
  seriesId: '',
  requestVersion: 0,
  onLoad(query: Record<string, string | undefined>) {
    this.seriesId = query.id || '';
    this.setData({ series: null, works: [], loaded: false, backLabel: getCurrentPages().length > 1 ? '返回上一级' : '返回图集' });
  },
  onShow() { void this.load(); },
  onUnload() { this.requestVersion += 1; },
  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },
  async load() {
    const version = ++this.requestVersion;
    if (!this.seriesId) {
      this.setData({ state: 'notfound', error: '未找到这个系列，入口缺少系列标识。' });
      return;
    }
    this.setData({ state: this.data.loaded ? 'ready' : 'loading', refreshing: this.data.loaded, error: '' });
    try {
      const result = await fetchSeries(this.seriesId);
      if (version !== this.requestVersion) return;
      this.setData({ series: result.series, works: result.works.map(workCard), state: 'ready', loaded: true, refreshing: false });
      wx.setNavigationBarTitle({ title: result.series.name });
    } catch (error) {
      if (version !== this.requestVersion) return;
      if (error instanceof NotFoundError) {
        this.setData({ state: 'notfound', error: '未找到这个系列。', series: null, works: [], loaded: false, refreshing: false });
      } else {
        this.setData({ state: this.data.loaded ? 'ready' : 'error', error: errorMessage(error), refreshing: false });
      }
    }
  },
  backToGallery,
  openCatalog,
});
