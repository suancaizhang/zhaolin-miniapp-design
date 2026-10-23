import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, isAbsolute, relative, resolve } from 'node:path';
import { authenticate, constantEqual, readSession, sessionCookie, sessionLifetime, tokenHash } from './accounts.ts';
import { openDatabase, projectRoot, seedSources, transaction } from './database.ts';
import { Gallery } from './gallery.ts';
import { readBody, uploadImage } from './images.ts';
import { HttpError, imageInput, invalid, objectBody, seriesInput, workInput } from './validation.ts';

export interface ApplicationOptions {
  dataDir: string;
  adminDir?: string;
  sourceIndexPath?: string;
  allowedOrigins?: string[];
}

const mimeTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const loopbackHosts: Record<string, true> = { '127.0.0.1': true, localhost: true, '[::1]': true };

function send(response: ServerResponse, status: number, data: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify({ data }));
}
async function jsonBody(request: IncomingMessage): Promise<unknown> {
  if (request.headers['content-type']?.split(';')[0]?.trim().toLowerCase() !== 'application/json') invalid('body', '请使用 application/json。');
  const bytes = await readBody(request, 256 * 1024);
  try { return JSON.parse(bytes.toString('utf8')) as unknown; }
  catch { throw new HttpError(400, 'INVALID_JSON', 'JSON 格式无效。'); }
}

async function serveFile(response: ServerResponse, root: string, file: string, head: boolean, immutable = false): Promise<void> {
  let actual: string;
  try {
    const actualRoot = await realpath(root);
    actual = await realpath(resolve(root, file));
    const within = relative(actualRoot, actual);
    if (!within || within.startsWith('..') || isAbsolute(within) || !(await stat(actual)).isFile()) throw new HttpError(404, 'NOT_FOUND', '文件不存在。');
  } catch {
    throw new HttpError(404, 'NOT_FOUND', '文件不存在。');
  }
  const type = mimeTypes[extname(actual).toLowerCase()];
  if (!type) throw new HttpError(404, 'NOT_FOUND', '文件不存在。');
  const content = await readFile(actual);
  response.writeHead(200, { 'Content-Type': type, 'Content-Length': content.length, 'Cache-Control': immutable ? 'public, max-age=31536000, immutable' : 'no-cache' });
  response.end(head ? undefined : content);
}

