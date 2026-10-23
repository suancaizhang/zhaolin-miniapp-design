import type { CreationRecord, GalleryImage, SeriesInput, WorkInput } from '../../shared/types.ts';

export class HttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fields?: Record<string, string>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
export function invalid(field: string, message: string): never {
  throw new HttpError(422, 'VALIDATION_ERROR', '请检查填写内容。', { [field]: message });
}
export function objectBody(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) invalid('body', '必须提交 JSON 对象。');
  return value as Record<string, unknown>;
}
export function text(value: unknown, field: string, max: number, required = false): string {
  if (typeof value !== 'string') invalid(field, '必须是文字。');
  const result = value.trim();
  if (result.length > max || (required && !result)) invalid(field, required ? `必填，最多 ${max} 字。` : `最多 ${max} 字。`);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(result)) invalid(field, '不可包含控制字符。');
  return result;
}
function ids(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length > 1000) invalid(field, '必须是最多 1000 项的编号数组。');
  const result = value.map((id: unknown) => text(id, field, 100, true));
  if (new Set(result).size !== result.length) invalid(field, '编号不可重复。');
  return result;
}
function sort(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) invalid('sort', '排序必须是非负整数。');
  return value;
}
export function imageInput(value: unknown): Pick<GalleryImage, 'alt' | 'view'> {
  const body = objectBody(value);
  if (body.view !== '整体' && body.view !== '局部') invalid('view', '请选择整体或局部。');
  return { alt: text(body.alt, 'alt', 400), view: body.view };
}
export function seriesInput(value: unknown): SeriesInput {
  const body = objectBody(value);
  return {
    name: text(body.name, 'name', 120, true), description: text(body.description, 'description', 4000),
    coverImageId: text(body.coverImageId, 'coverImageId', 100), sort: sort(body.sort),
  };
}
export function workInput(value: unknown): WorkInput {
  const body = objectBody(value);
  if (body.status !== '创作中' && body.status !== '已完成') invalid('status', '请选择创作中或已完成。');
  if (typeof body.featured !== 'boolean') invalid('featured', '精选必须为布尔值。');
  if (!Array.isArray(body.records) || body.records.length > 1000) invalid('records', '必须是最多 1000 项的创作记录数组。');
  const records: CreationRecord[] = body.records.map((value: unknown, index: number) => {
    const record = objectBody(value);
    const field = `records.${index}`;
    const id = text(record.id, `${field}.id`, 100, true);
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) invalid(`${field}.id`, '记录编号只能包含字母、数字、下划线或短横线。');
    if (record.stage !== '线稿' && record.stage !== '设色' && record.stage !== '完成效果') invalid(`${field}.stage`, '请选择有效创作阶段。');
    if (record.view !== '整体' && record.view !== '局部') invalid(`${field}.view`, '请选择整体或局部。');
    const date = text(record.date, `${field}.date`, 10);
    if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
      invalid(`${field}.date`, '请填写真实日期 YYYY-MM-DD，未知请留空。');
    }
    return { id, stage: record.stage, view: record.view, caption: text(record.caption, `${field}.caption`, 4000), date, imageId: text(record.imageId, `${field}.imageId`, 100, true) };
  });
  if (new Set(records.map(record => record.id)).size !== records.length) invalid('records', '记录编号不可重复。');
  return {
    title: text(body.title, 'title', 120, true), description: text(body.description, 'description', 4000, true), status: body.status,
    year: text(body.year ?? '', 'year', 100), material: text(body.material ?? '', 'material', 400), dimensions: text(body.dimensions ?? '', 'dimensions', 200),
    featured: body.featured, sort: sort(body.sort), seriesIds: ids(body.seriesIds, 'seriesIds'), imageIds: ids(body.imageIds, 'imageIds'),
    coverImageId: text(body.coverImageId, 'coverImageId', 100, true), overallImageId: text(body.overallImageId, 'overallImageId', 100, true),
    records, sourceRefs: ids(body.sourceRefs, 'sourceRefs'),
  };
}
