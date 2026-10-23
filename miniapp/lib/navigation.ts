export function backToGallery(): void {
  if (getCurrentPages().length > 1) {
    wx.navigateBack({ fail: openCatalog });
  } else {
    openCatalog();
  }
}

export function openCatalog(): void {
  wx.switchTab({ url: '/pages/works/index' });
}
