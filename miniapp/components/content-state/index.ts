Component({
  properties: {
    state: { type: String, value: 'loading' },
    message: { type: String, value: '' },
    back: { type: Boolean, value: false },
  },
  methods: {
    retry() { this.triggerEvent('retry'); },
    goBack() { this.triggerEvent('back'); },
  },
});
