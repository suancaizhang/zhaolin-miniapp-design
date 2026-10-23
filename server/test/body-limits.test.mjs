import assert from 'node:assert/strict';
import test from 'node:test';
import { request } from 'node:http';
import { randomBytes } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApplication } from '../src/app.ts';
import { createMaintainer } from '../src/accounts.ts';

test('oversized declared JSON, chunked JSON and images return readable 413 errors without saving content', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'zhaolin-body-limits-'));
  let application;
  t.after(async () => {
    if (application) await application.close();
    await rm(dataDir, { recursive: true, force: true });
  });
  const username = 'test_' + randomBytes(6).toString('hex');
  const password = randomBytes(24).toString('base64url');
  await createMaintainer(dataDir, username, password);
  application = await createApplication({ dataDir });
  await new Promise((resolve, reject) => {
    application.server.once('error', reject);
    application.server.listen(0, '127.0.0.1', resolve);
  });
  const base = `http://127.0.0.1:${application.server.address().port}`;
  // Parse failure followed by early size rejection used to reset fetch's connection.
  const invalid = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{invalid' });
  assert.equal(invalid.status, 400);
  await invalid.json();
  const oversized = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: ' '.repeat(256 * 1024 + 1) });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'BODY_TOO_LARGE');
  const streamed = await new Promise((resolve, reject) => {
    const outgoing = request(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Transfer-Encoding': 'chunked' } }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('error', reject);
      response.on('end', () => resolve({ status: response.statusCode, body: JSON.parse(Buffer.concat(chunks).toString('utf8')) }));
    });
    outgoing.on('error', reject);
    outgoing.write(Buffer.alloc(256 * 1024, 32));
    outgoing.end(' ');
  });
  assert.equal(streamed.status, 413);
  assert.equal(streamed.body.error.code, 'BODY_TOO_LARGE');
  const login = await fetch(base + '/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
  assert.equal(login.status, 200);
  const session = (await login.json()).data;
  const cookie = login.headers.get('set-cookie').split(';')[0];
  const image = await fetch(base + '/api/admin/images', {
    method: 'POST',
    headers: { Cookie: cookie, 'X-CSRF-Token': session.csrfToken, 'Content-Type': 'image/png', 'X-File-Name': 'oversized.png' },
    body: Buffer.alloc(12 * 1024 * 1024 + 1),
  });
  assert.equal(image.status, 413);
  assert.equal((await image.json()).error.code, 'BODY_TOO_LARGE');
  const catalog = await fetch(base + '/api/admin/catalog', { headers: { Cookie: cookie } });
  assert.equal(catalog.status, 200);
  const saved = (await catalog.json()).data;
  assert.deepEqual(saved.works, []);
  assert.deepEqual(saved.series, []);
  assert.deepEqual(saved.images, []);
});
