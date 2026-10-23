/* Local design data only. Source-note covers are not author-provided originals. */
const GalleryPrototypeModel = (() => {
  'use strict';
  const STAGES = Object.freeze(['线稿', '设色', '完成效果']);
  const VIEWS = Object.freeze(['整体', '局部']);
  const STATUSES = Object.freeze(['创作中', '已完成']);
  const text = value => typeof value === 'string' ? value.trim() : '';
  const unique = values => [...new Set(values)];
  const assets = '../ui-options/assets/';

  function createDemoCatalog() {
    const examples = [
      ['source-01', '西王母 · 设色', '冠饰、衣纹与青绿底色，保留尚未设色的面部与背光。', 'source-01-xiwangmu.jpg', '灰褐底材上的西王母半身画，已铺青绿、赭褐等底色', ['figures', 'studies'], '01', '设色'],
      ['source-03', '敦煌57窟 · 线稿', '圆背光、冠饰与长披帛，由黑色细线组织。', 'source-03-dunhuang.jpg', '灰白底材上的全身菩萨黑线稿，具有圆背光和长披帛', ['figures'], '03', '线稿'],
      ['source-15', '手势与持物 · 朱线', '一手持装饰器物，腕下祥云以朱红单线勾勒。', 'source-15-hand.jpg', '米黄纸上的朱红线描，手握装饰器物，腕下有祥云', ['hands', 'studies'], '15', '线稿']
    ];
    const works = examples.map(([id, title, description, file, alt, seriesIds, source, stage], index) => ({
      id, title, description, status: '创作中', year: '', material: '', dimensions: '',
      featured: index !== 1, sort: (index + 1) * 10, seriesIds,
      sourceRefs: [`公开笔记 #${source}（封面索引参考，作品归并待确认）`],
      images: [{ id: `${id}-image`, src: assets + file, alt, view: '整体' }],
      coverImageId: `${id}-image`, overallImageId: `${id}-image`,
      records: [{ id: `${id}-record-1`, stage, view: '整体', caption: index === 0 ? '设色观察：青绿底色与衣纹（演示记录，复用参考图）。' : '观察画面中的线条组织（演示记录）。', date: '', imageId: `${id}-image` }]
    }));
    // This demonstrates grouping, not a claim that a verified earlier photograph exists.
    works[0].records.unshift({ id: 'source-01-record-structure', stage: '线稿', view: '整体', caption: '结构观察（演示记录，复用同一设色参考图；非真实线稿照片）。', date: '', imageId: 'source-01-image' });
    return {
      works,
      series: [
        { id: 'figures', name: '壁画人物', description: '从冠饰、衣纹与人物姿态看起。' },
        { id: 'hands', name: '手势与持物', description: '一处手势，一段线条。' },
        { id: 'studies', name: '一笔一线', description: '沿着画面的线条，慢慢欣赏。' }
      ]
    };
  }

  function findWork(catalog, id) {
    return catalog.works.find(work => work.id === id) || null;
  }

  function listWorks(catalog, { seriesId, featuredOnly = false } = {}) {
    return catalog.works.filter(work => (!seriesId || work.seriesIds.includes(seriesId)) && (!featuredOnly || work.featured))
      .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id));
  }

  function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }

  function validateWork(input = {}, catalog) {
    const errors = {};
    const value = {
      title: text(input.title), description: text(input.description), status: text(input.status),
      year: text(input.year), material: text(input.material), dimensions: text(input.dimensions),
      featured: input.featured === true, sort: Number(input.sort),
      seriesIds: unique((Array.isArray(input.seriesIds) ? input.seriesIds : []).map(text).filter(Boolean)),
      sourceRefs: unique((Array.isArray(input.sourceRefs) ? input.sourceRefs : []).map(text).filter(Boolean)),
      images: (Array.isArray(input.images) ? input.images : []).map(image => ({ id: text(image.id), src: text(image.src), alt: text(image.alt), view: text(image.view) })),
      coverImageId: text(input.coverImageId), overallImageId: text(input.overallImageId),
      records: (Array.isArray(input.records) ? input.records : []).map(record => ({ id: text(record.id), stage: text(record.stage), view: text(record.view), caption: text(record.caption), date: text(record.date), imageId: text(record.imageId) }))
    };
    if (!value.title) errors.title = '请填写作品名称。';
    if (!value.description) errors.description = '请填写简短作品说明。';
    if (!STATUSES.includes(value.status)) errors.status = '请选择创作中或已完成。';
    if (input.sort === '' || !Number.isFinite(value.sort)) errors.sort = '请填写有效排序数字，数字越小越靠前。';
    if (value.year && !/^\d{4}$/.test(value.year)) errors.year = '年份请填写四位数字，未知可留空。';
    if (catalog && value.seriesIds.some(id => !catalog.series.some(series => series.id === id))) errors.seriesIds = '所选系列不存在，请重新选择。';
    const imageIds = new Set();
    value.images.forEach((image, index) => {
      if (!image.id || imageIds.has(image.id)) errors.images = '图像标识缺失或重复。';
      imageIds.add(image.id);
      if (!image.src || !(/^(\.\.\/ui-options\/assets\/[a-zA-Z0-9_-]+\.(?:jpg|jpeg|png)|blob:[^\s]+)$/.test(image.src))) errors.images = '图像必须来自本地参考素材或本页临时预览。';
      if (!image.alt) errors[`images.${index}.alt`] = `请填写第 ${index + 1} 张图像的简短说明。`;
      if (!VIEWS.includes(image.view)) errors[`images.${index}.view`] = '请选择图像视角。';
    });
    if (!imageIds.has(value.coverImageId)) errors.coverImageId = '请选择作品封面。';
    const overall = value.images.find(image => image.id === value.overallImageId);
    if (!overall || overall.view !== '整体') errors.overallImageId = '请选择标记为整体的展示图；局部图不能替代整体图。';
    const recordIds = new Set();
    value.records.forEach((record, index) => {
      const key = `records.${index}`;
      if (!record.id || recordIds.has(record.id)) errors[`${key}.id`] = '创作记录标识缺失或重复。';
      recordIds.add(record.id);
      if (!STAGES.includes(record.stage)) errors[`${key}.stage`] = '请选择创作阶段。';
      if (!VIEWS.includes(record.view)) errors[`${key}.view`] = '请选择图像视角。';
      if (!record.caption) errors[`${key}.caption`] = '请填写记录说明。';
      const image = value.images.find(item => item.id === record.imageId);
      if (!image) errors[`${key}.imageId`] = '请选择记录引用的图像。';
      else if (image.view !== record.view) errors[`${key}.view`] = '记录视角应与引用图像一致；请另选图像或调整视角。';
      if (record.date && !validDate(record.date)) errors[`${key}.date`] = '请填写有效的创作日期，未知可留空。';
    });
    return { ok: Object.keys(errors).length === 0, errors, value };
  }

  function nextId(items, prefix) {
    let number = 1;
    while (items.some(item => item.id === `${prefix}-${number}`)) number += 1;
    return `${prefix}-${number}`;
  }

  // Full form replacement. Existing canonical entity identity and stable ID are preserved.
  function saveWork(catalog, id, input) {
    const existing = id ? findWork(catalog, id) : null;
    if (id && !existing) return { ok: false, errors: { form: '这件作品不存在，请返回目录重新选择。' } };
    const result = validateWork(input, catalog);
    if (!result.ok) return { ok: false, errors: result.errors };
    const work = existing || { id: nextId(catalog.works, 'local-work') };
    Object.assign(work, result.value);
    if (!existing) catalog.works.push(work);
    return { ok: true, errors: {}, work };
  }

  function saveSeries(catalog, id, input = {}) {
    const existing = id ? catalog.series.find(series => series.id === id) : null;
    if (id && !existing) return { ok: false, errors: { form: '该系列不存在。' } };
    const name = text(input.name);
    if (!name) return { ok: false, errors: { name: '请填写系列名称。' } };
    const series = existing || { id: nextId(catalog.series, 'local-series') };
    Object.assign(series, { name, description: text(input.description) });
    if (!existing) catalog.series.push(series);
    return { ok: true, errors: {}, series };
  }

  function workFragment(id) {
    return `#work=${encodeURIComponent(id)}`;
  }

  function parseWorkFragment(fragment) {
    if (typeof fragment !== 'string' || !fragment.startsWith('#work=')) return null;
    try {
      return decodeURIComponent(fragment.slice(6)) || null;
    } catch (_) {
      return null;
    }
  }

  return Object.freeze({ STAGES, VIEWS, STATUSES, createDemoCatalog, findWork, listWorks, validateWork, saveWork, saveSeries, workFragment, parseWorkFragment });
})();
