(() => {
  let current = null;
  let generation = 0;
  const drafts = new Map();
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  const client = () => window.WILDWIRE_ACCOUNT?.client;
  const errorText = error => /wait 30 seconds/i.test(error?.message || '') ? 'Please wait 30 seconds between comments.' : /daily comment limit/i.test(error?.message || '') ? 'You have reached today’s comment limit. Please try again tomorrow.' : /duplicate comment/i.test(error?.message || '') ? 'You have already posted that comment.' : 'We could not complete that request. Please try again.';
  function form(state) {
    const host = state.formHost; host.replaceChildren();
    if (!client()) { host.append(el('p', 'Comments are temporarily unavailable. Please refresh and try again.', 'notice')); return; }
    if (!state.session?.user) {
      const p = el('p', ''); const link = el('a', 'Sign in or create a free account'); link.href = `account.html?next=${encodeURIComponent(`article.html?id=${state.articleId}#comments`)}`;
      p.append(link, document.createTextNode(' to join the conversation.')); host.append(p); return;
    }
    const node = document.createElement('form'); node.className = 'comment-form';
    node.innerHTML = '<label>Name shown publicly<input name="display_name" required minlength="2" maxlength="60" autocomplete="nickname"></label><label>Your comment<textarea name="body" required minlength="3" maxlength="3000" rows="4"></textarea></label><p class="small muted">Your comment and chosen display name will be public. Keep the conversation thoughtful and respectful.</p><button class="bookmark" type="submit">Post comment</button><p role="status" aria-live="polite"></p>';
    const name = node.elements.namedItem('display_name'), body = node.elements.namedItem('body'), button = node.querySelector('button'), message = node.querySelector('[role="status"]');
    const draftKey = `${state.articleId}:${state.session.user.id}`;
    const draft = drafts.get(draftKey) || {}; name.value = draft.name || ''; body.value = draft.body || '';
    const remember = () => drafts.set(draftKey, { name: name.value, body: body.value });
    name.addEventListener('input', remember); body.addEventListener('input', remember);
    node.addEventListener('submit', async event => {
      event.preventDefault(); if (button.disabled) return;
      const displayName = name.value.trim(), text = body.value.trim();
      if (displayName.length < 2 || text.length < 3) { message.textContent = 'Add a display name and a comment of at least three characters.'; return; }
      remember(); button.disabled = true; message.textContent = 'Posting…';
      try {
        const { data, error: authError } = await client().auth.getSession();
        if (authError || !data.session?.user) { message.textContent = 'Please sign in again before posting. Your draft is still here.'; return; }
        const { error } = await client().from('article_comments').insert({ article_id: state.articleId, author_id: data.session.user.id, display_name: displayName, body: text });
        if (error) throw error;
        body.value = ''; remember(); message.textContent = 'Your comment is posted.';
        if (current === state) { state.offset = 0; state.rows = []; await load(state); }
      } catch (error) { message.textContent = errorText(error); }
      finally { button.disabled = false; }
    });
    host.append(node);
  }
  function renderRows(state) {
    state.list.replaceChildren();
    for (const row of state.rows) {
      const article = el('article', undefined, 'reader-comment');
      const header = el('div', undefined, 'comment-heading'); header.append(el('strong', row.display_name));
      const date = el('time', new Date(row.created_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' })); date.dateTime = row.created_at; header.append(date); article.append(header, el('p', row.body, 'comment-body'));
      if (state.session?.user?.id === row.author_id) {
        const remove = el('button', 'Remove my comment', 'comment-remove'); remove.type = 'button';
        remove.addEventListener('click', async () => {
          remove.disabled = true;
          try { const { error } = await client().from('article_comments').delete().eq('id', row.id).eq('author_id', state.session.user.id); if (error) throw error; state.rows = state.rows.filter(item => item.id !== row.id); state.offset = state.rows.length; renderRows(state); state.status.textContent = 'Your comment was removed.'; }
          catch (error) { state.status.textContent = errorText(error); remove.disabled = false; }
        }); article.append(remove);
      }
      state.list.append(article);
    }
  }
  async function load(state) {
    if (!client() || state.loading) return;
    state.loading = true; state.more.disabled = true; state.status.textContent = 'Loading comments…';
    try {
      const { data, error } = await client().from('article_comments').select('id,article_id,author_id,display_name,body,created_at').eq('article_id', state.articleId).eq('status', 'published').order('created_at', { ascending: false }).order('id', { ascending: false }).range(state.offset, state.offset + 19);
      if (current !== state) return;
      if (error) throw error;
      const existing = new Set(state.rows.map(row => row.id)); state.rows.push(...(data || []).filter(row => !existing.has(row.id))); state.offset += (data || []).length;
      renderRows(state); state.more.hidden = (data || []).length < 20; state.retry.hidden = true;
      state.status.textContent = state.rows.length ? '' : 'Be the first to share your perspective.';
    } catch { if (current === state) { state.status.textContent = 'Comments could not load. Please try again.'; state.retry.hidden = false; } }
    finally { state.loading = false; state.more.disabled = false; }
  }
  async function mount(articleId, host) {
    if (!host) return;
    const token = ++generation;
    const state = { articleId, host, session: null, offset: 0, rows: [], loading: false };
    current = state; host.replaceChildren();
    state.formHost = el('div'); state.status = el('p', 'Loading comments…', 'muted'); state.status.setAttribute('role', 'status'); state.status.setAttribute('aria-live', 'polite'); state.list = el('div'); state.list.className = 'comment-list';
    state.more = el('button', 'Load more comments', 'bookmark'); state.more.type = 'button'; state.more.hidden = true; state.more.addEventListener('click', () => load(state));
    state.retry = el('button', 'Retry loading comments', 'bookmark'); state.retry.type = 'button'; state.retry.hidden = true; state.retry.addEventListener('click', () => load(state));
    host.append(state.formHost, state.status, state.list, state.more, state.retry);
    if (!client()) { form(state); state.status.textContent = ''; return; }
    try { const { data, error } = await client().auth.getSession(); if (token !== generation) return; if (error) throw error; state.session = data.session; form(state); await load(state); }
    catch { if (token === generation) { state.status.textContent = 'Comments could not load. Please refresh and try again.'; } }
  }
  window.WILDWIRE_COMMENTS = { mount };
  window.addEventListener('wildwire:session', event => { if (!current) return; current.session = event.detail.session; form(current); renderRows(current); });
  const boot = () => { const id = new URLSearchParams(location.search).get('id'); const host = document.getElementById('comment-widget'); if (id && host) mount(id, host); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
