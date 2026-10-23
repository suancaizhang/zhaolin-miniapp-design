(() => {
  'use strict';

  // Descriptive labels and series below are comparison data, not confirmed catalogue entries.
  const works = [
    {
      id: 'source-01',
      title: '西王母 · 设色',
      series: 'figures',
      stage: '设色记录',
      image: 'assets/source-01-xiwangmu.jpg',
      description: '冠饰、衣纹与青绿底色，保留尚未设色的面部与背光。',
      alt: '灰褐底材上的西王母半身画，已铺青绿、赭褐等底色',
      source: '公开笔记 #01，封面索引参考配图'
    },
    {
      id: 'source-03',
      title: '敦煌57窟 · 线稿',
      series: 'figures',
      stage: '线稿记录',
      image: 'assets/source-03-dunhuang.jpg',
      description: '圆背光、冠饰与长披帛，由黑色细线组织。',
      alt: '灰白底材上的全身菩萨黑线稿，具有圆背光和长披帛',
      source: '公开笔记 #03，封面索引参考配图'
    },
    {
      id: 'source-15',
      title: '手势与持物 · 朱线',
      series: 'hands',
      stage: '线稿记录',
      image: 'assets/source-15-hand.jpg',
      description: '一手持装饰器物，腕下祥云以朱红单线勾勒。',
      alt: '米黄纸上的朱红线描，手握装饰器物，腕下有祥云',
      source: '公开笔记 #15，封面索引参考配图'
    }
  ];
  const series = [
    { id: 'all', label: '全部题材' },
    { id: 'figures', label: '壁画人物' },
    { id: 'hands', label: '手势与持物' }
  ];

  function getVisibleWorks(category) {
    return category === 'all' ? works : works.filter(work => work.series === category);
  }

  function renderArtwork(work, index, theme) {
    const image = `<img class="artwork-image" src="${work.image}" alt="${work.alt}" width="186" height="242">`;
    const framedImage = theme === 'c'
      ? `<span class="exhibit-frame"><span class="exhibit-index" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>${image}</span>`
      : image;
    return `<button type="button" class="artwork" data-work="${work.id}" aria-label="放大欣赏：${work.title}">
      ${framedImage}
      <span class="artwork-caption">
        <span class="artwork-title">${work.title}</span>
        <span class="artwork-stage">${work.stage}</span>
        <span class="artwork-description">${work.description}</span>
        <span class="artwork-hint">点图欣赏细节</span>
      </span>
    </button>`;
  }

  function renderFeedback(state) {
    if (state === 'loading') {
      return '<div class="feedback" role="status" aria-busy="true"><span class="loading-ring" aria-hidden="true"></span><h3>正在取来作品</h3><p>请稍候，画面即将呈现。</p></div>';
    }
    if (state === 'empty') {
      return '<div class="feedback" role="status"><span class="feedback-mark" aria-hidden="true">—</span><h3>作品正在整理</h3><p>这里还没有可展示的作品。<br>欢迎稍后再来看看。</p></div>';
    }
    return '<div class="feedback" role="alert"><span class="feedback-mark" aria-hidden="true">!</span><h3>作品暂时未能载入</h3><p>请检查网络后，再试一次。</p><button type="button" data-retry>重新加载</button></div>';
  }

  function renderContent(theme, tab, category, state) {
    const isGallery = tab === 'gallery';
    const seal = theme === 'c' ? '<div class="gallery-seal" aria-hidden="true"><span>召</span><span>麐</span></div>' : '';
    const title = isGallery ? '个人作品馆' : '全部作品';
    const heading = `<header class="collection-header">${seal}<div><p class="collection-kicker">召麐 · 绘画</p><h3 class="collection-title">${title}</h3><p class="collection-description">${isGallery ? '看整体，也看一笔一线。' : '从画面与线条，慢慢看起。'}</p></div></header>`;
    if (state !== 'normal') return heading + renderFeedback(state);
    const filters = `<div class="series-controls" role="group" aria-label="按系列欣赏">${series.map(item => `<button type="button" data-series="${item.id}" aria-pressed="${category === item.id}">${item.label}</button>`).join('')}</div>`;
    const sectionTitle = category === 'all' ? (isGallery ? '精选作品' : '作品目录') : series.find(item => item.id === category)?.label || '作品目录';
    const more = isGallery ? '<button class="text-button" type="button" data-show-works>全部作品 →</button>' : '';
    const list = getVisibleWorks(category).map((work, index) => renderArtwork(work, index, theme)).join('');
    return `${heading}${filters}<div class="section-heading"><h3>${sectionTitle}</h3>${more}</div><div class="artwork-list">${list}</div><p class="source-footnote">整体与局部 · 线稿与设色</p>`;
  }


  const displayState = document.getElementById('display-state');
  const phones = Array.from(document.querySelectorAll('.phone'));
  const phoneStates = new Map(phones.map(phone => [phone, { tab: 'gallery', category: 'all', lastTrigger: null }]));

  function closeViewer(phone, restoreFocus = true) {
    const viewer = phone.querySelector('.image-viewer');
    if (viewer.hidden) return;
    viewer.hidden = true;
    for (const node of phone.querySelectorAll('.page-content, .tabbar')) node.inert = false;
    if (restoreFocus) phoneStates.get(phone).lastTrigger?.focus();
  }

  function renderPhone(phone) {
    const state = phoneStates.get(phone);
    closeViewer(phone, false);
    const content = phone.querySelector('.page-content');
    content.innerHTML = renderContent(phone.dataset.theme, state.tab, state.category, displayState.value);
    content.scrollTop = 0;
    for (const button of phone.querySelectorAll('[data-tab]')) {
      const selected = button.dataset.tab === state.tab;
      if (selected) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const kind = button.dataset.tab === 'gallery' ? 'gallery' : 'works';
      button.querySelector('img').src = `assets/tab-${kind}${selected ? '-selected' : ''}.png`;
    }
  }

  function showViewer(phone, trigger) {
    const work = works.find(item => item.id === trigger.dataset.work);
    if (!work) return;
    const viewer = phone.querySelector('.image-viewer');
    phoneStates.get(phone).lastTrigger = trigger;
    viewer.innerHTML = `<div class="viewer-toolbar"><strong>${work.title}</strong><button class="viewer-close" type="button" data-close-viewer>关闭</button></div><img class="viewer-image" src="${work.image}" alt="${work.alt}"><p class="viewer-caption">${work.source}。原图与作品资料待作者确认。</p>`;
    viewer.hidden = false;
    for (const node of phone.querySelectorAll('.page-content, .tabbar')) node.inert = true;
    viewer.querySelector('[data-close-viewer]').focus();
  }

  for (const phone of phones) {
    phone.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || !phone.contains(button)) return;
      const state = phoneStates.get(phone);
      if (button.hasAttribute('data-close-viewer')) return closeViewer(phone);
      if (button.dataset.work) return showViewer(phone, button);
      if (button.hasAttribute('data-retry')) {
        displayState.value = 'normal';
        phones.forEach(renderPhone);
        return;
      }
      if (button.dataset.tab || button.hasAttribute('data-show-works')) {
        state.tab = button.dataset.tab || 'works';
        state.category = 'all';
        renderPhone(phone);
        if (button.hasAttribute('data-show-works')) phone.querySelector('[data-tab="works"]').focus();
      } else if (button.dataset.series) {
        state.category = button.dataset.series;
        renderPhone(phone);
        phone.querySelector(`[data-series="${state.category}"]`).focus();
      }
    });
    phone.addEventListener('keydown', event => {
      const viewer = phone.querySelector('.image-viewer');
      if (viewer.hidden) return;
      if (event.key === 'Escape') closeViewer(phone);
      if (event.key === 'Tab') {
        event.preventDefault();
        viewer.querySelector('[data-close-viewer]').focus();
      }
    });
    renderPhone(phone);
  }

  displayState.addEventListener('change', () => phones.forEach(renderPhone));
  document.getElementById('large-type').addEventListener('change', event => {
    document.body.classList.toggle('large-type', event.target.checked);
  });
  document.getElementById('reset-comparison').addEventListener('click', () => {
    displayState.value = 'normal';
    document.getElementById('large-type').checked = false;
    document.body.classList.remove('large-type');
    for (const phone of phones) {
      Object.assign(phoneStates.get(phone), { tab: 'gallery', category: 'all' });
      renderPhone(phone);
    }
  });
})();
