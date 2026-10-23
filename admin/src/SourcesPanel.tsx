import { useState } from 'react';
import type { SourceNote, Work } from '../../shared/types';
import { useMutation } from './api';
import { Feedback, Field, useOperation } from './ui';

type SourceInput = Pick<SourceNote, 'workId' | 'recordId' | 'reason'>;

function SourceEditor({ source, works, refresh }: { source: SourceNote; works: Work[]; refresh: () => Promise<boolean> }) {
  const mutate = useMutation();
  const [edits, setEdits] = useState<SourceInput | null>(null);
  const draft = edits ?? { workId: source.workId, recordId: source.recordId, reason: source.reason };
  const records = works.find(work => work.id === draft.workId)?.records ?? [];
  const operation = useOperation();
  function change(patch: Partial<SourceInput>) {
    setEdits({ ...draft, ...patch });
    operation.clear();
  }
  return <article className="panel source-editor">
    <div className="source-heading"><h3>{source.index} · {source.summary}</h3><span className="tag">{source.workId ? source.recordId ? '已对应记录' : '已对应作品' : '待确认'}</span></div>
    <p className="muted">原笔记发布日期：{source.publishedAt} · 笔记 ID：<code>{source.id}</code></p>
    <form onSubmit={event => { event.preventDefault(); void operation.run(async () => {
      const saved = await mutate<SourceNote>(`/api/admin/sources/${source.id}`, 'PUT', draft);
      setEdits({ workId: saved.workId, recordId: saved.recordId, reason: saved.reason });
      if (await refresh()) setEdits(null);
    }, '来源对应与说明已保存。'); }}>
      <fieldset disabled={operation.busy}>
        <div className="form-grid">
          <Field label="对应作品" error={operation.error?.fields.workId}><select value={draft.workId ?? ''} onChange={event => change({ workId: event.target.value || null, recordId: null })}><option value="">暂不归属作品（待确认）</option>{works.map(work => <option key={work.id} value={work.id}>{work.title}</option>)}</select></Field>
          <Field label="对应创作记录（可选）" error={operation.error?.fields.recordId}><select disabled={!draft.workId} value={draft.recordId ?? ''} onChange={event => change({ recordId: event.target.value || null })}><option value="">只对应作品，不指定记录</option>{records.map((record, index) => <option key={record.id} value={record.id}>{index + 1} · {record.stage} · {record.view}{record.caption ? ` · ${record.caption}` : ''}</option>)}</select></Field>
        </div>
        <Field label={draft.workId ? '归属核对说明（可选）' : '待确认原因 *'} hint="索引标题是整理标签，不是作者说明。没有确认依据时保留待确认并说明原因。" error={operation.error?.fields.reason}><textarea required={!draft.workId} maxLength={4000} rows={2} value={draft.reason} onChange={event => change({ reason: event.target.value })} /></Field>
        <Feedback error={operation.error} success={operation.success} />
        <button type="submit">{operation.busy ? '正在保存…' : '保存此条对应'}</button>
      </fieldset>
    </form>
  </article>;
}

export function SourcesPanel({ sources, works, refresh }: { sources: SourceNote[]; works: Work[]; refresh: () => Promise<boolean> }) {
  const mapped = sources.filter(source => source.workId !== null).length;
  return <section aria-labelledby="sources-title">
    <div className="section-heading"><div><h2 id="sources-title">来源核对</h2><p>逐条核对原始 43 篇笔记。笔记发布日期不作为创作日期；没有确认的作品与记录不自动归并。</p></div><span className="count">已对应 {mapped} / {sources.length}</span></div>
    <p className="notice">待确认 {sources.length - mapped} 条。选择作品后可继续指定该作品的记录；改到其他作品会清空原记录选择，需要重新核对。</p>
    {works.length === 0 && <p className="empty">尚无作品可供对应。可以先维护待确认原因，创建作品后再选择归属。</p>}
    {sources.length !== 43 && <p className="notice error" role="alert">当前服务返回 {sources.length} 条来源，预期 43 条。请检查来源索引初始化，不能将缺少的条目视为已核对。</p>}
    {sources.map(source => <SourceEditor key={source.id} source={source} works={works} refresh={refresh} />)}
  </section>;
}
