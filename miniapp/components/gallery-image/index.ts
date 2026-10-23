Component({
  properties: {
    src: { type: String, value: '' },
    alt: { type: String, value: '作品图片' },
    height: { type: String, value: '240px' },
    appreciable: { type: Boolean, value: false },
  },
  data: { failed: false, mounted: true },
  observers: {
    src() {
      this.setData({ failed: false, mounted: true });
    },
  },
  methods: {
    onError() {
      this.setData({ failed: true });
    },
    retry() {
      this.setData({ mounted: false, failed: false }, () => this.setData({ mounted: true }));
    },
    appreciate() {
      if (this.data.appreciable && this.data.src && !this.data.failed) {
        this.triggerEvent('appreciate', { url: this.data.src });
      }
    },
  },
});
