import { useEffect, useRef, useState } from 'react';
import type { GalleryImage, GallerySeries, SeriesInput } from '../../shared/types';
import { useMutation } from './api';
import { Feedback, Field, ImageSelect, useOperation } from './ui';

type SeriesDraft = Omit<SeriesInput, 'sort'> & { sort: string };
const emptySeries: SeriesDraft = { name: '', description: '', coverImageId: '', sort: '' };

export function SeriesPanel({ series, images, refresh }: { series: GallerySeries[]; images: GalleryImage[]; refresh: () => Promise<boolean> }) {
  const mutate = useMutation();
  const [id, setId] = useState('');
  const [draft, setDraft] = useState<SeriesDraft>(emptySeries);
  const [dirty, setDirty] = useState(false);
  const operation = useOperation();
  const observedSeries = useRef(series);
  useEffect(() => {
    if (observedSeries.current === series) return;
    observedSeries.current = series;
    if (dirty || !id) return;
    const item = series.find(entry => entry.id === id);
    if (item) setDraft({ name: item.name, description: item.description, coverImageId: item.coverImageId, sort: String(item.sort) });
  }, [series, dirty, id]);
  function select(value: string) {
    if (dirty && !window.confirm('当前系列有未保存的输入。切换会放弃这些输入，是否继续？')) return;
    const item = series.find(entry => entry.id === value);
    setId(value);
    setDraft(item ? { name: item.name, description: item.description, coverImageId: item.coverImageId, sort: String(item.sort) } : emptySeries);
    setDirty(false);
    operation.clear();
  }
  function change<K extends keyof SeriesDraft>(field: K, value: SeriesDraft[K]) {
    setDraft(current => ({ ...current, [field]: value }));
    setDirty(true);
    operation.clear();
  }
  return <section aria-labelledby="series-title">
    <div className="section-heading"><div><h2 id="series-title">系列维护</h2><p>系列只引用作品，改名不会改变作品入口。同一作品可属于多个系列。</p></div><span className="count">{series.length} 个</span></div>
    <div className="panel">
      <Field label="选择编辑对象"><select disabled={operation.busy} value={id} onChange={event => select(event.target.value)}><option value="">新建系列</option>{series.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
      {id && <button type="button" disabled={operation.busy || !series.some(item => item.id === id)} onClick={() => select(id)}>载入此系列的目录内容</button>}
      {series.length === 0 && <p className="empty">还没有系列，可在下方创建。作品也可以暂不归入任何系列。</p>}
      <form onSubmit={event => { event.preventDefault(); void operation.run(async () => {
        const body: SeriesInput = { ...draft, sort: Number(draft.sort) };
        const saved = await mutate<GallerySeries>(id ? `/api/admin/series/${id}` : '/api/admin/series', id ? 'PUT' : 'POST', body);
        setId(saved.id);
        setDraft({ name: saved.name, description: saved.description, coverImageId: saved.coverImageId, sort: String(saved.sort) });
        setDirty(false);
        await refresh();
      }, '系列已保存到本地服务。其他维护者刷新目录后可读取相同内容。'); }}>
        <fieldset disabled={operation.busy}>
          <Field label="系列名称 *" error={operation.error?.fields.name}><input required maxLength={120} value={draft.name} onChange={event => change('name', event.target.value)} /></Field>
          <Field label="系列说明" error={operation.error?.fields.description}><textarea maxLength={4000} rows={4} value={draft.description} onChange={event => change('description', event.target.value)} /></Field>
          <div className="form-grid">
            <ImageSelect label="系列封面（可选）" images={images} value={draft.coverImageId} onChange={value => change('coverImageId', value)} error={operation.error?.fields.coverImageId} />
            <Field label="排列顺序 *" hint="非负整数，数字越小越靠前；相同顺序按稳定 ID 排列。" error={operation.error?.fields.sort}><input type="number" required min={0} step={1} value={draft.sort} onChange={event => change('sort', event.target.value)} /></Field>
          </div>
          {id && <p className="muted">稳定 ID：<code>{id}</code></p>}
          <Feedback error={operation.error} success={operation.success} />
          <div className="actions"><button type="submit" className="primary">{operation.busy ? '正在保存…' : id ? '保存系列' : '创建系列'}</button>{dirty && <span className="muted">有未保存的输入</span>}</div>
        </fieldset>
      </form>
    </div>
  </section>;
}
