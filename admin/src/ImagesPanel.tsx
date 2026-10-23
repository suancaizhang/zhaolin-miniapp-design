import { useRef, useState } from 'react';
import type { GalleryImage, ImageView } from '../../shared/types';
import { ApiError, useMutation } from './api';
import { Feedback, Field, ImagePreview, useOperation } from './ui';

function ImageEditor({ image, refresh }: { image: GalleryImage; refresh: () => Promise<boolean> }) {
  const mutate = useMutation();
  const [edits, setEdits] = useState<Pick<GalleryImage, 'alt' | 'view'> | null>(null);
  const { alt, view } = edits ?? image;
  const operation = useOperation();
  return <article className="image-card">
    <ImagePreview image={image} />
    <p className="muted">{image.width} × {image.height} px · <code>{image.id.slice(0, 8)}</code></p>
    <form onSubmit={event => { event.preventDefault(); void operation.run(async () => {
      const saved = await mutate<GalleryImage>(`/api/admin/images/${image.id}`, 'PUT', { alt, view });
      setEdits({ alt: saved.alt, view: saved.view });
      if (await refresh()) setEdits(null);
    }, '图片说明与视角已保存。'); }}>
      <fieldset disabled={operation.busy}>
        <Field label="图片说明（替代文本）" error={operation.error?.fields.alt}><input required value={alt} onChange={event => { setEdits({ alt: event.target.value, view }); operation.clear(); }} /></Field>
        <Field label="图像视角" error={operation.error?.fields.view}><select value={view} onChange={event => { setEdits({ alt, view: event.target.value as ImageView }); operation.clear(); }}><option>整体</option><option>局部</option></select></Field>
        <Feedback error={operation.error} success={operation.success} />
        <button type="submit">{operation.busy ? '正在保存…' : '保存图片信息'}</button>
        {edits && <button type="button" onClick={() => { if (window.confirm('载入目录中的图片信息会替换当前输入，是否继续？')) { setEdits(null); operation.clear(); } }}>载入图片目录信息</button>}
      </fieldset>
    </form>
  </article>;
}

export function ImagesPanel({ images, refresh }: { images: GalleryImage[]; refresh: () => Promise<boolean> }) {
  const mutate = useMutation();
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const operation = useOperation();
  return <section aria-labelledby="images-title">
    <div className="section-heading"><div><h2 id="images-title">图片素材</h2><p>只上传作者正式交付的图片。上传后请核对说明与整体／局部视角，再到作品中关联。</p></div><span className="count">{images.length} 张</span></div>
    <form className="panel" onSubmit={event => { event.preventDefault(); void operation.run(async () => {
      if (!file) throw new ApiError(422, '请先选择一张图片。');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new ApiError(422, '仅接受 JPEG、PNG 或 WebP 图片，请重新选择。');
      if (file.size > 12 * 1024 * 1024) throw new ApiError(413, '图片超过 12 MiB，请先缩小文件再上传。');
      await mutate<GalleryImage>('/api/admin/images', 'POST', undefined, file);
      setFile(null);
      if (input.current) input.current.value = '';
      await refresh();
    }, '图片已上传并保存到本地服务。请核对下方图片信息，再到作品中选择。'); }}>
      <fieldset disabled={operation.busy}>
        <Field label="选择作者图片" hint="JPEG / PNG / WebP；每次一张，最大 12 MiB、4000 万像素。原图私有保存，公开页面使用处理后的展示图。">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" required onChange={event => { setFile(event.target.files?.[0] ?? null); operation.clear(); }} />
        </Field>
        {file && <p className="muted">已选：{file.name}（{(file.size / 1024 / 1024).toFixed(2)} MiB）</p>}
        <Feedback error={operation.error} success={operation.success} />
        <button type="submit" className="primary">{operation.busy ? '正在上传并处理图片，请稍候…' : '上传图片'}</button>
      </fieldset>
    </form>
    {images.length === 0 ? <p className="empty">暂无图片。请使用上方表单上传；不会自动导入原型图片或笔记配图。</p> : <div className="image-grid">{images.map(image => <ImageEditor key={image.id} image={image} refresh={refresh} />)}</div>}
  </section>;
}
