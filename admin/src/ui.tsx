import { cloneElement, isValidElement, useId, useState } from 'react';
import type { ReactNode } from 'react';
import type { GalleryImage } from '../../shared/types';
import { ApiError, asError } from './api';

export function Feedback({ error, success, sessionError = true }: { error: ApiError | null; success?: string; sessionError?: boolean }) {
  return <>
    {error && <div className="notice error" role="alert">
      <strong>{error.status === 401 && sessionError ? '登录已失效，请重新登录后再保存。输入仍保留。' : error.status === 403 ? '请求被拒绝。请使用本机 127.0.0.1 地址，并重新登录后再试。' : error.message}</strong>
      {Object.keys(error.fields).length > 0 && <ul>{Object.entries(error.fields).map(([field, message]) => <li key={field}><code>{field}</code>：{message}</li>)}</ul>}
    </div>}
    {success && <p className="notice" role="status">{success}</p>}
  </>;
}

export function Field({ label, hint, error, children }: { label: string; hint?: string; error?: string; children: ReactNode }) {
  const id = useId();
  const description = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>(children)
    ? cloneElement(children, { id, 'aria-describedby': description, 'aria-invalid': error ? true : undefined })
    : children;
  return <div className="field">
    <label htmlFor={id}><span className="field-label">{label}</span>{control}</label>
    {hint && <small id={`${id}-hint`}>{hint}</small>}
    {error && <small id={`${id}-error`} className="field-error" role="alert">{error}</small>}
  </div>;
}

export function useOperation() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState('');
  async function run(operation: () => Promise<void>, message: string) {
    setBusy(true);
    setError(null);
    setSuccess('');
    try {
      await operation();
      setSuccess(message);
    } catch (cause) {
      setError(asError(cause));
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, success, run, clear: () => { setError(null); setSuccess(''); } };
}

export function ImagePreview({ image }: { image: GalleryImage }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return <div className="image-preview">
    {failed ? <div className="image-failure" role="status"><p>图片加载失败</p><button type="button" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>重试图片</button></div>
      : <a href={image.url} target="_blank" rel="noreferrer" aria-label={`打开展示图：${image.alt}`}><img key={attempt} src={image.thumbUrl} alt={image.alt} loading="lazy" onError={() => setFailed(true)} /></a>}
  </div>;
}

export function ImageSelect({ images, value, onChange, label, required = false, error }: {
  images: GalleryImage[]; value: string; onChange: (value: string) => void; label: string; required?: boolean; error?: string;
}) {
  return <Field label={label} error={error}>
    <select required={required} value={value} onChange={event => onChange(event.target.value)}>
      <option value="">{required ? '请选择图片' : '不指定图片'}</option>
      {images.map(image => <option key={image.id} value={image.id}>{image.alt} · {image.view} · {image.id.slice(0, 8)}</option>)}
    </select>
  </Field>;
}
