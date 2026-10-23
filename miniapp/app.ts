export interface GalleryApp {
  globalData: { apiBaseUrl: string };
}

App<GalleryApp>({
  globalData: {
    // Desktop WeChat simulator only. A phone's loopback is not this computer.
    apiBaseUrl: 'http://127.0.0.1:8788',
  },
});
