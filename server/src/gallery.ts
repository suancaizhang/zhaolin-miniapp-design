import { randomUUID } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import type { AdminCatalog, CreationRecord, GalleryImage, GallerySeries, SeriesInput, SourceNote, Work, WorkInput } from '../../shared/types.ts';
import { pendingReason, transaction } from './database.ts';
import { HttpError, invalid, objectBody, text } from './validation.ts';

interface ImageRow { id: string; alt: string; view: GalleryImage['view']; width: number; height: number }
interface WorkRow {
  id: string; title: string; description: string; status: Work['status']; year: string; material: string;
  dimensions: string; featured: number; sort: number; cover_image_id: string; overall_image_id: string;
}
interface SeriesRow { id: string; name: string; description: string; cover_image_id: string | null; sort: number }
interface SourceRow { id: string; source_index: string; published_at: string; summary: string; work_id: string | null; record_id: string | null; reason: string }

export class Gallery {
  readonly db: DatabaseSync;
  constructor(db: DatabaseSync) { this.db = db; }

  image(id: string): GalleryImage {
    const row = this.db.prepare('SELECT id,alt,view,width,height FROM images WHERE id = ?').get(id) as unknown as ImageRow | undefined;
    if (!row) throw new HttpError(404, 'NOT_FOUND', '图片不存在。');
    return { ...row, url: `/media/${row.id}/preview.webp`, thumbUrl: `/media/${row.id}/thumb.webp` };
  }

  series(id: string): GallerySeries {
    const row = this.db.prepare('SELECT * FROM series WHERE id = ?').get(id) as unknown as SeriesRow | undefined;
    if (!row) throw new HttpError(404, 'NOT_FOUND', '系列不存在。');
    return { id: row.id, name: row.name, description: row.description, coverImageId: row.cover_image_id ?? '', sort: row.sort };
  }

  source(id: string): SourceNote {
    const row = this.db.prepare('SELECT * FROM sources WHERE id = ?').get(id) as unknown as SourceRow | undefined;
    if (!row) throw new HttpError(404, 'NOT_FOUND', '来源记录不存在。');
    return { id: row.id, index: row.source_index, publishedAt: row.published_at, summary: row.summary, workId: row.work_id, recordId: row.record_id, reason: row.reason };
  }

  work(id: string, includeSources = false): Work {
    const row = this.db.prepare('SELECT * FROM works WHERE id = ?').get(id) as unknown as WorkRow | undefined;
    if (!row) throw new HttpError(404, 'NOT_FOUND', '作品不存在。');
    const imageRows = this.db.prepare('SELECT image_id FROM work_images WHERE work_id = ? ORDER BY position').all(id) as { image_id: string }[];
    const seriesRows = this.db.prepare('SELECT series_id FROM work_series WHERE work_id = ? ORDER BY position').all(id) as { series_id: string }[];
    const records = this.db.prepare('SELECT id,stage,view,caption,date,image_id AS imageId FROM records WHERE work_id = ? ORDER BY position').all(id) as unknown as CreationRecord[];
    const sources = includeSources ? this.db.prepare('SELECT id FROM sources WHERE work_id = ? ORDER BY source_index,id').all(id) as { id: string }[] : [];
    return {
      id: row.id, title: row.title, description: row.description, status: row.status, year: row.year,
      material: row.material, dimensions: row.dimensions, featured: row.featured === 1, sort: row.sort,
      coverImageId: row.cover_image_id, overallImageId: row.overall_image_id,
      images: imageRows.map(image => this.image(image.image_id)), seriesIds: seriesRows.map(series => series.series_id),
      records, sourceRefs: sources.map(source => source.id),
    };
  }

  catalog(admin = false): AdminCatalog {
    const works = this.db.prepare('SELECT id FROM works ORDER BY sort,id').all() as { id: string }[];
    const series = this.db.prepare('SELECT id FROM series ORDER BY sort,id').all() as { id: string }[];
    const images = admin ? this.db.prepare('SELECT id FROM images ORDER BY rowid').all() as { id: string }[] : [];
    const sources = admin ? this.db.prepare('SELECT id FROM sources ORDER BY source_index,id').all() as { id: string }[] : [];
    return { works: works.map(row => this.work(row.id, admin)), series: series.map(row => this.series(row.id)), images: images.map(row => this.image(row.id)), sources: sources.map(row => this.source(row.id)) };
  }

  saveImage(id: string, input: Pick<GalleryImage, 'alt' | 'view'>): GalleryImage {
    this.image(id);
    if (input.view !== '整体' && this.db.prepare('SELECT id FROM works WHERE overall_image_id = ? LIMIT 1').get(id)) {
      invalid('view', '这张图片正在作为作品整体图使用，请先为作品选择其他整体图。');
    }
    this.db.prepare('UPDATE images SET alt = ?,view = ? WHERE id = ?').run(input.alt, input.view, id);
    return this.image(id);
  }

  saveSeries(input: SeriesInput, existingId?: string): GallerySeries {
    if (existingId) this.series(existingId);
    if (input.coverImageId && !this.db.prepare('SELECT id FROM images WHERE id = ?').get(input.coverImageId)) invalid('coverImageId', '请选择已上传图片。');
    const id = existingId ?? randomUUID();
    this.db.prepare(`INSERT INTO series(id,name,description,cover_image_id,sort) VALUES(?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name,description=excluded.description,cover_image_id=excluded.cover_image_id,sort=excluded.sort`)
      .run(id, input.name, input.description, input.coverImageId || null, input.sort);
    return this.series(id);
  }

