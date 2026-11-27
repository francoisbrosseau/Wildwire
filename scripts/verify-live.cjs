const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const required = ['Strength', 'Style', 'Explore', 'Culture', 'Living', 'Finance'];

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

async function verifyPublicEdition(date, stories, getResponse = get) {
  const domain = 'https://wildwiremag.com';
  const request = resource => getResponse(`${domain}${resource}?edition=${Date.now()}`);
  const [catalogResponse, homeResponse, appResponse] = await Promise.all([
    request('/js/articles.js'), request('/'), request('/js/app.js'),
  ]);
  const [catalog, home, app] = await Promise.all([catalogResponse.text(), homeResponse.text(), appResponse.text()]);
  const badge = home.match(/THE WILDWIRE JOURNAL · ISSUE \d+ · <time datetime="([^"]+)">([^<]*)<\/time>/);
  const expectedLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${date}T12:00:00Z`));
  if (badge?.[1] !== date || badge?.[2].trim() !== expectedLabel) {
    throw new Error(`Live homepage issue date is ${badge ? `${badge[1]} (${badge[2]})` : 'missing'}; expected ${date} (${expectedLabel}).`);
  }
  const loadsCatalog = filename => new RegExp(`<script\\b[^>]*\\bsrc=["'](?:\\./|/)?js/${filename}(?:\\?[^"']*)?["']`, 'i').test(home);
  const loadsCurrent = loadsCatalog('articles-current\\.js');
  if ((!loadsCurrent && !loadsCatalog('articles\\.js')) || !app.includes('category-index')) {
    throw new Error('Live homepage does not load the article catalog and daily edition selector.');
  }
  const currentCatalog = loadsCurrent ? await (await request('/js/articles-current.js')).text() : catalog;
  for (const { id } of stories) {
    if (!catalog.includes(`"id": "${id}"`)) throw new Error(`Live catalog is missing ${id}`);
    if (!currentCatalog.includes(`"id": "${id}"`)) throw new Error(`Live homepage catalog is missing ${id}`);
  }
}

async function verify() {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
  const stories = fs.readdirSync(path.join(root, 'content', 'articles'))
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(root, 'content', 'articles', file), 'utf8')))
    .filter(article => article.editionDate === date);
  const pillars = stories.filter(article => !article.dailyRead && !article.spiritFeature);
  const spiritFeatures = stories.filter(article => article.spiritFeature === true);
  const dailyReads = stories.filter(article => article.dailyRead === true);
  if (stories.length !== 10 || pillars.length !== 6 || dailyReads.length !== 3 || spiritFeatures.length !== 1 || new Set(pillars.map(article => article.category)).size !== 6 ||
      !required.every(category => pillars.some(article => article.category === category))) {
    throw new Error(`Expected six pillar stories, three Daily Reads and one Mind & Spirit feature for ${date}; found ${stories.length}.`);
  }
  const editionPath = path.join(root, 'content', 'editions', `${date}.json`);
  if (!fs.existsSync(editionPath)) throw new Error(`Missing edition manifest for ${date}.`);
  const manifest = JSON.parse(fs.readFileSync(editionPath, 'utf8'));
  const tileImages = required.map(category => manifest.pillarImages?.[category]?.image);
  if (tileImages.some(image => !image) || new Set(tileImages).size !== 6 || tileImages.some(image => stories.some(article => article.image === image))) {
    throw new Error('Edition manifest must contain six separate pillar images that are not story covers.');
  }
  const deadline = Date.now() + 8 * 60 * 1000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      await verifyPublicEdition(date, stories);
      for (const article of stories) {
        if ((await get(`https://wildwiremag.com/${article.image}?edition=${Date.now()}`)).headers.get('content-type')?.startsWith('image/') !== true) {
          throw new Error(`Live image is missing or not served as an image: ${article.image}`);
        }
        await get(`https://wildwiremag.com/article.html?id=${encodeURIComponent(article.id)}&edition=${Date.now()}`);
      }
      for (const image of tileImages) {
        if ((await get(`https://wildwiremag.com/${image}?edition=${Date.now()}`)).headers.get('content-type')?.startsWith('image/') !== true) throw new Error(`Live pillar image is missing or not served as an image: ${image}`);
      }
      console.log(JSON.stringify({ status: 'LIVE_VERIFIED', date, url: 'https://wildwiremag.com/', articles: stories.map(item => item.id), pillarTileImages: tileImages }, null, 2));
      return;
    } catch (error) {
      lastError = error;
      await delay(20000);
    }
  }
  throw new Error(`Live verification timed out; public deployment state is unconfirmed. Inspect Pages and the live site before rollback. Last result: ${lastError?.message || 'unknown error'}`);
}

if (require.main === module) verify().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { verifyPublicEdition };
