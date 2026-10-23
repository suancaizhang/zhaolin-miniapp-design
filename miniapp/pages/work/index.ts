import { ApiError, errorMessage, fetchWork, mediaUrl } from '../../lib/api';
import { stageGroups } from '../../lib/presentation';
import type { StageGroup } from '../../lib/presentation';
import type { Work } from '../../../shared/types';
import { backToGallery, openCatalog } from '../../lib/navigation';

Page({
  data: {
    state: 'loading', error: '', work: null as Work | null,
    overallUrl: '', overallAlt: '', groups: [] as StageGroup[],
    previewError: '', backLabel: '返回作品目录',
  },
  workId: '',
  requestVersion: 0,
  previewUrls: [] as string[],
  lastPreviewUrl: '',
  onLoad(query: Record<string, string | undefined>) {
    this.workId = query.id || '';
    this.setData({ work: null, overallUrl: '', groups: [], previewError: '', backLabel: getCurrentPages().length > 1 ? '返回上一级' : '返回作品目录' });
    wx.hideShareMenu();
    void this.load();
  },
  onUnload() { this.requestVersion += 1; },
  async onPullDownRefresh() {
    await this.load();
    wx.stopPullDownRefresh();
  },
  async load() {
    const version = ++this.requestVersion;
    this.previewUrls = [];
    this.lastPreviewUrl = '';
    wx.hideShareMenu();
    this.setData({ state: 'loading', error: '', work: null, overallUrl: '', overallAlt: '', groups: [], previewError: '' });
    if (!this.workId) {
      this.setData({ state: 'notfound', error: '未找到这件作品，入口缺少作品标识。' });
      return;
    }
    try {
      const work = await fetchWork(this.workId);
      if (version !== this.requestVersion) return;
      const overall = work.images.find((image) => image.id === work.overallImageId);
      const overallUrl = overall ? mediaUrl(overall.url) : '';
      this.previewUrls = [overallUrl, ...work.images.filter((image) => image.id !== work.overallImageId).map((image) => mediaUrl(image.url))].filter(Boolean);
      this.setData({ work, overallUrl, overallAlt: overall?.alt || `${work.title} · 整体`, groups: stageGroups(work), state: 'ready' });
      wx.setNavigationBarTitle({ title: work.title });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (error) {
      if (version !== this.requestVersion) return;
      const notfound = error instanceof ApiError && error.status === 404;
      this.setData({ state: notfound ? 'notfound' : 'error', error: notfound ? '未找到这件作品。' : errorMessage(error) });
    }
  },
  appreciate(event: WechatMiniprogram.CustomEvent<{ url: string }>) {
    this.openPreview(event.detail.url);
  },
  openPreview(url: string) {
    if (!url || !this.previewUrls.includes(url)) {
      this.setData({ previewError: '这张图片暂时无法欣赏，请重新载入作品。' });
      return;
    }
    this.lastPreviewUrl = url;
    this.setData({ previewError: '' });
    wx.previewImage({
      current: url,
      urls: this.previewUrls,
      showmenu: false,
      fail: () => this.setData({ previewError: '未能打开图片欣赏，请重试。' }),
    });
  },
  retryPreview() { this.openPreview(this.lastPreviewUrl); },
  onShareAppMessage() {
    const work = this.data.work;
    return {
      title: work?.title || '召麐作品馆',
      path: `/pages/work/index?id=${encodeURIComponent(work?.id || this.workId)}`,
      ...(this.data.overallUrl ? { imageUrl: this.data.overallUrl } : {}),
    };
  },
  backToGallery,
  openCatalog,
});
