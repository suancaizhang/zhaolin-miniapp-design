import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdminCatalog, SessionInfo } from '../../shared/types';
import { ApiError, MutationContext, asError, request } from './api';
import type { Mutation } from './api';
import { Feedback } from './ui';
import { Login } from './Login';
import { WorksPanel } from './WorksPanel';
import { ImagesPanel } from './ImagesPanel';
import { SeriesPanel } from './SeriesPanel';
import { SourcesPanel } from './SourcesPanel';

type Section = 'works' | 'images' | 'series' | 'sources';
const sections: { id: Section; label: string }[] = [{ id: 'works', label: '作品维护' }, { id: 'images', label: '图片素材' }, { id: 'series', label: '系列维护' }, { id: 'sources', label: '来源核对' }];

export function App() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [booting, setBooting] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<ApiError | null>(null);
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<ApiError | null>(null);
  const [logoutError, setLogoutError] = useState<ApiError | null>(null);
  const [pending, setPending] = useState(0);
  const [active, setActive] = useState<Section>('works');
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++generation.current;
    setLoading(true); setLoadError(null);
    try {
      const data = await request<AdminCatalog>('/api/admin/catalog');
      if (version === generation.current) setCatalog(data);
      return version === generation.current;
    } catch (cause) {
      if (version !== generation.current) return false;
      const error = asError(cause);
      setLoadError(error);
      if (error.status === 401) setSession({ user: null, csrfToken: null });
      return false;
    } finally {
      if (version === generation.current) setLoading(false);
    }
  }, []);

  const restore = useCallback(async () => {
    setBooting(true); setBootstrapError(null);
    try {
      const current = await request<SessionInfo>('/api/session');
      setSession(current);
      if (current.user) await refresh();
    } catch (cause) {
      setBootstrapError(asError(cause));
    } finally {
      setBooting(false);
    }
  }, [refresh]);
  useEffect(() => { void restore(); }, [restore]);

  const mutate: Mutation = async <T,>(path: string, method: 'POST' | 'PUT' | 'DELETE', body?: unknown, file?: File): Promise<T> => {
    if (!session?.user || !session.csrfToken) throw new ApiError(401, '请先登录。');
    setPending(count => count + 1);
    try {
      const headers: Record<string, string> = { 'X-CSRF-Token': session.csrfToken };
      if (file) {
        headers['Content-Type'] = file.type;
        headers['X-File-Name'] = encodeURIComponent(file.name);
      } else if (body !== undefined) headers['Content-Type'] = 'application/json';
      return await request<T>(path, { method, headers, body: file ?? (body === undefined ? undefined : JSON.stringify(body)) });
    } catch (cause) {
      const error = asError(cause);
      if (error.status === 401 || error.status === 403) setSession({ user: null, csrfToken: null });
      throw error;
    } finally {
      setPending(count => count - 1);
    }
  };

  async function logout() {
    if (!window.confirm('退出后本页未保存的输入会清空。确定退出登录？')) return;
    setLogoutError(null);
    try {
      await mutate<void>('/api/session', 'DELETE');
      generation.current += 1;
      setSession({ user: null, csrfToken: null });
      setCatalog(null); setLoadError(null); setLoading(false);
    } catch (cause) {
      setLogoutError(asError(cause));
    }
  }

  if (booting) return <main className="shell"><p className="notice" role="status">正在恢复维护会话…</p></main>;
  if (bootstrapError) return <main className="shell"><h1>无法连接内容维护服务</h1><Feedback error={bootstrapError} /><button onClick={() => void restore()}>重试连接</button></main>;
  return <MutationContext.Provider value={mutate}>
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <main className="shell" id="main-content">
      {!session?.user && <Login expired={catalog !== null} onLogin={current => { setSession(current); setLogoutError(null); void refresh(); }} />}
      <div hidden={!session?.user}>
        <header className="app-header"><div><p className="eyebrow">召麐个人作品馆</p><h1>内容维护</h1><p className="muted">仅限本机运行 · 正式内容共同维护</p></div><div className="session-controls"><span>维护者：{session?.user?.username}</span><button disabled={pending > 0 || loading} onClick={() => void refresh()}>{loading ? '正在刷新…' : '刷新共享目录'}</button><button disabled={pending > 0} onClick={() => void logout()}>退出登录</button></div></header>
        <Feedback error={logoutError} />
        <nav className="section-nav" aria-label="内容维护栏目">{sections.map(section => <button type="button" key={section.id} aria-current={active === section.id ? 'page' : undefined} onClick={() => setActive(section.id)}>{section.label}</button>)}</nav>
        {loading && <p className="notice" role="status">正在读取服务端目录。已有表单输入保留，不会用加载结果覆盖未保存编辑。</p>}
        {loadError && <div><Feedback error={loadError} /><p className="muted">目录未能刷新，当前显示上次读取的内容。保存请求如已成功，不必重复创建；先重试刷新核对结果。</p><button disabled={loading} onClick={() => void refresh()}>重试读取目录</button></div>}
        {catalog && <>
          <div hidden={active !== 'works'}><WorksPanel catalog={catalog} refresh={refresh} /></div>
          <div hidden={active !== 'images'}><ImagesPanel images={catalog.images} refresh={refresh} /></div>
          <div hidden={active !== 'series'}><SeriesPanel series={catalog.series} images={catalog.images} refresh={refresh} /></div>
          <div hidden={active !== 'sources'}><SourcesPanel sources={catalog.sources} works={catalog.works} refresh={refresh} /></div>
        </>}
        <footer>仅录入作者确认的作品和正式素材。浏览器不保存维护会话令牌或表单副本；关闭页面会失去未保存输入。</footer>
      </div>
    </main>
  </MutationContext.Provider>;
}
