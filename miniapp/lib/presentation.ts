import type { CreationRecord, CreationStage } from '../../shared/types';
import type { GalleryWork } from './local-catalog';

export interface WorkCard {
  id: string;
  title: string;
  coverUrl: string;
  coverAlt: string;
  path: string;
}

export function workCard(work: GalleryWork): WorkCard {
  const image = work.images.find((item) => item.id === work.coverImageId);
  return {
    id: work.id,
    title: work.title,
    coverUrl: image?.thumbUrl || '',
    coverAlt: image?.alt || `${work.title} · 作品封面`,
    path: `/pages/work/index?id=${encodeURIComponent(work.id)}`,
  };
}

export interface RecordView extends CreationRecord {
  url: string;
  alt: string;
}
export interface StageGroup {
  stage: CreationStage;
  records: RecordView[];
}

export function stageGroups(work: GalleryWork): StageGroup[] {
  const images = new Map(work.images.map((image) => [image.id, image]));
  const stages: CreationStage[] = ['线稿', '设色', '完成效果'];
  return stages.map((stage) => ({
    stage,
    records: work.records.filter((record) => record.stage === stage).map((record) => {
      const image = images.get(record.imageId);
      return { ...record, url: image?.url || '', alt: image?.alt || `${work.title} · ${stage} · ${record.view}` };
    }),
  })).filter((group) => group.records.length > 0);
}
