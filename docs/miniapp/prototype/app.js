(() => {
  'use strict';
  const model = GalleryPrototypeModel;
  const element = id => document.getElementById(id);
  const ui = {
    network: element('network-state'), permission: element('permission-state'), largeType: element('large-type'),
    reset: element('reset-demo'), status: element('prototype-status'), phone: element('mobile-phone'),
    back: element('mobile-back'), title: element('mobile-title'), content: element('mobile-content'),
    tabs: element('mobile-tabbar'), overlay: element('mobile-overlay'), work: element('admin-work'),
    admin: element('admin-content'), preview: element('preview-current')
  };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
  const clone = value => JSON.parse(JSON.stringify(value));
  const selected = value => value ? ' selected' : '';
  const checked = value => value ? ' checked' : '';
  let catalog = model.createDemoCatalog();
  let receiverCatalog = null;
  let route = { page: 'home' };
  let history = [];
  let editingId = catalog.works[0].id;
  let seriesEditingId = catalog.series[0].id;
  let overlayTrigger = null;
  let generation = 0;
  let nextLocalImage = 1;
  let nextRecord = 1;
  const drafts = new Map();
  const seriesDrafts = new Map();
  const objectURLs = new Set();
  const pendingFiles = new Map();
  const notices = new Map();

  function announce(message) { ui.status.textContent = message; }
  function viewingCatalog() { return receiverCatalog || catalog; }
  function currentWork() { return model.findWork(viewingCatalog(), route.id); }
  function emptyWork() {
    return { title: '', description: '', status: '创作中', year: '', material: '', dimensions: '', featured: false, sort: 40, seriesIds: [], sourceRefs: [], images: [], coverImageId: '', overallImageId: '', records: [] };
  }
  function draftFor(id = editingId) {
    if (!drafts.has(id)) drafts.set(id, id === 'new' ? emptyWork() : clone(model.findWork(catalog, id)));
    return drafts.get(id);
  }
  function seriesDraftFor() {
    if (!seriesDrafts.has(seriesEditingId)) seriesDrafts.set(seriesEditingId, seriesEditingId === 'new' ? { name: '', description: '' } : clone(catalog.series.find(item => item.id === seriesEditingId)));
    return seriesDrafts.get(seriesEditingId);
  }

  function header(title, description) {
    return `<header class="collection-header"><p class="collection-kicker">召麐 · 绘画</p><h2 class="collection-title">${escape(title)}</h2><p class="collection-description">${escape(description)}</p></header>`;
  }
  function feedback(title, description, action = 'catalogue', label = '返回作品目录') {
    return `<section class="feedback" role="status"><span class="feedback-mark" aria-hidden="true">—</span><h2>${escape(title)}</h2><p>${escape(description)}</p><button type="button" class="secondary-button" data-action="${action}">${escape(label)}</button></section>`;
  }
  function scenarioContent() {
    if (ui.network.value === 'loading') return '<section class="feedback" role="status" aria-busy="true"><span class="loading-ring" aria-hidden="true"></span><h2>正在取来作品</h2><p>请稍候，画面即将呈现。</p><button type="button" class="secondary-button" data-action="retry">恢复展示</button></section>';
    if (ui.network.value === 'empty') return feedback('作品正在整理', '这里暂时没有可展示的作品。', 'recover', '回到作品目录');
    if (ui.network.value === 'error') return '<section class="feedback" role="alert"><span class="feedback-mark" aria-hidden="true">!</span><h2>作品暂时未能载入</h2><p>请稍后重试。</p><button type="button" class="primary-button" data-action="retry">重新加载</button></section>';
    return '';
  }
  function artwork(work) {
    const image = work.images.find(item => item.id === work.coverImageId);
    return `<button type="button" class="artwork-card" data-work="${escape(work.id)}" aria-label="查看作品：${escape(work.title)}"><img class="artwork-image" src="${escape(image.src)}" alt="${escape(image.alt)}"><span class="artwork-caption"><span class="artwork-title">${escape(work.title)}</span><span class="artwork-meta"><span class="tag">${escape(work.status)}</span>${work.year ? ` · ${escape(work.year)}` : ''}</span></span></button>`;
  }
  function artworkList(works) {
    return works.length ? `<div class="artwork-grid">${works.map(artwork).join('')}</div>` : feedback('还没有作品', '作品整理好后，会在这里与你见面。');
  }
  function renderHome() {
    const data = viewingCatalog();
    const featured = model.listWorks(data, { featuredOnly: true });
    return `${header('个人作品馆', '看整体，也看一笔一线。')}<div class="section-heading"><h3>精选作品</h3><button type="button" class="text-button" data-action="catalogue">全部作品 →</button></div>${featured.length ? artworkList(featured) : '<p class="source-footnote">暂未设置精选，仍可浏览全部作品。</p>'}<div class="section-heading"><h3>按系列欣赏</h3></div><div class="series-grid">${data.series.map(series => `<button type="button" class="series-card" data-series="${escape(series.id)}"><span class="series-name">${escape(series.name)}</span><span class="series-description">${escape(series.description)}</span><span class="artwork-meta">${model.listWorks(data, { seriesId: series.id }).length} 件作品</span></button>`).join('')}</div><p class="source-footnote">整体与局部 · 线稿与设色</p>`;
  }
  function renderDetail(work) {
    if (!work) return feedback('没有找到这件作品', '这个演示入口没有对应的作品。你可以先去作品目录看看。');
    const image = work.images.find(item => item.id === work.overallImageId);
    const metadata = [['年份', work.year], ['材料', work.material], ['尺寸', work.dimensions]].filter(([, value]) => value);
    const groups = model.STAGES.map(stage => {
      const records = work.records.filter(record => record.stage === stage);
      if (!records.length) return '';
      return `<section class="record-group"><h4>${stage}</h4>${records.map(record => {
        const recordImage = work.images.find(item => item.id === record.imageId);
        return `<article class="record-card"><button type="button" data-image="${escape(recordImage.id)}" aria-label="放大欣赏：${escape(record.caption)}"><img class="record-image" src="${escape(recordImage.src)}" alt="${escape(recordImage.alt)}"></button><div class="record-caption"><span class="tag tag-muted">${escape(record.view)}</span>${record.date ? `<time datetime="${escape(record.date)}">${escape(record.date)}</time>` : ''}<p>${escape(record.caption)}</p></div></article>`;
      }).join('')}</section>`;
    }).join('');
    const series = viewingCatalog().series.filter(item => work.seriesIds.includes(item.id));
    return `<button type="button" class="detail-hero" data-image="${escape(image.id)}" aria-label="放大欣赏整体：${escape(work.title)}"><img class="artwork-image" src="${escape(image.src)}" alt="${escape(image.alt)}"></button><header class="detail-header"><span class="tag">${escape(work.status)}</span><h2>${escape(work.title)}</h2><p class="detail-summary">${escape(work.description)}</p>${metadata.length ? `<dl class="detail-meta">${metadata.map(([label, value]) => `<div><dt>${label}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>` : ''}<button type="button" class="primary-button share-button" data-action="share">分享这件作品</button></header>${series.length ? `<section class="detail-section"><h3>所属系列</h3><div class="choice-group">${series.map(item => `<button type="button" class="text-button" data-series="${escape(item.id)}">${escape(item.name)} →</button>`).join('')}</div></section>` : ''}<section class="detail-section"><h3>创作记录</h3>${groups || '<p class="collection-description">暂未整理创作记录，先欣赏整体画面。</p>'}</section><p class="source-footnote">点图放大，慢慢看每一笔。</p>${receiverCatalog ? '<button type="button" class="secondary-button" data-action="catalogue">返回本页作品馆</button>' : ''}`;
  }
  function renderMobile() {
    closeOverlay(false);
    const subpage = route.page === 'series' || route.page === 'detail';
    ui.back.hidden = !subpage;
    ui.tabs.hidden = subpage;
    ui.title.textContent = route.page === 'home' ? '召麐' : route.page === 'detail' ? '作品详情' : route.page === 'series' ? '系列' : '作品';
    for (const button of ui.tabs.querySelectorAll('[data-tab]')) {
      const active = button.dataset.tab === route.page;
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
      const kind = button.dataset.tab === 'home' ? 'gallery' : 'works';
      button.querySelector('img').src = `../ui-options/assets/tab-${kind}${active ? '-selected' : ''}.png`;
    }
    const scenario = scenarioContent();
    if (scenario) ui.content.innerHTML = scenario;
    else if (route.page === 'home') ui.content.innerHTML = renderHome();
    else if (route.page === 'detail') ui.content.innerHTML = renderDetail(currentWork());
    else if (route.page === 'series') {
      const series = viewingCatalog().series.find(item => item.id === route.id);
      ui.content.innerHTML = series ? header(series.name, series.description) + artworkList(model.listWorks(viewingCatalog(), { seriesId: series.id })) : feedback('没有找到这个系列', '请回到作品目录继续欣赏。');
    } else ui.content.innerHTML = header('全部作品', '从画面与线条，慢慢看起。') + artworkList(model.listWorks(viewingCatalog()));
  }
  function navigate(next, root = false) {
    if (root) history = [];
    else history.push({ route: { ...route }, scroll: ui.content.scrollTop });
    route = next;
    renderMobile();
    ui.content.scrollTop = 0;
    ui.content.focus();
  }
  function returnToCatalogue(recover = false) {
    if (recover) ui.network.value = 'normal';
    receiverCatalog = null;
    navigate({ page: 'works' }, true);
  }
  function goBack() {
    const previous = history.pop();
    if (!previous) return returnToCatalogue();
    route = previous.route;
    renderMobile();
    ui.content.scrollTop = previous.scroll;
    ui.content.focus();
  }

  function closeOverlay(restoreFocus = true) {
    if (ui.overlay.hidden) return;
    ui.overlay.hidden = true;
    ui.content.inert = false;
    ui.tabs.inert = false;
    ui.back.inert = false;
    if (restoreFocus) {
      if (overlayTrigger && overlayTrigger.isConnected) overlayTrigger.focus();
      else ui.content.focus();
    }
  }
  function showOverlay(content, label, trigger) {
    overlayTrigger = trigger;
    ui.overlay.innerHTML = content;
    ui.overlay.setAttribute('aria-label', label);
    ui.overlay.hidden = false;
    ui.content.inert = true;
    ui.tabs.inert = true;
    ui.back.inert = true;
    ui.overlay.querySelector('[data-close-overlay]').focus();
  }
  function showImage(imageId, trigger) {
    const work = currentWork();
    const image = work && work.images.find(item => item.id === imageId);
    if (!image) return;
    showOverlay(`<section class="overlay-panel"><header class="overlay-header"><strong>${escape(work.title)}</strong><button type="button" class="overlay-close" data-close-overlay>关闭</button></header><img class="overlay-image" src="${escape(image.src)}" alt="${escape(image.alt)}"><p class="overlay-caption">${escape(image.view)} · ${escape(image.alt)}</p></section>`, '图片欣赏', trigger);
  }
  function showShare(trigger) {
    const work = currentWork();
    if (!work) return;
    const image = work.images.find(item => item.id === work.coverImageId);
    showOverlay(`<section class="overlay-panel share-sheet"><header class="overlay-header"><strong>作品入口</strong><button type="button" class="overlay-close" data-close-overlay>关闭</button></header><img class="overlay-image" src="${escape(image.src)}" alt="${escape(image.alt)}"><h3>${escape(work.title)}</h3><p>${escape(work.description)}</p><p class="overlay-caption">本地朋友入口演示，不会发送微信消息。接收方从默认样例按作品标识打开；本页临时修改和新增作品不会传过去。</p><p class="overlay-caption">${escape(model.workFragment(work.id))}</p><button type="button" class="primary-button" data-receiver="${escape(work.id)}">查看接收方入口演示</button></section>`, '作品分享入口演示', trigger);
    announce('正在预览分享入口，未调用微信、剪贴板或网络。');
  }
  function openReceiver(id) {
    receiverCatalog = model.createDemoCatalog();
    navigate({ page: 'detail', id }, true);
    announce('接收方入口演示：仅按稳定标识读取默认样例；不读取编辑表单或本页临时作品，也没有真实发送。');
  }

  function options(values, value) {
    return values.map(item => `<option value="${escape(item)}"${selected(item === value)}>${escape(item)}</option>`).join('');
  }
  function inputField(label, name, value, { type = 'text', wide = false, hint = '', required = false } = {}) {
    return `<label class="field${wide ? ' field-wide' : ''}"><span class="field-label">${label}${required ? ' *' : ''}</span><input type="${type}" name="${escape(name)}" value="${escape(value)}"${required ? ' required' : ''}${type === 'number' ? ' step="any"' : ''}>${hint ? `<span class="field-hint">${hint}</span>` : ''}</label>`;
  }
  function selectField(label, name, content) {
    return `<label class="field"><span class="field-label">${label}</span><select name="${escape(name)}">${content}</select></label>`;
  }
  function seriesChoices(work) {
    return catalog.series.map(series => `<label><input type="checkbox" name="seriesIds" value="${escape(series.id)}"${checked(work.seriesIds.includes(series.id))}> ${escape(series.name)}</label>`).join('') || '<p class="field-hint">尚无系列，可在下方新建。</p>';
  }
  function imageOptions(work, value) {
    return `<option value="">请选择图像</option>${work.images.map((image, index) => `<option value="${escape(image.id)}"${selected(image.id === value)}>图 ${index + 1} · ${escape(image.alt)}</option>`).join('')}`;
  }
  function renderImages(work) {
    return `<section class="admin-section"><div class="section-heading"><h3>图像与展示顺序</h3></div><p class="field-hint">封面用于目录；整体展示图始终首先出现。参考配图并非作者原图。新增图像仅在当前页面预览。</p><label class="field"><span class="field-label">选择本地图片（PNG / JPEG / WebP）</span><input type="file" name="localImages" accept="image/png,image/jpeg,image/webp" multiple><span class="field-hint">仅创建内存预览，不上传。关闭或重置页面后失效。</span></label><div class="image-choice">${work.images.map((image, index) => `<fieldset class="image-option" data-image-index="${index}"><legend>图 ${index + 1}</legend><img src="${escape(image.src)}" alt="${escape(image.alt)}">${inputField('图像说明', `images.${index}.alt`, image.alt, { required: true })}${selectField('图像视角', `images.${index}.view`, options(model.VIEWS, image.view))}<label><input type="radio" name="coverImageId" value="${escape(image.id)}"${checked(work.coverImageId === image.id)}> 设为作品封面</label><label><input type="radio" name="overallImageId" value="${escape(image.id)}"${checked(work.overallImageId === image.id)}> 设为整体展示图</label></fieldset>`).join('')}</div>${work.images.length ? '' : '<p class="field-hint">尚无图像。请先选择至少一张整体展示图，再保存演示作品。</p>'}<p class="form-notice" data-image-notice role="status">${pendingFiles.get(editingId) ? '正在读取本地图片，请稍候。' : ''}</p></section>`;
  }
  function renderRecords(work) {
    return `<section class="admin-section"><div class="section-heading"><h3>创作记录</h3><button type="button" class="secondary-button" data-action="add-record">添加记录</button></div><p class="field-hint">创作阶段与图像视角分开维护。只填写可靠的创作日期，不使用笔记发布日期代替；未知留空。</p>${work.records.map((record, index) => `<fieldset class="record-editor"><legend>记录 ${index + 1}</legend><div class="form-grid">${selectField('创作阶段', `records.${index}.stage`, options(model.STAGES, record.stage))}${selectField('图像视角', `records.${index}.view`, options(model.VIEWS, record.view))}${selectField('引用图像', `records.${index}.imageId`, imageOptions(work, record.imageId))}${inputField('可靠的创作日期（可选）', `records.${index}.date`, record.date, { type: 'date' })}${inputField('记录说明', `records.${index}.caption`, record.caption, { wide: true, required: true })}</div></fieldset>`).join('') || '<p class="field-hint">尚无创作记录，可直接展示整体作品。</p>'}</section>`;
  }
  function renderSeriesEditor() {
    const series = seriesDraftFor();
    return `<form class="editor-form admin-section" data-form="series" novalidate><div class="section-heading"><h3>系列维护</h3></div><p class="field-hint">系列引用同一件作品，不复制作品。保存系列后，在作品表单勾选归属并保存。</p><label class="field"><span class="field-label">选择系列</span><select name="seriesEditor">${catalog.series.map(item => `<option value="${escape(item.id)}"${selected(item.id === seriesEditingId)}>${escape(item.name)}</option>`).join('')}<option value="new"${selected(seriesEditingId === 'new')}>＋ 新建系列</option></select></label><div class="form-grid">${inputField('系列名称', 'name', series.name, { required: true })}<label class="field field-wide"><span class="field-label">系列说明</span><textarea name="description" rows="2">${escape(series.description)}</textarea></label></div><p class="form-notice" role="status" data-series-notice></p><button type="submit" class="secondary-button">保存系列演示</button></form>`;
  }
  function renderWorkChoices() {
    ui.work.innerHTML = catalog.works.map(work => `<option value="${escape(work.id)}"${selected(work.id === editingId)}>${escape(work.title)}</option>`).join('') + `<option value="new"${selected(editingId === 'new')}>＋ 新建作品</option>`;
  }
  function renderAdmin() {
    const denied = ui.permission.value === 'denied';
    ui.work.disabled = denied;
    ui.preview.disabled = denied;
    if (denied) {
      ui.admin.innerHTML = '<section class="feedback" role="status"><h3>暂无维护权限</h3><p>这是后台维护权限拒绝演示，并非观众的微信授权。未保存内容仍保留在本页内存中。</p><button type="button" class="secondary-button" data-action="return-gallery">返回作品馆</button></section>';
      return;
    }
    const work = draftFor();
    ui.admin.innerHTML = `<form class="editor-form" data-form="work" novalidate><div class="section-heading"><h3>${editingId === 'new' ? '新建作品' : '作品资料'}</h3><span class="status-tag">本页演示</span></div><div class="form-grid">${inputField('作品名称', 'title', work.title, { wide: true, required: true })}<label class="field field-wide"><span class="field-label">简短作品说明 *</span><textarea name="description" rows="3" required>${escape(work.description)}</textarea></label>${selectField('创作状态 *', 'status', options(model.STATUSES, work.status))}${inputField('年份（可选）', 'year', work.year, { hint: '四位年份；未知留空。' })}${inputField('材料（可选）', 'material', work.material)}${inputField('尺寸（可选）', 'dimensions', work.dimensions)}${inputField('展示排序 *', 'sort', work.sort, { type: 'number', hint: '数字越小越靠前。', required: true })}<label class="field"><span class="field-label">首页精选</span><span><input type="checkbox" name="featured"${checked(work.featured)}> 在精选作品中展示</span></label></div><fieldset class="choice-group" data-series-choices><legend>所属系列（可多选）</legend>${seriesChoices(work)}</fieldset><label class="field"><span class="field-label">来源笔记关联（每行一条）</span><textarea name="sourceRefs" rows="3">${escape(work.sourceRefs.join('\n'))}</textarea><span class="field-hint">填写来源编号或备注供维护者核对；笔记不等于作品，不把参考图标为作者原图。</span></label>${renderImages(work)}${renderRecords(work)}<p class="form-notice" role="status" data-work-notice>${escape(notices.get(editingId) || '')}</p><div class="form-actions"><button type="submit" class="primary-button">保存本页演示</button><span class="field-hint">不写入磁盘、不上传、不发布线上。</span></div></form>${renderSeriesEditor()}`;
  }

  function captureWork() {
    const form = ui.admin.querySelector('[data-form="work"]');
    if (!form) return draftFor();
    const data = new FormData(form);
    const work = draftFor();
    for (const key of ['title', 'description', 'status', 'year', 'material', 'dimensions', 'sort', 'coverImageId', 'overallImageId']) work[key] = data.get(key) || '';
    work.featured = data.has('featured');
    work.seriesIds = data.getAll('seriesIds');
    work.sourceRefs = String(data.get('sourceRefs') || '').split(/\r?\n/);
    work.images.forEach((image, index) => {
      image.alt = data.get(`images.${index}.alt`) || '';
      image.view = data.get(`images.${index}.view`) || '';
    });
    work.records.forEach((record, index) => {
      for (const key of ['stage', 'view', 'imageId', 'date', 'caption']) record[key] = data.get(`records.${index}.${key}`) || '';
    });
    return work;
  }
  function captureSeries() {
    const form = ui.admin.querySelector('[data-form="series"]');
    if (!form) return;
    const data = new FormData(form);
    Object.assign(seriesDraftFor(), { name: data.get('name') || '', description: data.get('description') || '' });
  }
  function setNotice(form, selector, message, isError = false) {
    const target = form.querySelector(selector);
    target.textContent = message;
    target.setAttribute('role', isError ? 'alert' : 'status');
    announce(message);
  }
  function saveBlocked(form, selector) {
    if (ui.permission.value !== 'allowed') {
      setNotice(form, selector, '暂无维护权限，未修改作品数据。', true);
      return true;
    }
    if (ui.network.value !== 'normal') {
      const messages = { loading: '当前演示正在加载，暂不能保存。', error: '保存失败演示：数据未更改。', empty: '当前为空数据情景，暂不能保存。' };
      setNotice(form, selector, `${messages[ui.network.value]} 表单已保留；将顶部状态切回“正常”后可重试。`, true);
      return true;
    }
    return false;
  }
  function displayErrors(form, errors, selector) {
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(node => node.remove());
    let first = null;
    for (const [name, message] of Object.entries(errors)) {
      const control = Array.from(form.elements).find(node => node.name === name);
      if (!control) continue;
      control.setAttribute('aria-invalid', 'true');
      const hint = document.createElement('span');
      hint.className = 'field-error';
      hint.textContent = message;
      (control.closest('.field') || control.parentElement).append(hint);
      if (!first) first = control;
    }
    setNotice(form, selector, Object.values(errors).join(' '), true);
    if (first) first.focus();
  }
  function saveWork(form) {
    const work = captureWork();
    if (saveBlocked(form, '[data-work-notice]')) return;
    if (pendingFiles.get(editingId)) return setNotice(form, '[data-work-notice]', '图片仍在读取，表单已保留。请等待预览出现后保存。', true);
    const result = model.saveWork(catalog, editingId === 'new' ? null : editingId, work);
    if (!result.ok) return displayErrors(form, result.errors, '[data-work-notice]');
    captureSeries();
    drafts.delete(editingId);
    notices.delete(editingId);
    editingId = result.work.id;
    notices.set(editingId, '已更新本页演示数据，未发布线上。');
    renderWorkChoices();
    renderAdmin();
    renderMobile();
    announce('已更新本页演示数据，未发布线上。刷新或关闭页面会恢复默认样例。');
  }
  function saveSeries(form) {
    captureSeries();
    if (saveBlocked(form, '[data-series-notice]')) return;
    const result = model.saveSeries(catalog, seriesEditingId === 'new' ? null : seriesEditingId, seriesDraftFor());
    if (!result.ok) return displayErrors(form, result.errors, '[data-series-notice]');
    captureWork();
    seriesDrafts.delete(seriesEditingId);
    seriesEditingId = result.series.id;
    renderAdmin();
    renderMobile();
    setNotice(ui.admin.querySelector('[data-form="series"]'), '[data-series-notice]', '已更新本页演示数据，未发布线上。可在作品表单勾选此系列并保存作品。');
  }

  function revokeURL(url) {
    if (objectURLs.delete(url)) URL.revokeObjectURL(url);
  }
  function releaseImages() {
    generation += 1;
    for (const url of objectURLs) URL.revokeObjectURL(url);
    objectURLs.clear();
    pendingFiles.clear();
  }
  function imageNotice(message, workId) {
    if (editingId === workId && ui.permission.value === 'allowed') {
      const notice = ui.admin.querySelector('[data-image-notice]');
      if (notice) notice.textContent = message;
    }
    announce(message);
  }
  function loadLocalImages(input) {
    if (ui.permission.value !== 'allowed') return;
    captureWork();
    const files = Array.from(input.files || []);
    const workId = editingId;
    const epoch = generation;
    input.value = '';
    if (!files.length) return;
    if (ui.network.value !== 'normal') {
      imageNotice('图像读取失败演示：没有添加图片，原表单仍保留。请恢复正常状态后重新选择。', workId);
      return;
    }
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        imageNotice(`未添加 ${file.name}：请选择 PNG、JPEG 或 WebP 图片。`, workId);
        continue;
      }
      let url;
      try { url = URL.createObjectURL(file); }
      catch (_) {
        imageNotice(`无法创建 ${file.name} 的本地预览；没有上传或修改作品。`, workId);
        continue;
      }
      objectURLs.add(url);
      pendingFiles.set(workId, (pendingFiles.get(workId) || 0) + 1);
      imageNotice('正在读取本地图片，未上传。', workId);
      const image = new Image();
      const finish = success => {
        image.onload = null;
        image.onerror = null;
        if (epoch !== generation) return;
        pendingFiles.set(workId, Math.max(0, (pendingFiles.get(workId) || 1) - 1));
        if (!success) {
          revokeURL(url);
          imageNotice(`无法读取 ${file.name}：图片可能已损坏，请另选图片。表单已保留。`, workId);
          return;
        }
        if (editingId === workId) { captureWork(); captureSeries(); }
        const work = draftFor(workId);
        work.images.push({ id: `local-image-${nextLocalImage++}`, src: url, alt: file.name, view: '整体' });
        if (editingId === workId && ui.permission.value === 'allowed') renderAdmin();
        imageNotice(`已添加 ${file.name} 的本页预览，未上传。请确认图像说明、整体/局部、封面与整体展示图后保存。`, workId);
      };
      image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
      image.onerror = () => finish(false);
      image.src = url;
    }
  }

  ui.phone.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !ui.phone.contains(button)) return;
    if (button.hasAttribute('data-close-overlay')) return closeOverlay();
    if (button.dataset.receiver) {
      const fragment = model.workFragment(button.dataset.receiver);
      if (location.hash === fragment) openReceiver(button.dataset.receiver);
      else location.hash = fragment;
      return;
    }
    if (button.dataset.image) return showImage(button.dataset.image, button);
    if (button.dataset.work) return navigate({ page: 'detail', id: button.dataset.work });
    if (button.dataset.series) return navigate({ page: 'series', id: button.dataset.series });
    if (button.dataset.tab) {
      receiverCatalog = null;
      return navigate({ page: button.dataset.tab }, true);
    }
    if (button.dataset.action === 'share') return showShare(button);
    if (button.dataset.action === 'catalogue') return returnToCatalogue();
    if (button.dataset.action === 'recover') return returnToCatalogue(true);
    if (button.dataset.action === 'retry') {
      ui.network.value = 'normal';
      renderMobile();
      ui.content.focus();
      announce('已恢复正常展示情景；没有请求网络。');
    }
  });
  document.addEventListener('keydown', event => {
    if (ui.overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault(); closeOverlay(); }
    if (event.key === 'Tab') {
      const controls = Array.from(ui.overlay.querySelectorAll('button, [href], input, select, textarea, [tabindex="0"]')).filter(node => !node.disabled && !node.hidden);
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !ui.overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !ui.overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  });
  ui.back.addEventListener('click', goBack);
  ui.admin.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.dataset.form === 'work') saveWork(event.target);
    if (event.target.dataset.form === 'series') saveSeries(event.target);
  });
  ui.admin.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.action === 'return-gallery') return returnToCatalogue(true);
    if (button.dataset.action === 'add-record' && ui.permission.value === 'allowed') {
      const work = captureWork();
      captureSeries();
      const image = work.images.find(item => item.id === work.overallImageId);
      work.records.push({ id: `local-record-${nextRecord++}`, stage: '线稿', view: image ? image.view : '整体', caption: '', date: '', imageId: image ? image.id : '' });
      renderAdmin();
      const fields = ui.admin.querySelectorAll('.record-editor select');
      if (fields.length) fields[fields.length - 3].focus();
    }
  });
  ui.admin.addEventListener('change', event => {
    if (event.target.name === 'localImages') loadLocalImages(event.target);
    if (event.target.name === 'seriesEditor') {
      captureWork();
      captureSeries();
      seriesEditingId = event.target.value;
      renderAdmin();
      ui.admin.querySelector('[name="seriesEditor"]').focus();
    }
  });
  ui.work.addEventListener('change', () => {
    captureWork();
    captureSeries();
    editingId = ui.work.value;
    renderAdmin();
  });
  ui.preview.addEventListener('click', () => {
    if (editingId === 'new') return announce('这件作品尚未保存到本页演示数据。请先填写必填内容并保存，再预览。');
    receiverCatalog = null;
    navigate({ page: 'detail', id: editingId });
    announce('预览的是最近一次保存到本页的作品；尚未保存的表单修改不会显示。');
  });
  ui.permission.addEventListener('change', () => { captureWork(); captureSeries(); renderAdmin(); });
  ui.network.addEventListener('change', () => {
    renderMobile();
    announce('展示与保存情景已切换；编辑表单保持不变。此控件不发起真实网络请求。');
  });
  ui.largeType.addEventListener('change', () => document.body.classList.toggle('large-type', ui.largeType.checked));
  ui.reset.addEventListener('click', () => {
    releaseImages();
    catalog = model.createDemoCatalog();
    receiverCatalog = null;
    drafts.clear(); seriesDrafts.clear(); notices.clear();
    editingId = catalog.works[0].id;
    seriesEditingId = catalog.series[0].id;
    ui.network.value = 'normal';
    ui.permission.value = 'allowed';
    ui.largeType.checked = false;
    document.body.classList.remove('large-type');
    renderWorkChoices();
    renderAdmin();
    navigate({ page: 'home' }, true);
    if (location.hash) location.hash = '';
    announce('已重置本页内存演示并释放临时图片；未操作磁盘、服务器或线上作品。');
  });
  window.addEventListener('hashchange', () => {
    const id = model.parseWorkFragment(location.hash);
    if (id) openReceiver(id);
    else if (location.hash) { receiverCatalog = null; navigate({ page: 'detail', id: '' }, true); }
    else { receiverCatalog = null; navigate({ page: 'home' }, true); }
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) releaseImages(); });
  window.addEventListener('unload', releaseImages);
  const initialId = model.parseWorkFragment(location.hash);
  if (location.hash) route = { page: 'detail', id: initialId || '' };
  renderWorkChoices();
  renderAdmin();
  renderMobile();
})();