export async function createApplication(options: ApplicationOptions): Promise<{ server: Server; close: () => Promise<void> }> {
  const dataDir = resolve(options.dataDir);
  const adminDir = resolve(options.adminDir ?? resolve(projectRoot, 'admin/dist'));
  const origins = new Set(['http://127.0.0.1:8788', 'http://127.0.0.1:5173']);
  for (const origin of options.allowedOrigins ?? []) {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !Object.hasOwn(loopbackHosts, url.hostname) || url.origin !== origin) throw new Error('Additional origins must be exact loopback HTTP origins.');
    origins.add(origin);
  }
  const db = await openDatabase(dataDir);
  try { await seedSources(db, options.sourceIndexPath); } catch (error) { db.close(); throw error; }
  const gallery = new Gallery(db);
  const attempts = new Map<string, { count: number; until: number }>();
  let uploads = 0;
  let closed = false;
  let closing: Promise<void> | undefined;

  const server = createServer({ maxHeaderSize: 16 * 1024, requestTimeout: 30_000, headersTimeout: 10_000 }, (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    response.setHeader('Cache-Control', 'no-store');
    void handle(request, response).catch((error: unknown) => {
      if (response.headersSent || response.destroyed) { response.destroy(); return; }
      const failure = error instanceof HttpError ? error : new HttpError(500, 'INTERNAL_ERROR', '服务暂时无法完成请求，请稍后重试。');
      // Drain framed bodies so an early validation response remains readable by the client.
      if (!request.complete) request.resume();
      response.writeHead(failure.status, { 'Content-Type': 'application/json; charset=utf-8' });
      response.end(JSON.stringify({ error: { code: failure.code, message: failure.message, ...(failure.fields ? { fields: failure.fields } : {}) } }));
    });
  });
  server.keepAliveTimeout = 5000;
  server.maxRequestsPerSocket = 1000;

  async function handle(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const remote = request.socket.remoteAddress;
    if (remote !== '127.0.0.1' && remote !== '::1' && remote !== '::ffff:127.0.0.1') throw new HttpError(403, 'FORBIDDEN_HOST', '仅允许本机访问。');
    let host: URL;
    try { host = new URL(`http://${request.headers.host ?? ''}`); }
    catch { throw new HttpError(403, 'FORBIDDEN_HOST', '主机地址不被允许。'); }
    if (!Object.hasOwn(loopbackHosts, host.hostname) || host.username || host.password || host.pathname !== '/' || host.search || host.hash) throw new HttpError(403, 'FORBIDDEN_HOST', '主机地址不被允许。');
    const address = server.address();
    const boundOrigin = address && typeof address !== 'string' ? `http://127.0.0.1:${address.port}` : '';
    const origin = request.headers.origin;
    if (origin && origin !== boundOrigin && !origins.has(origin)) throw new HttpError(403, 'FORBIDDEN_ORIGIN', '请求来源不被允许。');
    if (origin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Access-Control-Allow-Credentials', 'true');
      response.setHeader('Vary', 'Origin');
    }
    if (request.method === 'OPTIONS') {
      response.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, X-CSRF-Token, X-File-Name', 'Access-Control-Max-Age': '600' });
      response.end();
      return;
    }
    let pathname: string;
    try { pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname); }
    catch { throw new HttpError(400, 'INVALID_URL', '请求路径无效。'); }
    const method = request.method;
    const session = readSession(db, request.headers.cookie);
    const sessionInfo = session ? { user: { username: session.username }, csrfToken: session.csrf_token } : { user: null, csrfToken: null };
    if (method === 'GET' && pathname === '/api/health') { send(response, 200, { status: 'ok' }); return; }
    if (method === 'GET' && pathname === '/api/session') { send(response, 200, sessionInfo); return; }
    if (method === 'POST' && pathname === '/api/session') {
      const key = remote;
      const now = Date.now();
      const previous = attempts.get(key);
      const limit = previous && previous.until > now ? previous : { count: 0, until: now + 15 * 60_000 };
      attempts.set(key, limit);
      if (limit.count >= 10) {
        response.setHeader('Retry-After', Math.ceil((limit.until - now) / 1000));
        throw new HttpError(429, 'AUTH_RATE_LIMIT', '登录尝试过多，请稍后再试。');
      }
      limit.count += 1;
      const body = objectBody(await jsonBody(request));
      if (typeof body.username !== 'string' || body.username.length > 64 || typeof body.password !== 'string' || body.password.length > 256) throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确。');
      if (!await authenticate(db, body.username, body.password)) throw new HttpError(401, 'INVALID_CREDENTIALS', '用户名或密码不正确。');
      attempts.delete(key);
      const token = randomBytes(32).toString('hex');
      const csrfToken = randomBytes(32).toString('hex');
      transaction(db, () => {
        db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
        if (session) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.token_hash);
        db.prepare('INSERT INTO sessions(token_hash,username,csrf_token,expires_at) VALUES(?,?,?,?)').run(tokenHash(token), body.username as string, csrfToken, Date.now() + sessionLifetime);
      });
      response.setHeader('Set-Cookie', `${sessionCookie}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${sessionLifetime / 1000}`);
      send(response, 200, { user: { username: body.username }, csrfToken });
      return;
    }
    if (pathname.startsWith('/api/admin/') || (method === 'DELETE' && pathname === '/api/session')) {
      if (!session) throw new HttpError(401, 'UNAUTHORIZED', '请先登录维护账号。');
      if (method !== 'GET' && method !== 'HEAD') {
        const csrf = request.headers['x-csrf-token'];
        if (typeof csrf !== 'string' || !constantEqual(csrf, session.csrf_token)) throw new HttpError(403, 'INVALID_CSRF', '会话校验失败，请重新登录。');
      }
    }
    if (method === 'DELETE' && pathname === '/api/session' && session) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.token_hash);
      response.setHeader('Set-Cookie', `${sessionCookie}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`);
      response.writeHead(204); response.end(); return;
    }
    if (method === 'GET' && pathname === '/api/catalog') {
      const { works, series } = gallery.catalog(); send(response, 200, { works, series }); return;
    }
    const publicWork = /^\/api\/works\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if (method === 'GET' && publicWork) { send(response, 200, gallery.work(publicWork[1]!)); return; }
    const publicSeries = /^\/api\/series\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if (method === 'GET' && publicSeries) {
      const id = publicSeries[1]!;
      const series = gallery.series(id);
      const works = gallery.catalog().works.filter(work => work.seriesIds.includes(id));
      send(response, 200, { series, works }); return;
    }
    if (method === 'GET' && pathname === '/api/admin/catalog') { send(response, 200, gallery.catalog(true)); return; }
    if (method === 'POST' && pathname === '/api/admin/images') {
      if (uploads >= 2) throw new HttpError(429, 'UPLOAD_BUSY', '正在处理其他图片，请稍后重试。');
      uploads += 1;
      try { send(response, 201, await uploadImage(request, gallery, dataDir)); }
      finally { uploads -= 1; }
      return;
    }
    const adminImage = /^\/api\/admin\/images\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if (method === 'PUT' && adminImage) { send(response, 200, gallery.saveImage(adminImage[1]!, imageInput(await jsonBody(request)))); return; }
    const adminWork = /^\/api\/admin\/works\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if ((method === 'POST' && pathname === '/api/admin/works') || (method === 'PUT' && adminWork)) {
      send(response, method === 'POST' ? 201 : 200, gallery.saveWork(workInput(await jsonBody(request)), adminWork?.[1])); return;
    }
    const adminSeries = /^\/api\/admin\/series\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if ((method === 'POST' && pathname === '/api/admin/series') || (method === 'PUT' && adminSeries)) {
      send(response, method === 'POST' ? 201 : 200, gallery.saveSeries(seriesInput(await jsonBody(request)), adminSeries?.[1])); return;
    }
    const adminSource = /^\/api\/admin\/sources\/([a-zA-Z0-9_-]+)$/.exec(pathname);
    if (method === 'PUT' && adminSource) { send(response, 200, gallery.saveSource(adminSource[1]!, await jsonBody(request))); return; }
    if (pathname === '/api' || pathname.startsWith('/api/')) throw new HttpError(404, 'NOT_FOUND', '接口不存在。');
    const media = /^\/media\/([a-f0-9-]{36})\/(preview|thumb)\.webp$/.exec(pathname);
    if ((method === 'GET' || method === 'HEAD') && media) {
      gallery.image(media[1]!);
      await serveFile(response, resolve(dataDir, 'images'), `${media[1]}/${media[2]}.webp`, method === 'HEAD', true); return;
    }
    if (pathname === '/media' || pathname.startsWith('/media/')) throw new HttpError(404, 'NOT_FOUND', '图片不存在。');
    if (method === 'GET' || method === 'HEAD') {
      if (pathname.includes('\\') || pathname.includes('\0') || pathname.split('/').some(part => part.startsWith('.'))) throw new HttpError(404, 'NOT_FOUND', '页面不存在。');
      const file = pathname === '/' ? 'index.html' : pathname.slice(1);
      await serveFile(response, adminDir, file, method === 'HEAD'); return;
    }
    throw new HttpError(404, 'NOT_FOUND', '接口不存在。');
  }

  function close(): Promise<void> {
    if (closing) return closing;
    if (closed) return Promise.resolve();
    const { promise, resolve: finish, reject } = Promise.withResolvers<void>();
    closing = promise;
    const finishClose = (error?: Error): void => {
      closed = true;
      try { db.close(); } catch (databaseError) { reject(databaseError); return; }
      if (error && (error as NodeJS.ErrnoException).code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
      else finish();
    };
    server.close(finishClose);
    return promise;
  }
  return { server, close };
}
