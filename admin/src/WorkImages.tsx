import type { GalleryImage } from '../../shared/types';
import { ImagePreview, ImageSelect } from './ui';

export function WorkImages({ images, imageIds, coverImageId, overallImageId, onImages, onCover, onOverall, errors }: {
  images: GalleryImage[]; imageIds: string[]; coverImageId: string; overallImageId: string;
  onImages: (ids: string[]) => void; onCover: (id: string) => void; onOverall: (id: string) => void; errors: Record<string, string>;
}) {
  const selected = images.filter(image => imageIds.includes(image.id));
  return <fieldset className="section-fieldset">
    <legend>作品图片、封面与整体展示</legend>
    <p className="muted">先勾选属于本作品的图片，再明确指定封面和整体展示图。图片说明与整体／局部视角请在「图片素材」中维护。</p>
    {images.length === 0 ? <p className="empty">还没有图片。请先打开「图片素材」上传正式图片；切换栏目不会丢失本页输入。</p> : <div className="image-choice-grid">{images.map(image => <div className={`image-choice ${imageIds.includes(image.id) ? 'selected' : ''}`} key={image.id}>
      <ImagePreview image={image} />
      <label className="check"><input type="checkbox" checked={imageIds.includes(image.id)} onChange={event => onImages(event.target.checked ? [...imageIds, image.id] : imageIds.filter(id => id !== image.id))} /><span>{image.alt}<small>{image.view} · {image.id.slice(0, 8)}</small></span></label>
    </div>)}</div>}
    {errors.imageIds && <p className="field-error" role="alert">{errors.imageIds}</p>}
    <div className="form-grid">
      <ImageSelect required label="作品封面 *" images={selected} value={coverImageId} onChange={onCover} error={errors.coverImageId} />
      <ImageSelect required label="整体展示图 *" images={selected.filter(image => image.view === '整体')} value={overallImageId} onChange={onOverall} error={errors.overallImageId} />
    </div>
    {overallImageId && !selected.some(image => image.id === overallImageId && image.view === '整体') && <p className="field-error" role="alert">原整体展示图不在已选整体图片中，请重新指定；已有选择不会自动替换。</p>}
    {coverImageId && !selected.some(image => image.id === coverImageId) && <p className="field-error" role="alert">原封面未关联本作品，请重新勾选或指定封面。</p>}
  </fieldset>;
}
