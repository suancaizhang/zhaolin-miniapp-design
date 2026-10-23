import { useEffect, useRef, useState } from 'react';
import type { AdminCatalog, CreationRecord, CreativeStatus, Work, WorkInput } from '../../shared/types';
import { ApiError, useMutation } from './api';
import { Feedback, Field, useOperation } from './ui';
import { RecordsEditor } from './RecordsEditor';
import type { RecordDraft } from './RecordsEditor';
import { WorkImages } from './WorkImages';

type WorkDraft = Omit<WorkInput, 'status' | 'sort' | 'records' | 'sourceRefs'> & { status: CreativeStatus | ''; sort: string; records: RecordDraft[] };
const emptyWork: WorkDraft = { title: '', description: '', status: '', year: '', material: '', dimensions: '', featured: false, sort: '', seriesIds: [], imageIds: [], coverImageId: '', overallImageId: '', records: [] };
function draftFromWork(work: Work): WorkDraft {
  const { id: _id, images, sourceRefs: _sources, ...fields } = work;
  return { ...fields, imageIds: images.map(image => image.id), sort: String(work.sort) };
}

export function WorksPanel({ catalog, refresh }: { catalog: AdminCatalog; refresh: () => Promise<boolean> }) {
  const mutate = useMutation();
  const [id, setId] = useState('');
  const [draft, setDraft] = useState<WorkDraft>(emptyWork);
  const [dirty, setDirty] = useState(false);
  const [sourceEdits, setSourceEdits] = useState<Record<string, boolean>>({});
  const [savedRecordIds, setSavedRecordIds] = useState<string[]>([]);
  const operation = useOperation();
  const errors = operation.error?.fields ?? {};
  const observedCatalog = useRef(catalog);
  useEffect(() => {
    if (observedCatalog.current === catalog) return;
    observedCatalog.current = catalog;
    if (dirty || !id) return;
    const work = catalog.works.find(item => item.id === id);
    if (work) {
      setDraft(draftFromWork(work));
      setSavedRecordIds(work.records.map(record => record.id));
      setSourceEdits({});
    }
  }, [catalog, dirty, id]);
  // Source mappings are canonical in the current catalog; only explicit local toggles override them.
  const sourceRefs = catalog.sources.filter(source => sourceEdits[source.id] ?? (id !== '' && source.workId === id)).map(source => source.id);
  function change<K extends keyof WorkDraft>(field: K, value: WorkDraft[K]) {
    setDraft(current => ({ ...current, [field]: value }));
    setDirty(true);
    operation.clear();
  }
  function select(value: string) {
    if (dirty && !window.confirm('当前作品有未保存的输入。切换会放弃这些输入，是否继续？')) return;
    const work = catalog.works.find(item => item.id === value);
    setId(value);
    setDraft(work ? draftFromWork(work) : emptyWork);
    setSavedRecordIds(work?.records.map(record => record.id) ?? []);
    setSourceEdits({}); setDirty(false); operation.clear();
  }
  return <section aria-labelledby="works-title">
    <div className="section-heading"><div><h2 id="works-title">作品维护</h2><p>保存后直接更新共享内容。创作状态不代表公开／隐藏；两位维护者读取同一份作品。</p></div><span className="count">{catalog.works.length} 件</span></div>
    <div className="panel">
      <Field label="选择编辑对象"><select disabled={operation.busy} value={id} onChange={event => select(event.target.value)}><option value="">新建作品</option>{catalog.works.map(work => <option key={work.id} value={work.id}>{work.title} · {work.status}</option>)}</select></Field>
      {id && <button type="button" disabled={operation.busy || !catalog.works.some(work => work.id === id)} onClick={() => select(id)}>载入此作品的目录内容</button>}
      {catalog.works.length === 0 && <p className="empty">目录为空。先上传正式图片，再填写下方必填项，即可创建第一件作品。没有默认作品或补造的资料。</p>}
      <form onSubmit={event => { event.preventDefault(); void operation.run(async () => {
        if (!draft.status) throw new ApiError(422, '请选择真实的创作状态。', { status: '请选择创作中或已完成。' });
        if (draft.records.some(record => !record.stage || !record.view)) throw new ApiError(422, '请为每条创作记录选择阶段与图像视角。');
        const body: WorkInput = { ...draft, status: draft.status, sort: Number(draft.sort), records: draft.records as CreationRecord[], sourceRefs };
        const saved = await mutate<Work>(id ? `/api/admin/works/${id}` : '/api/admin/works', id ? 'PUT' : 'POST', body);
        setId(saved.id); setDraft(draftFromWork(saved)); setSavedRecordIds(saved.records.map(record => record.id));
        setSourceEdits(Object.fromEntries(catalog.sources.map(source => [source.id, saved.sourceRefs.includes(source.id)])));
        setDirty(false);
        if (await refresh()) setSourceEdits({});
      }, '作品已保存到本地服务。共享目录会读取此次保存的内容。'); }}>
        <fieldset disabled={operation.busy}>
          <fieldset className="section-fieldset"><legend>作品资料</legend>
            <div className="form-grid">
              <Field label="作品名称 *" error={errors.title}><input required maxLength={120} value={draft.title} onChange={event => change('title', event.target.value)} /></Field>
              <Field label="创作状态 *" error={errors.status}><select required value={draft.status} onChange={event => change('status', event.target.value as WorkDraft['status'])}><option value="">请选择真实状态</option><option>创作中</option><option>已完成</option></select></Field>
            </div>
            <Field label="简短说明 *" hint="使用作者确认的正式说明；不把来源索引摘要当作作者原话。" error={errors.description}><textarea required maxLength={4000} rows={4} value={draft.description} onChange={event => change('description', event.target.value)} /></Field>
            <div className="form-grid three">
              <Field label="创作年份（可选）" error={errors.year}><input value={draft.year} onChange={event => change('year', event.target.value)} /></Field>
              <Field label="材料（可选）" error={errors.material}><input value={draft.material} onChange={event => change('material', event.target.value)} /></Field>
              <Field label="尺寸（可选）" error={errors.dimensions}><input value={draft.dimensions} onChange={event => change('dimensions', event.target.value)} /></Field>
            </div>
            <p className="muted">缺少可靠资料时留空，不补写推测值。</p>
          </fieldset>
          <WorkImages images={catalog.images} imageIds={draft.imageIds} coverImageId={draft.coverImageId} overallImageId={draft.overallImageId} onImages={value => change('imageIds', value)} onCover={value => change('coverImageId', value)} onOverall={value => change('overallImageId', value)} errors={errors} />
          <RecordsEditor records={draft.records} images={catalog.images.filter(image => draft.imageIds.includes(image.id))} savedIds={savedRecordIds} onChange={value => change('records', value)} errors={errors} />
          <fieldset className="section-fieldset"><legend>系列与精选</legend>
            {catalog.series.length === 0 ? <p className="empty">暂无系列。可在「系列维护」新建，也可以不选择系列。</p> : <div className="check-list">{catalog.series.map(series => <label className="check" key={series.id}><input type="checkbox" checked={draft.seriesIds.includes(series.id)} onChange={event => change('seriesIds', event.target.checked ? [...draft.seriesIds, series.id] : draft.seriesIds.filter(value => value !== series.id))} /><span>{series.name}</span></label>)}</div>}
            {errors.seriesIds && <p className="field-error" role="alert">{errors.seriesIds}</p>}
            <label className="check"><input type="checkbox" checked={draft.featured} onChange={event => change('featured', event.target.checked)} /><span>作为首页精选作品</span></label>
            <Field label="作品排列顺序 *" hint="非负整数，数字越小越靠前；同值按稳定 ID 排列。" error={errors.sort}><input type="number" required min={0} step={1} value={draft.sort} onChange={event => change('sort', event.target.value)} /></Field>
          </fieldset>
          <fieldset className="section-fieldset"><legend>来源引用核对</legend>
            <p className="muted">勾选已确认属于本作品的笔记。已归属其他作品的来源请在「来源核对」转移；具体记录与待确认原因也在那里维护。43 篇笔记不等于 43 件作品。</p>
            {catalog.sources.length === 0 ? <p className="empty">服务未返回来源索引，请检查来源初始化并刷新目录。</p> : <div className="source-check-list">{catalog.sources.map(source => <label className="check" key={source.id}><input type="checkbox" disabled={source.workId !== null && source.workId !== id} checked={sourceRefs.includes(source.id)} onChange={event => { setSourceEdits(current => ({ ...current, [source.id]: event.target.checked })); setDirty(true); operation.clear(); }} /><span>{source.index} · {source.summary}<small>{source.workId !== null && source.workId !== id ? '已归属其他作品' : source.recordId ? '已对应创作记录' : source.workId ? '已对应作品' : '待确认'}</small></span></label>)}</div>}
            {errors.sourceRefs && <p className="field-error" role="alert">{errors.sourceRefs}</p>}
          </fieldset>
          {id && <p className="muted">稳定 ID：<code>{id}</code> · <a href={`/api/works/${id}`} target="_blank" rel="noreferrer">查看已保存的公开数据</a></p>}
          <Feedback error={operation.error} success={operation.success} />
          <div className="actions save-bar"><button type="submit" className="primary">{operation.busy ? '正在保存…' : id ? '保存作品' : '创建作品'}</button>{dirty && <span className="muted">有未保存的输入，切换栏目会保留</span>}</div>
        </fieldset>
      </form>
    </div>
  </section>;
}
