/* Cross-site account connection for the owner's GitHub Pages frontend. */
(function () {
  const backend = 'https://find-my-block-bhs.zengxuanwen.chatgpt.site';
  const pagesOrigin = 'https://zxw20110119-rgb.github.io';
  const storageKey = 'fmb-github-session-v1';
  let session = null, pending = null, generation = 0;
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    if (saved && typeof saved.accessToken === 'string' && saved.accessToken.length < 12000 && Number.isFinite(saved.expiresAt) && saved.expiresAt > Date.now()) session = saved;
    else sessionStorage.removeItem(storageKey);
  } catch {}
  function clear() {
    session = null; generation++;
    try { sessionStorage.removeItem(storageKey); } catch {}
  }
  async function request(path, options = {}) {
    if (path === '/api/account/logout') {
      if (pending) { const current = pending; pending = null; clearInterval(current.timer); clearTimeout(current.timeout); try { current.popup.close(); } catch {} }
      clear(); return { ok: true };
    }
    if (path === '/api/account' && !session) return { user: null, csrf: '', googleClientId: 'hosted-google', configured: true };
    if (!session || session.expiresAt <= Date.now()) {
      clear(); throw Object.assign(new Error('Reconnect your Google account.'), { status: 401 });
    }
    const endpoint = path === '/api/account' ? '/api/pages/account' : path === '/api/timetable' ? '/api/pages/timetable' : null;
    if (!endpoint) throw new Error('Unsupported account request');
    if (options.accountId && session.userId !== options.accountId) throw Object.assign(new Error('The connected account changed.'), { status: 401 });
    const headers = { Authorization: 'Bearer ' + session.accessToken };
    const requestSession = session;
    if (options.body) headers['Content-Type'] = 'application/json';
    let response;
    try {
      response = await fetch(backend + endpoint, { method: options.method || 'GET', body: options.body, headers, mode: 'cors', credentials: 'omit', cache: 'no-store' });
    } catch { throw new Error('Could not reach the account service.'); }
    let data; try { data = await response.json(); } catch { throw new Error('Account service unavailable.'); }
    if (session !== requestSession) throw Object.assign(new Error('The connected account changed.'), { status: 401 });
    if (!response.ok) {
      if (response.status === 401) {
        clear();
        if (path === '/api/account') return { user: null, csrf: '', googleClientId: 'hosted-google', configured: true };
      }
      throw Object.assign(new Error(data.error || 'Account service unavailable.'), { status: response.status });
    }
    if (path === '/api/account' && data.user) session.userId = data.user.id;
    return data;
  }
  function cancel() {
    if (!pending) return;
    clearInterval(pending.timer); clearTimeout(pending.timeout);
    const current = pending; pending = null;
    try { current.popup.close(); } catch {}
    current.onError();
  }
  function renderLogin(container, onSignedIn, onError) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'tool-action';
    button.textContent = text('使用 Google 登录', 'Sign in with Google');
    button.onclick = () => {
      if (pending && !pending.popup.closed) { pending.popup.focus(); return; }
      if (location.origin !== pagesOrigin) { onError(); return; }
      const state = Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
      const url = new URL('/account/connect', backend);
      url.searchParams.set('origin', pagesOrigin); url.searchParams.set('state', state);
      url.searchParams.set('lang', text('zh', 'en'));
      const popup = window.open(url.href, '_blank', 'popup=yes,width=480,height=680');
      if (!popup) { onError(); return; }
      const current = { popup, state, onSignedIn, onError };
      pending = current;
      current.timer = setInterval(() => { if (pending === current && popup.closed) cancel(); }, 500);
      current.timeout = setTimeout(() => { if (pending === current) cancel(); }, 300000);
    };
    container.replaceChildren(button);
  }
  window.addEventListener('message', async event => {
    const current = pending, data = event.data;
    if (!current || event.origin !== backend || event.source !== current.popup || !data || data.type !== 'find-my-block:account' || data.state !== current.state) return;
    if (typeof data.accessToken !== 'string' || data.accessToken.length > 12000 || !Number.isFinite(data.expiresAt) || data.expiresAt <= Date.now() || data.expiresAt > Date.now() + 3660000) { cancel(); return; }
    clearInterval(current.timer); clearTimeout(current.timeout); pending = null;
    session = { accessToken: data.accessToken, expiresAt: data.expiresAt };
    const acceptedGeneration = generation;
    try {
      // Verify the token with the backend before accepting any account identity.
      const account = await request('/api/account');
      if (generation !== acceptedGeneration || session?.accessToken !== data.accessToken) return;
      if (!account.user) throw new Error('Invalid account connection');
      try { sessionStorage.setItem(storageKey, JSON.stringify(session)); } catch {}
      await current.onSignedIn(account);
    } catch { clear(); current.onError(); }
    finally { try { current.popup.close(); } catch {} }
  });
  window.CampusAccountTransport = { request, renderLogin };
})();
