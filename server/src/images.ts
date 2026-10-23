import { randomUUID } from 'node:crypto';
import { lstat, mkdir, realpath, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { IncomingMessage } from 'node:http';
import sharp from 'sharp';
import type { OutputInfo } from 'sharp';
import type { GalleryImage } from '../../shared/types.ts';
import { Gallery } from './gallery.ts';
import { HttpError, invalid } from './validation.ts';

export async function readBody(request: IncomingMessage, maxBytes: number): Promise<Buffer> {
  const declared = request.headers['content-length'];
  if (declared && Number(declared) > maxBytes) {
    request.resume();
    throw new HttpError(413, 'BODY_TOO_LARGE', '提交内容超过大小限制。');
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) {
      request.resume();
      throw new HttpError(413, 'BODY_TOO_LARGE', '提交内容超过大小限制。');
    }
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, size);
}

export async function uploadImage(request: IncomingMessage, gallery: Gallery, dataDir: string): Promise<GalleryImage> {
  const contentType = request.headers['content-type']?.split(';')[0]?.trim().toLowerCase();
  if (contentType !== 'image/jpeg' && contentType !== 'image/png' && contentType !== 'image/webp') invalid('image', '仅支持 JPEG、PNG、WebP 图片。');
  const encodedName = request.headers['x-file-name'];
  if (typeof encodedName !== 'string') invalid('image', '缺少原始文件名。');
  let name: string;
  try { name = decodeURIComponent(encodedName); } catch { invalid('image', '文件名编码无效。'); }
  name = name.replace(/\\/g, '/').split('/').at(-1)?.replace(/[\u0000-\u001f\u007f]/g, '').trim() ?? '';
  if (!name || name.length > 400) invalid('image', '文件名不能为空或超过 400 字。');
  const bytes = await readBody(request, 12 * 1024 * 1024);
  const jpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if ((contentType === 'image/jpeg' && !jpeg) || (contentType === 'image/png' && !png) || (contentType === 'image/webp' && !webp)) invalid('image', '图片内容与类型不符。');
  let preview: { data: Buffer; info: OutputInfo };
  let thumbnail: Buffer;
  try {
    const original = sharp(bytes, { limitInputPixels: 40_000_000, failOn: 'warning' });
    const metadata = await original.metadata();
    if (!metadata.width || !metadata.height || metadata.width * metadata.height > 40_000_000 || (metadata.pages ?? 1) > 1) invalid('image', '图片必须是单帧静态图片，且不超过 4000 万像素。');
    const pipeline = original.rotate();
    preview = await pipeline.clone().resize({ width: 2400, height: 2400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    thumbnail = await pipeline.clone().resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  } catch (error) {
    if (error instanceof HttpError) throw error;
    invalid('image', '无法读取图片，文件可能损坏或超过 4000 万像素。');
  }
  const id = randomUUID();
  const dataRoot = await realpath(dataDir);
  const imageRoot = resolve(dataRoot, 'images');
  await mkdir(imageRoot, { recursive: true, mode: 0o700 });
  if ((await lstat(imageRoot)).isSymbolicLink() || await realpath(imageRoot) !== imageRoot) {
    throw new HttpError(500, 'INVALID_STORAGE', '图片目录配置无效，请检查本地存储位置。');
  }
  const directory = resolve(imageRoot, id);
  // An exclusive child guarantees that failure cleanup owns this directory.
  await mkdir(directory, { mode: 0o700 });
  try {
    const extension = contentType === 'image/jpeg' ? 'jpg' : contentType === 'image/png' ? 'png' : 'webp';
    await writeFile(resolve(directory, `original.${extension}`), bytes, { flag: 'wx', mode: 0o600 });
    await writeFile(resolve(directory, 'preview.webp'), preview.data, { flag: 'wx', mode: 0o600 });
    await writeFile(resolve(directory, 'thumb.webp'), thumbnail, { flag: 'wx', mode: 0o600 });
    gallery.db.prepare('INSERT INTO images(id,alt,view,width,height) VALUES(?,?,?,?,?)').run(id, name, '整体', preview.info.width, preview.info.height);
  } catch (error) {
    // This UUID directory was created exclusively by this request, not derived from the supplied filename.
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
  return gallery.image(id);
}
