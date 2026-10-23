import { useState } from 'react';
import type { SessionInfo } from '../../shared/types';
import { request } from './api';
import { Feedback, Field, useOperation } from './ui';

export function Login({ onLogin, expired = false }: { onLogin: (session: SessionInfo) => void; expired?: boolean }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const operation = useOperation();
  return <section className="login-panel panel" aria-labelledby="login-title">
    <p className="eyebrow">召麐个人作品馆</p>
    <h1 id="login-title">{expired ? '重新登录以继续维护' : '内容维护登录'}</h1>
    <p className="muted">两位维护者使用各自账号，拥有相同的内容维护权限。</p>
    {expired && <p className="notice">会话已失效。尚未保存的编辑保留在本页内存中，重新登录后可继续；请勿刷新或关闭页面。</p>}
    <form onSubmit={event => { event.preventDefault(); void operation.run(async () => {
      const session = await request<SessionInfo>('/api/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      if (!session.user || !session.csrfToken) throw new Error('Missing session');
      setPassword('');
      onLogin(session);
    }, ''); }}>
      <fieldset disabled={operation.busy}>
        <Field label="维护账号"><input name="username" autoComplete="username" required value={username} onChange={event => setUsername(event.target.value)} /></Field>
        <Field label="密码"><input name="password" type="password" autoComplete="current-password" required value={password} onChange={event => setPassword(event.target.value)} /></Field>
        <Feedback error={operation.error} sessionError={false} />
        <button className="primary" type="submit">{operation.busy ? '正在登录…' : '登录'}</button>
      </fieldset>
    </form>
    <aside className="setup-hint"><strong>首次使用还没有维护账号？</strong><p>请在项目目录按运行说明执行人工账号初始化命令，由本人输入账号和密码。本系统不提供默认账号或密码。</p><code>.\scripts\node.ps1 .\scripts\create-maintainer.mjs</code></aside>
  </section>;
}
