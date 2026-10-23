import type { CreationRecord, CreationStage, GalleryImage, ImageView } from '../../shared/types';
import { Field, ImageSelect } from './ui';

export type RecordDraft = Omit<CreationRecord, 'stage' | 'view'> & { stage: CreationStage | ''; view: ImageView | '' };

export function RecordsEditor({ records, images, savedIds, onChange, errors }: {
  records: RecordDraft[]; images: GalleryImage[]; savedIds: string[]; onChange: (records: RecordDraft[]) => void; errors: Record<string, string>;
}) {
  function update(index: number, patch: Partial<RecordDraft>) {
    onChange(records.map((record, position) => position === index ? { ...record, ...patch } : record));
  }
  function move(index: number, offset: number) {
    const ordered = [...records];
    const target = index + offset;
    [ordered[index], ordered[target]] = [ordered[target]!, ordered[index]!];
    onChange(ordered);
  }
  return <fieldset className="section-fieldset">
    <legend>创作记录</legend>
    <p className="muted">阶段与视角分别维护。记录按这里的顺序保存；创作日期无可靠依据时留空，不使用笔记发布日期代替。</p>
    {records.length === 0 && <p className="empty">尚无创作记录。可先保存作品，之后补充已确认的过程。</p>}
    {records.map((record, index) => <div className="record-editor" key={record.id}>
      <div className="record-heading"><h3>记录 {index + 1}</h3><div className="actions">
        <button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`记录 ${index + 1} 上移`}>上移</button>
        <button type="button" disabled={index === records.length - 1} onClick={() => move(index, 1)} aria-label={`记录 ${index + 1} 下移`}>下移</button>
        {!savedIds.includes(record.id) && <button type="button" onClick={() => onChange(records.filter(item => item.id !== record.id))}>取消本次新增</button>}
      </div></div>
      <div className="form-grid">
        <Field label="创作阶段 *" error={errors[`records.${index}.stage`]}><select required value={record.stage} onChange={event => update(index, { stage: event.target.value as RecordDraft['stage'] })}><option value="">请选择阶段</option><option>线稿</option><option>设色</option><option>完成效果</option></select></Field>
        <Field label="图像视角 *" error={errors[`records.${index}.view`]}><select required value={record.view} onChange={event => update(index, { view: event.target.value as RecordDraft['view'] })}><option value="">请选择视角</option><option>整体</option><option>局部</option></select></Field>
        <ImageSelect required label="记录图片 *" images={images} value={record.imageId} onChange={value => update(index, { imageId: value })} error={errors[`records.${index}.imageId`]} />
        <Field label="可靠的创作日期（可选）" error={errors[`records.${index}.date`]}><input type="date" value={record.date} onChange={event => update(index, { date: event.target.value })} /></Field>
      </div>
      <Field label="记录说明" error={errors[`records.${index}.caption`]}><textarea rows={3} maxLength={4000} value={record.caption} onChange={event => update(index, { caption: event.target.value })} /></Field>
    </div>)}
    <button type="button" onClick={() => onChange([...records, { id: crypto.randomUUID(), stage: '', view: '', caption: '', date: '', imageId: '' }])}>新增创作记录</button>
  </fieldset>;
}