  saveWork(input: WorkInput, existingId?: string): Work {
    const id = existingId ?? randomUUID();
    if (existingId) this.work(id, true);
    const findImage = this.db.prepare('SELECT view FROM images WHERE id = ?');
    const imageIds = new Set(input.imageIds);
    for (const imageId of input.imageIds) if (!findImage.get(imageId)) invalid('imageIds', '包含不存在的图片。');
    if (!imageIds.has(input.coverImageId)) invalid('coverImageId', '封面必须来自本作品图片。');
    if (!imageIds.has(input.overallImageId) || findImage.get(input.overallImageId)?.view !== '整体') invalid('overallImageId', '必须选择本作品的整体图片。');
    const findSeries = this.db.prepare('SELECT id FROM series WHERE id = ?');
    for (const seriesId of input.seriesIds) if (!findSeries.get(seriesId)) invalid('seriesIds', '包含不存在的系列。');
    for (const record of input.records) if (!imageIds.has(record.imageId)) invalid('records', '每条记录必须使用本作品图片。');
    const recordIds = new Set(input.records.map(record => record.id));
    const selectedSources = new Set(input.sourceRefs);
    const findSource = this.db.prepare('SELECT work_id,record_id FROM sources WHERE id = ?');
    for (const sourceId of input.sourceRefs) {
      const source = findSource.get(sourceId) as { work_id: string | null; record_id: string | null } | undefined;
      if (!source) invalid('sourceRefs', '来源编号不存在。');
      if (source.work_id && source.work_id !== id) invalid('sourceRefs', '来源已经属于其他作品，请在来源页调整归属。');
      if (source.record_id && !recordIds.has(source.record_id)) invalid('records', '来源仍关联此记录，请先在来源页调整关联。');
    }
    return transaction(this.db, () => {
      this.db.prepare(`INSERT INTO works(id,title,description,status,year,material,dimensions,featured,sort,cover_image_id,overall_image_id)
        VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,status=excluded.status,
        year=excluded.year,material=excluded.material,dimensions=excluded.dimensions,featured=excluded.featured,sort=excluded.sort,
        cover_image_id=excluded.cover_image_id,overall_image_id=excluded.overall_image_id`)
        .run(id, input.title, input.description, input.status, input.year, input.material, input.dimensions, input.featured ? 1 : 0, input.sort, input.coverImageId, input.overallImageId);
      const previousSources = this.db.prepare('SELECT id FROM sources WHERE work_id = ?').all(id) as { id: string }[];
      const unmap = this.db.prepare('UPDATE sources SET work_id=NULL,record_id=NULL,reason=? WHERE id=?');
      for (const source of previousSources) if (!selectedSources.has(source.id)) unmap.run(pendingReason, source.id);
      this.db.prepare('DELETE FROM work_images WHERE work_id = ?').run(id);
      this.db.prepare('DELETE FROM work_series WHERE work_id = ?').run(id);
      this.db.prepare('DELETE FROM records WHERE work_id = ?').run(id);
      const addImage = this.db.prepare('INSERT INTO work_images(work_id,image_id,position) VALUES(?,?,?)');
      input.imageIds.forEach((imageId, position) => addImage.run(id, imageId, position));
      const addSeries = this.db.prepare('INSERT INTO work_series(work_id,series_id,position) VALUES(?,?,?)');
      input.seriesIds.forEach((seriesId, position) => addSeries.run(id, seriesId, position));
      const addRecord = this.db.prepare('INSERT INTO records(work_id,id,stage,view,caption,date,image_id,position) VALUES(?,?,?,?,?,?,?,?)');
      input.records.forEach((record, position) => addRecord.run(id, record.id, record.stage, record.view, record.caption, record.date, record.imageId, position));
      const map = this.db.prepare('UPDATE sources SET work_id=?,reason=CASE WHEN work_id IS NULL THEN \'\' ELSE reason END WHERE id=?');
      for (const sourceId of input.sourceRefs) map.run(id, sourceId);
      return this.work(id, true);
    });
  }

  saveSource(id: string, value: unknown): SourceNote {
    this.source(id);
    const body = objectBody(value);
    const workId = body.workId === null ? null : text(body.workId, 'workId', 100, true);
    const recordId = body.recordId === null ? null : text(body.recordId, 'recordId', 100, true);
    const reason = text(body.reason, 'reason', 4000, workId === null);
    if (workId === null && recordId !== null) invalid('recordId', '未归属作品时不可关联创作记录。');
    if (workId !== null && !this.db.prepare('SELECT id FROM works WHERE id = ?').get(workId)) invalid('workId', '作品不存在。');
    if (recordId !== null && !this.db.prepare('SELECT id FROM records WHERE work_id = ? AND id = ?').get(workId, recordId)) invalid('recordId', '记录不属于所选作品。');
    this.db.prepare('UPDATE sources SET work_id=?,record_id=?,reason=? WHERE id=?').run(workId, recordId, reason, id);
    return this.source(id);
  }
}
