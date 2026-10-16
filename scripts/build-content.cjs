const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'content', 'articles');
const output = path.join(root, 'js', 'articles-current.js');
const legacyOutput = path.join(root, 'js', 'articles.js');
const editionsDir = path.join(root, 'content', 'editions');
const allowed = new Set(['Strength', 'Style', 'Explore', 'Culture', 'Living', 'Finance']);
const files = fs.readdirSync(dir).filter(name => name.endsWith('.json')).sort();
if (!files.length) throw new Error('No articles found in content/articles.');
const seen = new Set();
const articles = files.map(name => {
  const article = JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id || '') || seen.has(article.id)) throw new Error(`Invalid or duplicate article id in ${name}`);
  seen.add(article.id);
  if (path.basename(name, '.json') !== article.id) throw new Error(`Filename must match permanent article id: ${name}`);
  if (!allowed.has(article.category)) throw new Error(`Unsupported category in ${name}`);
  if (!article.title || !article.subtitle || !/^\d{4}-\d\d-\d\d$/.test(article.date) || !Number.isInteger(article.read) || !article.image || !Array.isArray(article.body) || article.body.length < 4 || article.url !== `article.html?id=${encodeURIComponent(article.id)}`) throw new Error(`Incomplete article fields in ${name}`);
  for (const [heading, body] of article.body) if (!heading || !body) throw new Error(`Empty section in ${name}`);
  if (!Array.isArray(article.sources)) throw new Error(`sources must be an array in ${name}`);
  if (article.sources.some(source => !/^https:\/\//.test(source.url) || !source.title || !source.publication)) throw new Error(`Invalid source record in ${name}`);
  if (!fs.existsSync(path.join(root, article.image))) throw new Error(`Missing local image for ${article.id}: ${article.image}`);
  return article;
});
const catalog = `window.WILDWIRE_ARTICLES = ${JSON.stringify(articles, null, 2)};\n`;
let pillarImages = {};
if (fs.existsSync(editionsDir)) {
  const editions = fs.readdirSync(editionsDir).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort();
  if (editions.length) {
    const manifest = JSON.parse(fs.readFileSync(path.join(editionsDir, editions.at(-1)), 'utf8'));
    const categories = ['Strength', 'Style', 'Explore', 'Culture', 'Living', 'Finance'];
    if (!manifest.date || !manifest.pillarImages || categories.some(category => !manifest.pillarImages[category]?.image || !manifest.pillarImages[category]?.alt)) throw new Error(`Incomplete pillar images in ${editions.at(-1)}`);
    const images = categories.map(category => manifest.pillarImages[category].image);
    if (new Set(images).size !== categories.length) throw new Error(`Pillar tiles must use six distinct images in ${editions.at(-1)}`);
    for (const image of images) if (!fs.existsSync(path.join(root, image))) throw new Error(`Missing pillar image in ${editions.at(-1)}: ${image}`);
    if (images.some(image => articles.some(article => article.image === image))) throw new Error(`Pillar tile image is reused as an article cover in ${editions.at(-1)}`);
    pillarImages = Object.fromEntries(categories.map(category => [category, manifest.pillarImages[category]]));
  }
}
const catalogWithPillars = catalog + `window.WILDWIRE_PILLAR_IMAGES = ${JSON.stringify(pillarImages, null, 2)};\n`;
fs.writeFileSync(output, catalogWithPillars);
fs.writeFileSync(legacyOutput, catalogWithPillars);
console.log(`Built article catalog: ${articles.length} stable IDs → js/articles-current.js and js/articles.js`);
