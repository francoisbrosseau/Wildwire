const assert = require('node:assert/strict');
const { test } = require('node:test');
const { verifyPublicEdition } = require('../scripts/verify-live.cjs');

const date = '2026-11-26';
const stories = [{ id: 'story-20261126' }];
const catalog = 'window.WILDWIRE_ARTICLES = ' + JSON.stringify(stories, null, 2);
const oldCatalog = 'window.WILDWIRE_ARTICLES = []';
const homepage = (datetime = date, label = '26 November 2026', script = 'articles-current.js?v=edition') =>
  `<div class="edition"><span>THE WILDWIRE JOURNAL · ISSUE 41 · <time datetime="${datetime}">${label}</time></span></div><script src="js/${script}"></script>`;

function fixture(home, current = catalog, full = catalog) {
  const requested = [];
  return { requested, get: async url => {
    const path = new URL(url).pathname;
    requested.push(path);
    const fixtures = { '/': home, '/js/articles.js': full, '/js/articles-current.js': current, '/js/app.js': 'category-index' };
    assert.ok(Object.hasOwn(fixtures, path), `unexpected URL: ${url}`);
    return { text: async () => fixtures[path] };
  }};
}

test('fresh homepage and its current catalog pass', async () => {
  const mock = fixture(homepage());
  await verifyPublicEdition(date, stories, mock.get);
  assert.ok(mock.requested.includes('/js/articles-current.js'));
});

test('stale homepage is rejected even when both public catalogs match', async () => {
  const mock = fixture(homepage('2026-11-25', '25 November 2026'));
  await assert.rejects(verifyPublicEdition(date, stories, mock.get), /Live homepage issue date is 2026-11-25/);
});

test('stale visible issue label is rejected even when datetime and catalogs match', async () => {
  const mock = fixture(homepage(date, '25 November 2026'));
  await assert.rejects(verifyPublicEdition(date, stories, mock.get), /2026-11-26 \(25 November 2026\); expected/);
});

test('a stale current catalog is rejected even when archive catalog is fresh', async () => {
  const mock = fixture(homepage(), oldCatalog);
  await assert.rejects(verifyPublicEdition(date, stories, mock.get), /Live homepage catalog is missing story-20261126/);
});

test('the full catalog is still verified independently', async () => {
  const mock = fixture(homepage(), catalog, oldCatalog);
  await assert.rejects(verifyPublicEdition(date, stories, mock.get), /Live catalog is missing story-20261126/);
});

test('legacy homepage referencing the full catalog still passes', async () => {
  const mock = fixture(homepage(date, '26 November 2026', 'articles.js'), oldCatalog);
  await verifyPublicEdition(date, stories, mock.get);
  assert.ok(!mock.requested.includes('/js/articles-current.js'));
});
