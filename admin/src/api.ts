import { createContext, useContext } from 'react';
import type { ApiErrorBody } from '../../shared/types';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { ...init, credentials: 'same-origin', cache: 'no-store' });
  } catch {
    throw new ApiError(0, '无法连接本地服务。请确认服务正在运行；若刚提交过保存，请先刷新目录核对结果，再决定是否重试。当前输入仍保留。');
  }
  if (response.status === 204 && response.ok) return undefined as T;
  let body: { data: T } | ApiErrorBody;
  try {
    body = await response.json();
  } catch {
    throw new ApiError(response.status, '服务未返回有效数据，请确认后台服务和代理配置。当前输入仍保留。');
  }
  if (!response.ok) {
    const detail = 'error' in body ? body.error : null;
    throw new ApiError(response.status, detail?.message || `请求失败（HTTP ${response.status}），请稍后重试。`, detail?.fields);
  }
  if (!('data' in body)) throw new ApiError(response.status, '服务响应缺少数据，请检查服务版本。');
  return body.data;
}

export type Mutation = <T>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown, file?: File) => Promise<T>;
export const MutationContext = createContext<Mutation | null>(null);
export function useMutation(): Mutation {
  const mutation = useContext(MutationContext);
  if (!mutation) throw new Error('Missing authenticated session provider');
  return mutation;
}

export function asError(error: unknown): ApiError {
  return error instanceof ApiError ? error : new ApiError(0, '操作未完成，请重试。当前输入仍保留。');
}
