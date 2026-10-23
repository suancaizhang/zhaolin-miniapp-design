import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { DatabaseSync } from 'node:sqlite';
import { openDatabase } from './database.ts';

const scryptOptions = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export function passwordKey(password: string, salt: string): Promise<Buffer> {
  const { promise, resolve, reject } = Promise.withResolvers<Buffer>();
  scrypt(password, salt, 64, scryptOptions, (error, key) => error ? reject(error) : resolve(key));
  return promise;
}

export async function createMaintainer(dataDir: string, username: string, password: string): Promise<void> {
  if (!/^[a-zA-Z0-9_.-]{3,64}$/.test(username)) throw new Error('Username must be 3–64 ASCII letters, numbers, dots, underscores or hyphens.');
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw new Error('Password must contain 12–256 characters.');
  const salt = randomBytes(32).toString('hex');
  const hash = (await passwordKey(password, salt)).toString('hex');
  const db = await openDatabase(dataDir);
  try {
    if (db.prepare('SELECT username FROM maintainers WHERE username = ?').get(username)) throw new Error('Maintainer already exists; no credentials changed.');
    db.prepare('INSERT INTO maintainers(username,salt,password_hash) VALUES(?,?,?)').run(username, salt, hash);
  } finally {
    db.close();
  }
}

export async function authenticate(db: DatabaseSync, username: string, password: string): Promise<boolean> {
  const row = db.prepare('SELECT salt,password_hash FROM maintainers WHERE username = ?').get(username) as { salt: string; password_hash: string } | undefined;
  // Unknown accounts consume the same expensive derivation, without disclosing account existence.
  const actual = await passwordKey(password, row?.salt ?? '0'.repeat(64));
  const expected = row ? Buffer.from(row.password_hash, 'hex') : Buffer.alloc(64);
  return timingSafeEqual(actual, expected) && row !== undefined;
}

export const sessionLifetime = 8 * 60 * 60 * 1000;
export const sessionCookie = 'gallery_session';
export function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
export function constantEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
export interface AuthSession {
  token_hash: string;
  username: string;
  csrf_token: string;
  expires_at: number;
}
export function readSession(db: DatabaseSync, cookie: string | undefined): AuthSession | undefined {
  const token = cookie?.split(';').map(part => part.trim()).find(part => part.startsWith(`${sessionCookie}=`))?.slice(sessionCookie.length + 1);
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return undefined;
  const session = db.prepare('SELECT token_hash,username,csrf_token,expires_at FROM sessions WHERE token_hash = ?').get(tokenHash(token)) as unknown as AuthSession | undefined;
  if (!session) return undefined;
  if (session.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(session.token_hash);
    return undefined;
  }
  return session;
}
