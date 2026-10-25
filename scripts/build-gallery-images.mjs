import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifestPath = resolve(root, 'materials/xiaohongshu/sources.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
await mkdir(resolve(root, 'miniapp/assets/works'), { recursive: true });
let packageBytes = 0;
for (const asset of manifest.assets) {
  if (!/^source-\d{2}$/.test(asset.id)) throw new Error('Invalid gallery image ID.');
  const original = await readFile(resolve(root, asset.downloaded.file));
  if (createHash('sha256').update(original).digest('hex') !== asset.downloaded.sha256) {
    throw new Error(`Source image checksum does not match: ${asset.id}`);
  }
  for (const [kind, suffix, options, quality] of [
    ['preview', '', { width: 480, height: 960, fit: 'inside', withoutEnlargement: true }, 62],
    ['thumbnail', '-thumb', { width: 240, height: 320, fit: 'inside', withoutEnlargement: true }, 60],
    ['share', '-share', { width: 320, height: 256, fit: 'contain', background: '#faf8f3' }, 60],
  ]) {
    const { data, info } = await sharp(original).resize(options).jpeg({ quality, mozjpeg: true }).toBuffer({ resolveWithObject: true });
    const file = `miniapp/assets/works/${asset.id}${suffix}.jpg`;
    await writeFile(resolve(root, file), data);
    asset[kind] = { file, width: info.width, height: info.height, bytes: data.length, sha256: createHash('sha256').update(data).digest('hex') };
    packageBytes += data.length;
  }
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
for (const asset of manifest.assets) {
  for (const suffix of ['', '-thumb']) {
    await rm(resolve(root, `miniapp/assets/works/${asset.id}${suffix}.webp`), { force: true });
  }
}
console.log(`Generated ${manifest.assets.length} gallery previews, thumbnails and 5:4 JPEG share covers (${packageBytes} bytes).`);
