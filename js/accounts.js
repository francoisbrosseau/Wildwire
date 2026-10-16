(() => {
  const KEY = 'wildwire-favorites-v1';
  const cfg = window.WILDWIRE_SUPABASE_CONFIG || {};
  let client = null;
  let mode = 'signin';
  const $ = id => document.getElementById(id);
  const notice = $('account-message') || $('account-sync-status');
  const say = message => { if (notice) notice.textContent = message; };
  const localIds = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string'))] : []; }
    catch { return []; }
  };
  const saveLocal = ids => { try { localStorage.setItem(KEY, JSON.stringify([...new Set(ids)])); } catch {} };
  const configured = Boolean(cfg.url && cfg.publishableKey && window.supabase?.createClient);
  const accountLinks = document.querySelectorAll('.account-link');
  if (!configured) {
    document.querySelectorAll('#account-form input,#account-form button,#google-button,#forgot-button,#new-password-form input,#new-password-form button').forEach(el => { el.disabled = true; });
    if ($('account-message')) say('Account service setup is not finished. Reading and browser-local favorites remain available.');
    return;
  }
  client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  const origin = window.location.origin;
  const nextParam = new URLSearchParams(location.search).get('next');
  const validNext = value => typeof value === 'string' && /^article\.html\?id=[a-z0-9-]+(?:#comments)?$/.test(value);
  let next = validNext(nextParam) ? nextParam : null;
  try { if (next) sessionStorage.setItem('wildwire-return-story-v1', next); else { const saved = sessionStorage.getItem('wildwire-return-story-v1'); if (validNext(saved)) next = saved; } } catch {}
  // Preserve the existing OAuth allow-listed redirect; retain the article locally.
  const accountReturn = `${origin}${window.location.pathname}`;
  const syncFavoriteSet = async user => {
    const { data, error } = await client.from('saved_articles').select('article_id').eq('user_id', user.id);
    if (error) throw error;
    const remote = (data || []).map(row => row.article_id);
    const syncedKey = `wildwire-favorites-synced-v1:${user.id}`;
    let firstSync = false;
    try { firstSync = localStorage.getItem(syncedKey) !== 'yes'; } catch {}
    // Import browser-local favorites once; after that the account is authoritative so
    // removals on another device cannot be resurrected by stale local storage.
    const merged = firstSync ? [...new Set([...remote, ...localIds()])] : remote;
    const guestOnly = merged.filter(id => !remote.includes(id));
    if (guestOnly.length) {
      const { error: upsertError } = await client.from('saved_articles').upsert(
        guestOnly.map(article_id => ({ user_id: user.id, article_id })),
        { onConflict: 'user_id,article_id', ignoreDuplicates: true }
      );
      if (upsertError) throw upsertError;
    }
    saveLocal(merged);
    try { localStorage.setItem(syncedKey, 'yes'); } catch {}
    return merged;
  };
  window.WILDWIRE_ACCOUNT = {
    enabled: true,
    client,
    saveFavorite: async (articleId, saved) => {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return;
      const q = client.from('saved_articles');
      const result = saved
        ? await q.upsert({ user_id: session.user.id, article_id: articleId }, { onConflict: 'user_id,article_id', ignoreDuplicates: true })
        : await q.delete().eq('user_id', session.user.id).eq('article_id', articleId);
      if (result.error && $('account-sync-status')) $('account-sync-status').textContent = 'Cloud sync paused: ' + result.error.message;
    },
    reload: async () => {
      const { data: { session } } = await client.auth.getSession();
      if (!session?.user) return;
      await syncFavoriteSet(session.user);
    }
  };
  const renderSession = async session => {
    window.dispatchEvent(new CustomEvent('wildwire:session', { detail: { session } }));
    if ($('account-active')) $('account-active').hidden = !session?.user;
    if ($('account-auth')) $('account-auth').hidden = Boolean(session?.user);
    if ($('account-email')) $('account-email').textContent = session?.user?.email || '';
    if (session?.user && next && $('account-active') && !document.getElementById('continue-reading')) { const link=document.createElement('a'); link.id='continue-reading'; link.href=next; link.className='bookmark'; link.textContent='Continue reading and comment →'; $('account-active').append(link); }
    accountLinks.forEach(link => { link.textContent = session?.user ? 'Your account' : 'Sign in'; });
    if (session?.user) {
      try {
        const merged = await syncFavoriteSet(session.user);
        say(`Signed in as ${session.user.email}. ${merged.length} saved ${merged.length === 1 ? 'story is' : 'stories are'} synced.`);
        if (window.renderPage) window.renderPage();
      } catch (error) { say('Signed in, but saved stories could not sync: ' + error.message); }
    } else if (notice && $('account-active')) say('Signed out. Your guest favorites remain in this browser.');
  };
  const { data: authListener } = client.auth.onAuthStateChange((_event, session) => { setTimeout(() => renderSession(session), 0); });
  client.auth.getSession().then(({ data, error }) => error ? say(error.message) : renderSession(data.session));
  document.querySelectorAll('[data-account-mode]').forEach(button => button.addEventListener('click', () => {
    mode = button.dataset.accountMode;
    document.querySelectorAll('[data-account-mode]').forEach(tab => { const active = tab === button; tab.classList.toggle('active', active); tab.setAttribute('aria-selected', String(active)); });
    const pass = $('account-password'); if (pass) pass.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    const submit = $('account-submit'); if (submit) submit.textContent = mode === 'signup' ? 'Create free account' : 'Sign in';
    say(mode === 'signup' ? 'Create a free account to save stories and join the conversation.' : 'Sign in to save stories and join the conversation.');
  }));
  $('account-form')?.addEventListener('submit', async event => {
    event.preventDefault(); const form = new FormData(event.currentTarget); const email = String(form.get('email') || '').trim(); const password = String(form.get('password') || '');
    const button = $('account-submit'); button.disabled = true;
    try {
      const result = mode === 'signup'
        ? await client.auth.signUp({ email, password, options: { emailRedirectTo: accountReturn } })
        : await client.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      say(mode === 'signup' && !result.data.session ? 'Check your inbox for the confirmation link. Your saved stories will sync after you confirm and sign in.' : 'You are signed in. Syncing your saved stories…');
      if (result.data.session) await renderSession(result.data.session);
    } catch (error) { say(error.message || 'We could not complete that request.'); }
    finally { button.disabled = false; }
  });
  $('forgot-button')?.addEventListener('click', async () => {
    const email = $('account-email-input')?.value.trim();
    if (!email) { say('Enter your email address first, then choose Forgot password.'); return; }
    try { const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: (() => { const url = new URL(accountReturn); url.searchParams.set('mode', 'reset'); return url.href; })() }); if (error) throw error; say('If an account exists for that address, a password reset link is on its way.'); }
    catch (error) { say(error.message || 'We could not send a reset link.'); }
  });
  $('new-password-form')?.addEventListener('submit', async event => {
    event.preventDefault();
    try { const { error } = await client.auth.updateUser({ password: $('new-password').value }); if (error) throw error; say('Password updated. You are signed in.'); $('new-password-form').hidden = true; }
    catch (error) { say(error.message || 'We could not update your password.'); }
  });
  if (new URLSearchParams(location.search).get('mode') === 'reset' || new URLSearchParams(location.hash.slice(1)).get('type') === 'recovery') {
    if ($('new-password-form')) $('new-password-form').hidden = false;
    say('Choose a new password for your WILDWIRE account.');
  }
  $('google-button')?.addEventListener('click', async () => {
    try { const { error } = await client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: accountReturn } }); if (error) throw error; }
    catch (error) { say(error.message || 'Google sign-in could not start.'); }
  });
  $('signout-button')?.addEventListener('click', async () => {
    try { const { error } = await client.auth.signOut(); if (error) throw error; await renderSession(null); }
    catch (error) { say(error.message || 'Could not sign out.'); }
  });
})();
