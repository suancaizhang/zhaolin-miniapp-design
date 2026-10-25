import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { localCatalog } from '../miniapp/lib/local-catalog.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const sourceRoot = resolve(root, 'miniapp');
const config = JSON.parse(await readFile(resolve(root, 'project.config.json'), 'utf8'));
const metadata = JSON.parse(await readFile(resolve(sourceRoot, 'package.json'), 'utf8'));
assert.equal(resolve(root, config.miniprogramRoot), sourceRoot, 'Release must contain only the miniapp source root.');
assert.ok(config.packOptions.include.some(item => item.type === 'folder' && item.value === 'assets/works'), 'Dynamic gallery images must be explicitly included.');
const checkedComponents = new Set();
async function component(path) {
  const target = resolve(sourceRoot, path.replace(/^\//, ''));
  if (checkedComponents.has(target)) return;
  checkedComponents.add(target);
  for (const extension of ['json', 'wxml', 'wxss']) await stat(`${target}.${extension}`);
  const existsJs = await stat(`${target}.js`).then(() => true, () => false);
  if (!existsJs) await stat(`${target}.ts`);
  const definition = JSON.parse(await readFile(`${target}.json`, 'utf8'));
  for (const child of Object.values(definition.usingComponents ?? {})) {
    const childPath = child.startsWith('/') ? child : relative(sourceRoot, resolve(dirname(target), child));
    await component(childPath);
  }
}
const app = JSON.parse(await readFile(resolve(sourceRoot, 'app.json'), 'utf8'));
for (const page of app.pages) await component(page);
for (const path of Object.values(app.usingComponents)) await component(path);
let imageCount = 0;
for (const work of localCatalog.works) {
  for (const image of work.images) {
    for (const path of [image.url, image.thumbUrl]) {
      assert.ok(/^\/assets\/works\/source-\d{2}(?:-thumb)?\.jpg$/.test(path), `Image must be packaged: ${path}`);
      const metadata = await sharp(resolve(sourceRoot, path.slice(1))).metadata();
      assert.equal(metadata.format, 'jpeg', path);
      if (path === image.url) {
        assert.equal(metadata.width, image.width, path);
        assert.equal(metadata.height, image.height, path);
      }
      imageCount += 1;
    }
  }
  assert.ok(/^\/assets\/works\/source-\d{2}-share\.jpg$/.test(work.shareImageUrl));
  const share = await sharp(resolve(sourceRoot, work.shareImageUrl.slice(1))).metadata();
  assert.equal(share.format, 'jpeg');
  assert.equal(share.width * 4, share.height * 5, 'Share cover must be 5:4 without cropping the artwork.');
  imageCount += 1;
}
for (const series of localCatalog.series) {
  assert.ok(localCatalog.works.some(work => work.images.some(image => image.id === series.coverImageId)), `Series cover missing: ${series.id}`);
}
const iconStyle = await readFile(resolve(sourceRoot, 'miniprogram_npm/tdesign-miniprogram/icon/icon.wxss'), 'utf8');
assert.ok(iconStyle.includes('data:font/woff;base64,'), 'The icon font must be packaged.');
assert.ok(!/https?:\/\//.test(iconStyle), 'The icon font must not depend on a remote server.');
const excluded = new Set(['package.json', 'tsconfig.json']);
let sourceBytes = 0;
let fileCount = 0;
let imageAudioBytes = 0;
let largestMediaFile = { path: '', bytes: 0 };
async function countFiles(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) await countFiles(path);
    else if (entry.isFile() && !(directory === sourceRoot && excluded.has(entry.name))) {
      const bytes = (await stat(path)).size;
      sourceBytes += bytes;
      if (/\.(?:png|jpe?g|gif|webp|svg|bmp|avif|mp3|aac|wav|m4a|ogg|flac)$/i.test(entry.name)) {
        imageAudioBytes += bytes;
        if (bytes > largestMediaFile.bytes) largestMediaFile = { path: relative(sourceRoot, path).replaceAll('\\', '/'), bytes };
      }
      fileCount += 1;
    }
  }
}
await countFiles(sourceRoot);
const limitBytes = 2 * 1024 * 1024;
assert.ok(sourceBytes <= limitBytes, `Source package exceeds 2 MiB: ${sourceBytes} bytes.`);
// A conservative source-media budget, separate from WeChat's hard code-package limit.
const mediaBudgetBytes = 200_000;
const report = {
  version: metadata.version, pages: app.pages.length, galleryImages: localCatalog.works.length,
  packagedImages: imageCount, componentDefinitions: checkedComponents.size,
  sourceFiles: fileCount, sourceBytes, limitBytes,
  imageAudioBytes, mediaBudgetBytes, withinMediaBudget: imageAudioBytes <= mediaBudgetBytes, largestMediaFile,
  mediaBudgetScope: 'Image/audio source files; not an observed Developer Tools code-quality scan.',
  scope: 'Source files under miniapp/ only; WeChat compiled upload size still requires Developer Tools verification.',
  serverRequired: false, adminRequired: false, iconFont: 'packaged data URI', shareCovers: 'JPEG 5:4',
};
await mkdir(resolve(root, 'dist'), { recursive: true });
await writeFile(resolve(root, 'dist/miniapp-release-report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
if (imageAudioBytes > mediaBudgetBytes) {
  console.warn(`Image/audio optimization budget exceeded: ${imageAudioBytes} bytes > ${mediaBudgetBytes} bytes. The 2 MiB package-size check is separate.`);
}
