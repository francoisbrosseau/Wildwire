const fs = require('node:fs');
const path = require('node:path');

// One stable RSS item per complete edition, containing every article summary.
// Derived during the existing Pages build; no new scheduler or email API calls.
module.exports = function buildNewsletterFeed(root, articles, manifestNames) {
  if (!manifestNames.length) throw new Error('Newsletter feed requires a published edition.');
  const filename = manifestNames.at(-1);
  const edition = JSON.parse(fs.readFileSync(path.join(root, 'content', 'editions', filename), 'utf8'));
  if (filename !== `${edition.date}.json` || !Array.isArray(edition.articles) || !edition.articles.length || new Set(edition.articles).size !== edition.articles.length) {
    throw new Error('Newsletter feed requires valid, unique edition article IDs.');
  }
  const byId = new Map(articles.map(article => [article.id, article]));
  const stories = edition.articles.map(id => {
    const article = byId.get(id);
    if (!article || (article.editionDate || article.date) !== edition.date) throw new Error(`Newsletter edition article missing or dated incorrectly: ${id}`);
    return article;
  });
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[char]));
  const origin = 'https://wildwiremag.com/';
  const title = `WILDWIRE Daily — ${edition.date}`;
  const html = `<h1>${escape(title)}</h1><p>DISCOVER. INSPIRE. EVOLVE.</p>` + stories.map(article =>
    `<h2><a href="${escape(new URL(article.url, origin).href)}">${escape(article.title)}</a></h2><p>${escape(article.category)} · ${article.read} min read</p><p>${escape(article.subtitle)}</p><p><a href="${escape(new URL(article.url, origin).href)}">Read the article</a></p>`
  ).join('');
  // A deterministic date and GUID prevent rebuilds or Founder’s Desk updates
  // from turning the same magazine edition into a second RSS notification.
  const publicationDate = new Date(`${edition.date}T00:00:00Z`).toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel><title>WILDWIRE Daily</title><link>${origin}</link>
<description>One daily edition with all article summaries and links.</description><language>en</language>
<atom:link href="${origin}rss.xml" rel="self" type="application/rss+xml"/>
<lastBuildDate>${publicationDate}</lastBuildDate>
<item><title>${escape(title)}</title><link>${origin}</link>
<guid isPermaLink="false">urn:wildwire:edition:${edition.date}</guid><pubDate>${publicationDate}</pubDate>
<description>${escape(html)}</description></item>
</channel></rss>
`;
  fs.writeFileSync(path.join(root, 'rss.xml'), xml);
  console.log(`Built newsletter RSS: ${edition.date}, ${stories.length} article summaries, one edition item.`);
};
