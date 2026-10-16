const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const token = process.env.OPENAI_API_KEY;
if (!token) throw new Error('Missing OPENAI_API_KEY secret. No files were changed.');
const model = process.env.WILDWIRE_MODEL || 'gpt-5.4-mini';
const dryRun = process.env.WILDWIRE_DRY_RUN === 'true';
const categories = ['Strength', 'Style', 'Explore', 'Culture', 'Living'];
const articlesDir = path.join(root, 'content', 'articles');
const articles = fs.readdirSync(articlesDir).filter(x => x.endsWith('.json')).map(x => JSON.parse(fs.readFileSync(path.join(articlesDir, x), 'utf8')));
const recent = articles.filter(a => Date.now() - Date.parse(a.date + 'T12:00:00Z') < 45 * 86400000);
const count = Object.fromEntries(categories.map(c => [c, recent.filter(a => a.category === c).length]));
const lowest = Math.min(...Object.values(count));
const tied = categories.filter(c => count[c] === lowest);
const daySeed = crypto.createHash('sha256').update(new Date().toISOString().slice(0, 10)).digest().readUInt32BE(0);
const category = tied[daySeed % tied.length];
const excluded = articles.map(a => `- ${a.title} (${a.category})`).join('\n');
const wordTokens = s => String(s || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const overlap = (a, b) => { const A = new Set(wordTokens(a)), B = new Set(wordTokens(b)); return A.size && B.size ? [...A].filter(x => B.has(x)).length / Math.min(A.size, B.size) : 0; };
async function request(input, tools = []) {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input, tools, tool_choice: tools.length ? 'required' : undefined, include: tools.length ? ['web_search_call.action.sources'] : undefined, max_output_tokens: 6500 })
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Responses API ${res.status}: ${JSON.stringify(body.error || body).slice(0, 700)}`);
  const text = (body.output || []).flatMap(x => x.content || []).filter(x => x.type === 'output_text').map(x => x.text).join('\n');
  if (!text) throw new Error('AI response contained no text.');
  const sourceItems = (body.output || []).flatMap(x => x.action?.sources || []).filter(s => s.url);
  return { text, sources: sourceItems };
}
const sourceList = sources => [...new Map(sources.map(s => [s.url, s])).values()];
function parseJSON(text) { const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''); return JSON.parse(cleaned); }
function validate(article, searched) {
  if (!article || !categories.includes(article.category)) throw new Error('Invalid category.');
  if (!article.title || !article.subtitle || !Array.isArray(article.body) || article.body.length < 6) throw new Error('Article fields/section depth failed.');
  const bodyText = article.body.map(x => `${x[0]} ${x[1]}`).join('\n');
  const wordCount = wordTokens(bodyText).length;
  if (wordCount < 850 || wordCount > 1800) throw new Error(`Article length ${wordCount} is outside the 850–1,800 word guardrail.`);
  if (!Array.isArray(article.sources) || article.sources.length < 3) throw new Error('Fewer than three cited research sources.');
  const verifiedUrls = new Set(searched.map(s => s.url));
  for (const source of article.sources) {
    if (!source.url?.startsWith('https://') || !verifiedUrls.has(source.url) || !source.title || !source.publication) throw new Error(`Citation is not among returned web-search sources: ${source.url || '(missing URL)'}`);
  }
  for (let i = 0; i < article.sources.length; i++) if (!bodyText.includes(`[${i + 1}]`)) throw new Error(`Source ${i + 1} is not cited in article body.`);
  const slug = article.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
  const id = `${slug}-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}`;
  article.id = id;
  article.date = new Date().toISOString().slice(0, 10);
  article.url = `article.html?id=${encodeURIComponent(id)}`;
  article.read = Math.max(5, Math.ceil(wordCount / 220));
  article.author = 'WILDWIRE Editorial';
  if (articles.some(a => a.id === id || overlap(a.title, article.title) > .66)) throw new Error('Duplicate or near-duplicate story detected.');
  return wordCount;
}
async function findLicensedImage(query) {
  const api = new URL('https://commons.wikimedia.org/w/api.php');
  api.search = new URLSearchParams({ action: 'query', generator: 'search', gsrsearch: `filetype:bitmap ${query}`, gsrnamespace: '6', gsrlimit: '15', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1600', format: 'json', origin: '*' }).toString();
  const res = await fetch(api, { headers: { 'User-Agent': 'WILDWIREEditorial/1.0 (licensed editorial image selection)' } });
  if (!res.ok) throw new Error(`Wikimedia Commons search failed (${res.status}).`);
  const data = await res.json();
  const pages = Object.values(data.query?.pages || {});
  const used = new Set(articles.map(a => a.imageSource).filter(Boolean));
  const allowed = new Set(['CC0', 'Public domain', 'CC BY 4.0', 'CC BY-SA 4.0', 'CC BY 3.0', 'CC BY-SA 3.0']);
  const image = pages.map(p => ({ page: p, info: p.imageinfo?.[0] })).find(x => x.info && !used.has(x.info.descriptionurl) && allowed.has(x.info.extmetadata?.LicenseShortName?.value?.replace(/<[^>]+>/g, '').trim()));
  if (!image) throw new Error('No suitably licensed Wikimedia image found; publishing is halted rather than using unverified artwork.');
  const ext = image.info.mime === 'image/png' ? 'png' : image.info.mime === 'image/jpeg' ? 'jpg' : null;
  if (!ext) throw new Error(`Image format ${image.info.mime} is not supported by the image guard.`);
  const license = image.info.extmetadata.LicenseShortName.value.replace(/<[^>]+>/g, '').trim();
  const artist = image.info.extmetadata.Artist?.value?.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim() || 'Wikimedia Commons contributor';
  const credit = `Image: ${artist}. ${license}. Source: ${image.page.title} (Wikimedia Commons).`;
  const download = await fetch(image.info.thumburl || image.info.url);
  if (!download.ok) throw new Error(`Image download failed (${download.status}).`);
  const bytes = Buffer.from(await download.arrayBuffer());
  if (bytes.length < 5000 || bytes.length > 12_000_000) throw new Error('Image file size outside safe range.');
  return { ext, bytes, credit, source: image.info.descriptionurl, license };
}
(async () => {
  const history = excluded || '(No previously published articles.)';
  const research = await request(`Research a fresh, useful WILDWIRE feature topic in the ${category} pillar. Avoid these existing stories:\n${history}\nFind at least five credible, current primary or authoritative sources; explain the findings and provide verifiable facts. Avoid invented quotations and unsupported health, financial, or social claims.`, [{ type: 'web_search' }]);
  if (research.sources.length < 3) throw new Error('Research did not return at least three independent sources.');
  const researchUrls = sourceList(research.sources);
  const draftResult = await request(`Write one original WILDWIRE feature in JSON only, based exclusively on this research. Voice: intelligent, warm, confident, practical, human; with personality and edge but no alpha clichés, filler, or preachy self-help. Category: ${category}. Research notes:\n${research.text}\n\nVerified source candidates (use exactly 3–5 URLs from this list):\n${JSON.stringify(researchUrls)}\n\nSchema: {"category":"${category}","title":"...","subtitle":"...","imageAlt":"...","body":[["section heading","substantial prose with paragraphs separated by blank lines; use inline [1], [2] citations for sourced claims"],...],"sources":[{"title":"...","url":"exact candidate URL","authors":"author or institution","publication":"publisher/site"},...]}. Write 6–9 sections and 850–1,800 words, each section with useful detail. Never invent sources or quotes. Return valid JSON only.`);
  const draft = parseJSON(draftResult.text);
  if (draft.category !== category) throw new Error('Draft category differs from selected pillar.');
  const check = await request(`Fact-check this proposed WILDWIRE story against current web sources. Search key factual claims. Return JSON only: {"passed":boolean,"issues":[string],"checkedClaims":[string]}. A pass requires no unsupported material factual claims and no false/attributed quotations. If uncertain, fail. STORY:\n${JSON.stringify(draft)}`, [{ type: 'web_search' }]);
  const checked = parseJSON(check.text);
  if (checked.passed !== true || !Array.isArray(checked.checkedClaims) || checked.checkedClaims.length < 3) throw new Error(`Independent fact-check failed: ${(checked.issues || []).join('; ') || 'incomplete verification'}`);
  const searched = sourceList([...research.sources, ...check.sources]);
  const wordCount = validate(draft, searched);
  const image = await findLicensedImage(`${draft.title} editorial photo`);
  draft.image = `images/generated/${draft.id}.${image.ext}`;
  draft.imageLicense = image.license;
  draft.imageSource = image.source;
  draft.imageCredit = image.credit;
  const imagePath = path.join(root, draft.image);
  if (dryRun) {
    console.log(JSON.stringify({ status: 'DRY_RUN_PASSED', id: draft.id, category, words: wordCount, sources: draft.sources.length, imageLicense: image.license, imageCredit: image.credit }, null, 2));
    return;
  }
  if (fs.existsSync(path.join(articlesDir, `${draft.id}.json`)) || fs.existsSync(imagePath)) throw new Error('Generated output path already exists; refusing overwrite.');
  fs.mkdirSync(path.dirname(imagePath), { recursive: true });
  fs.mkdirSync(articlesDir, { recursive: true });
  fs.writeFileSync(imagePath, image.bytes, { flag: 'wx' });
  fs.writeFileSync(path.join(articlesDir, `${draft.id}.json`), JSON.stringify(draft, null, 2) + '\n', { flag: 'wx' });
  const build = spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: root, encoding: 'utf8' });
  const checkContent = spawnSync(process.execPath, [path.join(__dirname, 'check-content.cjs')], { cwd: root, encoding: 'utf8' });
  if (build.status !== 0 || checkContent.status !== 0) {
    fs.rmSync(path.join(articlesDir, `${draft.id}.json`), { force: true }); fs.rmSync(imagePath, { force: true });
    spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: root });
    throw new Error(`Catalog safeguards failed; candidate removed. ${(build.stderr || checkContent.stderr || build.stdout || checkContent.stdout || '').slice(0, 900)}`);
  }
  console.log(`Candidate safely added: ${draft.id} (${category}, ${wordCount} words, ${draft.sources.length} sources, ${image.license}).`);
})().catch(error => { console.error(`WILDWIRE publication failed closed: ${error.message}`); process.exitCode = 1; });
