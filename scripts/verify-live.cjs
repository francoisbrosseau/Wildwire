const fs = require('node:fs');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const root = path.resolve(__dirname, '..');
const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
const stories = fs.readdirSync(path.join(root, 'content', 'articles'))
  .filter(file => file.endsWith('.json'))
  .map(file => JSON.parse(fs.readFileSync(path.join(root, 'content', 'articles', file), 'utf8')))
  .filter(article => article.date === date);
const required = ['Strength', 'Style', 'Explore', 'Culture', 'Living'];

async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(15000), cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response;
}

async function verify() {
  if (stories.length !== 5 || new Set(stories.map(article => article.category)).size !== 5 ||
      !required.every(category => stories.some(article => article.category === category))) {
    throw new Error(`Expected five unique pillar stories for ${date}; found ${stories.length}.`);
  }
  const deadline = Date.now() + 8 * 60 * 1000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const [catalogResponse, homeResponse, appResponse] = await Promise.all([
        get(`https://wildwiremag.com/js/articles.js?edition=${Date.now()}`),
        get(`https://wildwiremag.com/?edition=${Date.now()}`),
        get(`https://wildwiremag.com/js/app.js?edition=${Date.now()}`),
      ]);
      const [catalog, home, app] = await Promise.all([catalogResponse.text(), homeResponse.text(), appResponse.text()]);
      if (!home.includes('js/articles.js') || !app.includes('edition=') && !app.includes('isDailyEdition')) {
        throw new Error('Live homepage does not load the article catalog and daily edition selector.');
      }
      for (const article of stories) {
        if (!catalog.includes(`"id": "${article.id}"`)) throw new Error(`Live catalog is missing ${article.id}`);
        if ((await get(`https://wildwiremag.com/${article.image}?edition=${Date.now()}`)).headers.get('content-type')?.startsWith('image/') !== true) {
          throw new Error(`Live image is missing or not served as an image: ${article.image}`);
        }
        await get(`https://wildwiremag.com/article.html?id=${encodeURIComponent(article.id)}&edition=${Date.now()}`);
      }
      console.log(JSON.stringify({ status: 'LIVE_VERIFIED', date, url: 'https://wildwiremag.com/', articles: stories.map(item => item.id) }, null, 2));
      return;
    } catch (error) {
      lastError = error;
      await delay(20000);
    }
  }
  throw new Error(`Live verification timed out; the previous published site remains in place. Last result: ${lastError?.message || 'unknown error'}`);
}

verify().catch(error => { console.error(error.message); process.exitCode = 1; });
