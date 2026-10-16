const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '..');
const pageHtml = fs.readFileSync(path.join(root, 'account.html'), 'utf8');
const dom = new JSDOM(pageHtml, { url: 'https://wildwiremag.com/account.html', runScripts: 'dangerously' });
const w = dom.window;
w.eval(fs.readFileSync(path.join(root, 'js/supabase-config.js'), 'utf8'));
w.eval(fs.readFileSync(path.join(root, 'js/accounts.js'), 'utf8'));
assert.equal(w.document.querySelector('#account-submit').disabled, true, 'Unconfigured auth never pretends to be live');
assert.match(w.document.querySelector('#account-message').textContent, /not finished|not connected/i);
assert.equal(w.document.querySelector('.account-footnote').textContent.includes('No registration is needed'), true);
w.close();

const linked = new JSDOM(pageHtml, { url: 'https://wildwiremag.com/account.html', runScripts: 'dangerously' });
const v = linked.window;
let mergedRows = [{ article_id: 'remote-story' }];
const calls = [];
const session = { user: { id: 'reader-1', email: 'reader@example.test' } };
const mockClient = {
  auth: {
    onAuthStateChange() { return { data: { subscription: { unsubscribe() {} } } }; },
    async getSession() { return { data: { session }, error: null }; },
    async signOut() { calls.push(['signOut']); return { error: null }; }
  },
  from(table) {
    assert.equal(table, 'saved_articles');
    return {
      select() { return { async eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, session.user.id); return { data: mergedRows, error: null }; } }; },
      async upsert(input) { const rows = Array.isArray(input) ? input : [input]; calls.push(['upsert', rows]); mergedRows = [...mergedRows, ...rows]; return { error: null }; },
      delete() { return { eq(key, userId) { assert.equal(key, 'user_id'); assert.equal(userId, session.user.id); return { async eq(idKey, id) { assert.equal(idKey, 'article_id'); calls.push(['delete', id]); mergedRows = mergedRows.filter(r => r.article_id !== id); return { error: null }; } }; } }; }
    };
  }
};
v.supabase = { createClient() { return mockClient; } };
v.WILDWIRE_SUPABASE_CONFIG = { url: 'https://project.example.test', publishableKey: 'sb_publishable_test' };
v.localStorage.setItem('wildwire-favorites-v1', JSON.stringify(['guest-story']));
v.eval(fs.readFileSync(path.join(root, 'js/accounts.js'), 'utf8'));
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
  await wait(5);
  assert.equal(v.document.querySelector('#account-active').hidden, false, 'A valid session shows account state');
  assert.equal(v.document.querySelector('#account-email').textContent, 'reader@example.test');
  const local = JSON.parse(v.localStorage.getItem('wildwire-favorites-v1'));
  assert.deepEqual(local.sort(), ['guest-story', 'remote-story']);
  assert(calls.some(c => c[0] === 'upsert' && c[1].some(r => r.article_id === 'guest-story')), 'Guest favorites merge to the signed-in account');
  await v.WILDWIRE_ACCOUNT.saveFavorite('new-story', true);
  assert(calls.some(c => c[0] === 'upsert' && c[1].some(r => r.article_id === 'new-story')), 'New saved story writes to account storage');
  await v.WILDWIRE_ACCOUNT.saveFavorite('remote-story', false);
  assert(calls.some(c => c[0] === 'delete' && c[1] === 'remote-story'), 'Removing a saved story deletes the account row');
  mergedRows = mergedRows.filter(r => r.article_id !== 'remote-story');
  await v.WILDWIRE_ACCOUNT.reload();
  assert(!JSON.parse(v.localStorage.getItem('wildwire-favorites-v1')).includes('remote-story'), 'A removal made elsewhere is not resurrected from stale local storage');
  assert.match(fs.readFileSync(path.join(root, 'supabase/migrations/202610160001_saved_articles.sql'), 'utf8'), /enable row level security/i);
  assert.match(fs.readFileSync(path.join(root, 'supabase/migrations/202610160001_saved_articles.sql'), 'utf8'), /auth\.uid\(\).*user_id/s);
  console.log('PASS account setup disabled honestly until configured');
  console.log('PASS mocked Supabase session, guest merge, saved write and remove');
  console.log('PASS migration enables owner-scoped row-level security');
  linked.window.close();
})().catch(error => { console.error(error); process.exitCode = 1; linked.window.close(); });
