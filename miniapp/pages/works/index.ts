import { errorMessage, fetchCatalog } from '../../lib/api';
import { workCard } from '../../lib/presentation';
import type { WorkCard } from '../../lib/presentation';

Page({
  data: {
    state: 'loading', error: '', loaded: false, refreshing: false,
    works: [] as WorkCard[],
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
      this.setData({ works: catalog.works.map(workCard), state: 'ready', loaded: true, refreshing: false });
    } catch (error) {
      if (version !== this.requestVersion) return;
      this.setData({ state: this.data.loaded ? 'ready' : 'error', error: errorMessage(error), refreshing: false });
    }
  },
});
