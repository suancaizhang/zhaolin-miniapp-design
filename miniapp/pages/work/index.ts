import { NotFoundError, errorMessage, fetchWork } from '../../lib/catalog';
import { stageGroups } from '../../lib/presentation';
import type { StageGroup } from '../../lib/presentation';
import type { GalleryWork } from '../../lib/local-catalog';
import { backToGallery, openCatalog } from '../../lib/navigation';

Page({
  data: {
    state: 'loading', error: '', work: null as GalleryWork | null,
    overallUrl: '', overallAlt: '', overallView: '', groups: [] as StageGroup[],
    previewError: '', backLabel: '返回图集',
  },
  workId: '',
  requestVersion: 0,
  previewUrls: [] as string[],
  lastPreviewUrl: '',
  onLoad(query: Record<string, string | undefined>) {
    this.workId = query.id || '';
    this.setData({ work: null, overallUrl: '', overallView: '', groups: [], previewError: '', backLabel: getCurrentPages().length > 1 ? '返回上一级' : '返回图集' });
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
    this.setData({ state: 'loading', error: '', work: null, overallUrl: '', overallAlt: '', overallView: '', groups: [], previewError: '' });
    if (!this.workId) {
      this.setData({ state: 'notfound', error: '未找到这件作品，入口缺少作品标识。' });
      return;
    }
    try {
      const work = await fetchWork(this.workId);
      if (version !== this.requestVersion) return;
      const overall = work.images.find((image) => image.id === work.overallImageId);
      const overallUrl = overall?.url || '';
      this.previewUrls = [overallUrl, ...work.images.filter((image) => image.id !== work.overallImageId).map((image) => image.url)].filter(Boolean);
      this.setData({ work, overallUrl, overallAlt: overall?.alt || `${work.title} · ${overall?.view || '整体'}`, overallView: overall?.view || '整体', groups: stageGroups(work), state: 'ready' });
      wx.setNavigationBarTitle({ title: work.title });
      wx.showShareMenu({ menus: ['shareAppMessage'] });
    } catch (error) {
      if (version !== this.requestVersion) return;
      const notfound = error instanceof NotFoundError;
      this.setData({ state: notfound ? 'notfound' : 'error', error: notfound ? '未找到这件作品。' : errorMessage(error) });
    }
  },
  appreciate(event: WechatMiniprogram.CustomEvent<{ url: string }>) {
    this.openPreview(event.detail.url);
  },
  async openPreview(url: string) {
    const sourceUrls: string[] = this.previewUrls;
    if (!url || !sourceUrls.includes(url)) {
      this.setData({ previewError: '这张图片暂时无法欣赏，请重新载入作品。' });
      return;
    }
    const version = this.requestVersion;
    const current = sourceUrls.indexOf(url);
    this.lastPreviewUrl = url;
    this.setData({ previewError: '' });
    try {
      const images = await Promise.all(sourceUrls.map(src => wx.getImageInfo({ src })));
      if (version !== this.requestVersion) return;
      const urls = images.map(image => image.path);
      wx.previewImage({
        current: urls[current], urls, showmenu: false,
        fail: () => {
          if (version === this.requestVersion) this.setData({ previewError: '未能打开图片欣赏，请重试。' });
        },
      });
    } catch {
      if (version === this.requestVersion) this.setData({ previewError: '未能读取图片，请重试。' });
    }
  },
  retryPreview() { this.openPreview(this.lastPreviewUrl); },
  onShareAppMessage() {
    const work = this.data.work;
    return {
      title: work?.title || '召麐作品馆',
      path: `/pages/work/index?id=${encodeURIComponent(work?.id || this.workId)}`,
      ...(work?.shareImageUrl ? { imageUrl: work.shareImageUrl } : {}),
    };
  },
  backToGallery,
  openCatalog,
});
