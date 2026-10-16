const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const IMAGE_DIR = path.join(ROOT, 'images', 'generated');
const EDITIONS_DIR = path.join(ROOT, 'content', 'editions');
const TOKEN = process.env.OPENAI_API_KEY;
const MODEL = process.env.WILDWIRE_MODEL || 'gpt-6-luna';
const IMAGE_MODEL = process.env.WILDWIRE_IMAGE_MODEL || 'gpt-image-2.5-flare';
const DRY_RUN = process.env.WILDWIRE_DRY_RUN === 'true';
const CATEGORIES = ['Strength', 'Style', 'Explore', 'Culture', 'Living'];
const DAILY_READ_COUNT = 3;
const DAILY_READ_CATEGORIES = ['Living', 'Culture', 'Explore', 'Living', 'Style'];
const PILLAR_SCENES = {
  Strength: 'Two training partners prepare for a focused strength session in a practical neighborhood gym.',
  Style: 'Two sharply dressed friends walk with calm runway confidence through an urban street.',
  Explore: 'Two travel partners study a city map at a vivid street corner, ready to explore.',
  Culture: 'Two thoughtful friends discuss a painting in a quiet gallery, attentive and curious.',
  Living: 'A couple and a family member prepare a simple meal together in a warm, lived-in kitchen.',
};
const PAIRINGS = [
  'a woman and a man who are partners, with grounded attainable appearances',
  'two women friends with distinct personal style',
  'two men friends with different backgrounds',
  'a couple with visibly different ages and life experience',
  'three generations of one family working together',
  'two friends of different genders traveling together',
  'two women partners with distinct builds and features',
  'a couple of different ethnic backgrounds sharing a thoughtful moment',
  'two adult siblings or close friends collaborating',
  'an adult couple with one older family member',
];

const fail = message => { throw new Error(message); };
const tokens = value => String(value || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const titleOverlap = (left, right) => {
  const a = new Set(tokens(left)), b = new Set(tokens(right));
  return a.size && b.size ? [...a].filter(word => b.has(word)).length / Math.min(a.size, b.size) : 0;
};
const STOP_WORDS = new Set('about after again against along also among and any are around article because been before being between both could daily does each from have into just make more most must need only other should story than their them there these they this those through under until very what when where which while with would your'.split(' '));
function contentOverlap(left, right) {
  const a = new Set(tokens(left).filter(word => !STOP_WORDS.has(word)));
  const b = new Set(tokens(right).filter(word => !STOP_WORDS.has(word)));
  return a.size && b.size ? [...a].filter(word => b.has(word)).length / Math.min(a.size, b.size) : 0;
}
function torontoDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}
function editionArticles(existing, date) {
  return existing.filter(article => article.editionDate === date);
}
function editionDate(testDate = '', dryRun = false, now = new Date()) {
  if (!testDate) return torontoDate(now);
  if (!dryRun) fail('WILDWIRE_TEST_DATE can only be used for a dry run.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(testDate)) fail('WILDWIRE_TEST_DATE must use YYYY-MM-DD.');
  const parsed = new Date(`${testDate}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== testDate) fail('WILDWIRE_TEST_DATE is not a valid calendar date.');
  return testDate;
}
function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 64).replace(/-$/, '');
}
function readExisting() {
  return fs.readdirSync(ARTICLES_DIR).filter(name => name.endsWith('.json'))
    .map(name => JSON.parse(fs.readFileSync(path.join(ARTICLES_DIR, name), 'utf8')));
}
function readEditionManifests() {
  if (!fs.existsSync(EDITIONS_DIR)) return [];
  return fs.readdirSync(EDITIONS_DIR).filter(name => /^\d{4}-\d{2}-\d{2}\.json$/.test(name)).sort()
    .map(name => JSON.parse(fs.readFileSync(path.join(EDITIONS_DIR, name), 'utf8')));
}
function uniqueSources(items) {
  const urls = new Set();
  return items.filter(source => {
    if (!source?.url?.startsWith('https://') || urls.has(source.url)) return false;
    urls.add(source.url);
    return true;
  });
}
function responseText(response) {
  return (response.output || []).flatMap(item => item.content || [])
    .filter(item => item.type === 'output_text').map(item => item.text).join('\n').trim();
}
function responseSources(response) {
  const results = [];
  for (const item of response.output || []) {
    for (const source of item.action?.sources || []) results.push(source);
    for (const content of item.content || []) {
      for (const annotation of content.annotations || []) {
        if (annotation.url) results.push({ url: annotation.url, title: annotation.title || annotation.url });
      }
    }
  }
  return uniqueSources(results);
}
function parseJson(value) {
  const cleaned = String(value).trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
  try { return JSON.parse(cleaned); } catch { fail('Model did not return valid JSON.'); }
}

async function apiRequest(payload, label) {
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const raw = await response.text();
      let body;
      try { body = JSON.parse(raw); } catch { body = { error: { message: raw.slice(0, 400) } }; }
      if (response.ok) return body;
      const message = body.error?.message || `HTTP ${response.status}`;
      if (![408, 409, 429, 500, 502, 503, 504].includes(response.status)) fail(`${label}: ${message}`);
      lastError = new Error(`${label}: ${message}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await new Promise(resolve => setTimeout(resolve, 1200 * (2 ** attempt)));
  }
  throw lastError || new Error(`${label} failed after retries.`);
}

async function textCall(input, useSearch = false) {
  const response = await apiRequest({
    model: MODEL,
    input,
    tools: useSearch ? [{ type: 'web_search' }] : [],
    tool_choice: useSearch ? 'required' : undefined,
    include: useSearch ? ['web_search_call.action.sources'] : undefined,
    max_output_tokens: 6200,
  }, useSearch ? 'Research / fact-check' : 'Article generation');
  const text = responseText(response);
  if (!text) fail('Responses API returned no text.');
  return { text, sources: responseSources(response) };
}

function selectedPairings(date) {
  const seed = crypto.createHash('sha256').update(date).digest().readUInt32BE(0);
  return Array.from({ length: CATEGORIES.length + DAILY_READ_COUNT }, (_, index) => PAIRINGS[(seed + index * 3) % PAIRINGS.length]);
}
function imagePrompt(article, pairing, recentDescriptions = []) {
  const categoryDirection = {
    Strength: 'serious, focused partners training with controlled effort; no smiling while lifting',
    Style: 'confident, well-dressed friends with runway energy grounded in attainable real life',
    Explore: 'curious companions discovering a place together, with a real sense of location',
    Culture: 'thoughtful companions paying attention, discussing or questioning something cultural',
    Living: 'warm, capable people sharing food, home life or an everyday ritual',
  }[article.category];
  return [
    'Create a fresh, premium cinematic editorial photograph for WILDWIRE, landscape 3:2, natural textures and realistic attainable people.',
    `Story: ${article.title}. ${article.subtitle}`,
    `People: ${pairing}. The scene must center a couple, family or friends together; never a lone person. Use new faces and a distinct composition, not seen in earlier WILDWIRE editions.`,
    `Direction: ${categoryDirection}.`,
    `Scene concept: ${article.imageConcept}`,
    recentDescriptions.length ? `Avoid repeating these recent WILDWIRE image scenes: ${recentDescriptions.join(' | ')}` : '',
    'No visible text, logos, watermark, extreme body stereotypes or luxury advertising gloss. This is an AI-generated illustration, not a documentary photograph.',
  ].join('\n');
}
async function generateImage(article, pairing, id, existing) {
  const prompt = imagePrompt(article, pairing, existing.slice(-30).map(item => item.imageAlt).filter(Boolean));
  const response = await apiRequest({
    model: MODEL,
    input: prompt,
    tools: [{
      type: 'image_generation', model: IMAGE_MODEL, size: '1536x1024',
      quality: 'medium', output_format: 'webp', output_compression: 82,
    }],
    max_output_tokens: 1600,
  }, `Image generation for ${article.category}`);
  const imageOutput = (response.output || []).find(item => item.type === 'image_generation_call' && item.result);
  if (!imageOutput) fail(`No generated image was returned for ${article.category}.`);
  const bytes = Buffer.from(imageOutput.result, 'base64');
  if (bytes.length < 20_000 || bytes.length > 12_000_000) fail(`Generated image size is invalid for ${article.category}.`);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') fail(`Generated image is not a WebP for ${article.category}.`);
  const reviewed = await apiRequest({
    model: MODEL,
    input: [{ role: 'user', content: [
      { type: 'input_text', text: `Review this proposed WILDWIRE editorial cover for the ${article.category} story "${article.title}". Story concept: ${article.imageConcept}. Intended pairing: ${pairing}. Return JSON only: {"passed":boolean,"peopleCount":number,"issues":[string]}. Pass only if it visibly centers at least two adult people together, fits the stated story concept and category, has no text, logo or watermark, and appears suitable as a polished editorial illustration. Be conservative.` },
      { type: 'input_image', image_url: `data:image/webp;base64,${bytes.toString('base64')}`, detail: 'low' },
    ] }],
    max_output_tokens: 350,
  }, `Visual image check for ${article.category}`);
  const imageCheck = parseJson(responseText(reviewed));
  if (imageCheck.passed !== true || Number(imageCheck.peopleCount) < 2) fail(`Generated cover failed its visual check for ${article.category}: ${(imageCheck.issues || []).join('; ') || 'pair/family not confirmed'}`);
  return { bytes, path: `images/generated/${id}.webp`, prompt, imageCheck };
}

function validateArticle(article, searchedSources, existing, date, pairing) {
  if (!CATEGORIES.includes(article.category)) fail('Invalid article category.');
  if (!article.title || !article.subtitle || !Array.isArray(article.body) || article.body.length < 6) fail('Article structure is incomplete.');
  if (!article.imageAlt) fail('Article image alt text is missing.');
  if (!/\b(couple|family|friends|partners|siblings)\b/i.test(article.imageConcept || '')) {
    const scene = String(article.imageConcept || '').trim();
    article.imageConcept = `${pairing} together, in a specific visual scene about “${article.title}”${scene ? `: ${scene}` : '.'}`;
  }
  if (!Array.isArray(article.sources) || article.sources.length < 3) fail('Each story needs at least three sources.');
  const body = article.body.map(section => `${section[0]}\n${section[1]}`).join('\n');
  const count = tokens(body).length;
  if (count < 800 || count > 1600) fail(`Article length ${count} is outside 800–1,600 words.`);
  if (article.category === 'Living') {
    const finalSection = article.body.at(-1);
    if (!finalSection || tokens(finalSection[1]).length < 50) fail('Living story must finish with a substantial, specific practice or reflection.');
    const ending = slugify(finalSection[0]);
    if (existing.some(old => old.category === 'Living' && slugify(old.body?.at(-1)?.[0] || '') === ending)) fail('Living story repeats an archived closing practice heading.');
  }
  const verified = new Set(searchedSources.map(source => source.url));
  article.sources.forEach((source, index) => {
    if (!source.title || !source.publication || !verified.has(source.url)) fail(`Source ${index + 1} is not a verified research result.`);
    if (!source.authors || /^(?:not specified|unknown|n\/a|not available)\b/i.test(String(source.authors).trim())) fail(`Source ${index + 1} needs verified author or publishing-organization metadata.`);
    if (!body.includes(`[${index + 1}]`)) fail(`Source ${index + 1} has no inline citation.`);
  });
  if (existing.some(old => {
    const oldBody = (old.body || []).map(section => section.join(' ')).join(' ');
    return old.id === article.id || titleOverlap(old.title, article.title) > 0.64 || contentOverlap(`${article.title} ${article.subtitle} ${body}`, `${old.title} ${old.subtitle} ${oldBody}`) > 0.68;
  })) fail(`Possible duplicate story or headline: ${article.title}`);
  article.id = `${slugify(article.title)}-${date.replaceAll('-', '')}`;
  article.date = date;
  article.editionDate = date;
  article.url = `article.html?id=${encodeURIComponent(article.id)}`;
  article.read = Math.max(4, Math.ceil(count / 220));
  article.author = 'WILDWIRE Editorial';
  article.imageCredit = 'AI-generated editorial illustration; depicts no real people or documentary event.';
  return count;
}

async function makeArticle(category, date, pairing, existing, dailyRead = false) {
  const history = existing.map(item => `- ${item.title} (${item.category})`).join('\n');
  const oldLivingEndings = existing.filter(item => item.category === 'Living').map(item => `- ${item.body?.at(-1)?.[0] || 'untitled'}: ${(item.body?.at(-1)?.[1] || '').slice(0, 220)}`).join('\n');
  const researched = await textCall(
    `Research a fresh, useful WILDWIRE ${dailyRead ? 'supplemental Daily Read' : 'pillar'} feature in the ${category} category. Find at least five credible current or primary sources; give exact URLs, publication names, publication dates, verified named author(s) from each source page, and factual notes. Never use placeholders such as “not specified,” “unknown,” or infer authors. If a source lists no individual author, identify its publishing organization as the author. Avoid repeating these archived stories:\n${history}\nThe editorial image will feature ${pairing}. The story itself can focus on a meaningful subject in this pillar. Do not invent quotes, people, results or statistics.`,
    true,
  );
  if (researched.sources.length < 3) fail(`Research returned fewer than three source links for ${category}.`);
  const sourceCandidates = uniqueSources(researched.sources);
  const drafted = await textCall(
    `Write one original, substantial WILDWIRE article in JSON only, based on the research notes below. Voice: intelligent, confident, warm, inclusive and human; no filler, alpha clichés or generic AI phrasing. Keep reporting distinct from commentary. Do not invent interviews, personal experience, statistics or quotations. Category must be ${category}; ${dailyRead ? 'mark this as an additional Daily Read story' : 'this is the main pillar story'}. Write 6–9 useful sections and target 1,000–1,200 words (never fewer than 900). Build each section with real explanation, examples or useful steps, not padding. Put inline [1], [2], [3] citations in the relevant prose. Include concrete steps when the topic is training, cooking or another practical guide. For Living, make the final section a grounded, story-specific practice or reflection of at least 70 words; make its heading distinct from all previous Living endings below. Do not repeat a generic daily ritual.\n\nArchived Living endings:\n${oldLivingEndings}\n\nResearch notes:\n${researched.text}\n\nFor each of the exactly three cited sources, copy the complete exact page title, publication name, date, and named author(s) from the linked source page; do not shorten or paraphrase titles. Never use placeholder author metadata or infer names; if no individual author is listed, use the publishing organization. Use exactly three verified URLs from these search results:\n${JSON.stringify(sourceCandidates)}\n\nReturn: {"category":"${category}","title":"...","subtitle":"...","imageAlt":"...","imageConcept":"a specific, visual scene centered on a couple, family or friends","body":[["section heading","substantial prose"],...],"sources":[{"title":"...","url":"exact verified URL","authors":"...","publication":"..."},...]}`,
  );
  let article = parseJson(drafted.text);
  if (article.category !== category) fail(`Draft category mismatch for ${category}.`);
  const draftWords = tokens((article.body || []).map(section => section.join('\n')).join('\n')).length;
  if (draftWords < 800) {
    const repaired = await textCall(
      `Expand this underlength WILDWIRE article to 1,000–1,200 words across 6–9 useful sections. Preserve its headline, category, angle, source records, and inline [1], [2], [3] citations. Add meaningful explanation, practical detail, tradeoffs, and specific examples grounded only in the supplied research notes. Do not invent sources, quotes, statistics, personal experiences, or factual claims. Return the complete article JSON in the same schema. The final Living section, if applicable, must remain a distinct story-specific practice/reflection of at least 70 words.\n\nRESEARCH NOTES:\n${researched.text}\n\nARTICLE TO EXPAND:\n${JSON.stringify(article)}`,
    );
    article = parseJson(repaired.text);
    if (article.category !== category) fail(`Expanded draft category mismatch for ${category}.`);
  }
  let checked = await textCall(
    `Fact-check the claims and citations in this draft against current credible sources. Return JSON only: {"passed":boolean,"issues":[string],"checkedClaims":[string]}. Fail if any material factual claim is unsupported, a quote is fabricated, or a citation does not support its nearby claim. Check the exact sentence-to-source match; related coverage is not enough.\n\nDRAFT:\n${JSON.stringify(article)}`,
    true,
  );
  let result = parseJson(checked.text);
  let checkedSources = [...checked.sources];
  if (result.passed !== true || !Array.isArray(result.checkedClaims) || result.checkedClaims.length < 3) {
    const repaired = await textCall(
      `Revise this WILDWIRE article to resolve every fact-check issue below, including source metadata. Copy each source’s complete page title exactly as shown on its linked page; correct any shortened or inaccurate title, author, or publication field. Remove or accurately narrow any claim a cited page does not support; change citations only among the exact verified source URLs listed here. Keep the article natural, substantial (1,000–1,200 words), 6–9 useful sections, its category, headline angle, companion-centered editorial image concept and all reliable practical detail. Do not invent facts, studies, sources, quotes, personal experience or author metadata. Do not preserve source titles or metadata that the fact check identified as incorrect. Preserve exactly three verified source records and inline [1], [2], [3] references at the claims they actually support. Return the complete article JSON in the same schema.\n\nFACT-CHECK ISSUES:\n${JSON.stringify(result.issues || [])}\n\nVERIFIED SOURCES:\n${JSON.stringify(sourceCandidates)}\n\nRESEARCH NOTES:\n${researched.text}\n\nARTICLE TO REVISE:\n${JSON.stringify(article)}`,
    );
    article = parseJson(repaired.text);
    if (article.category !== category) fail(`Fact-check repair changed the category for ${category}.`);
    checked = await textCall(
      `Re-check every factual claim and source attribution in this revised article against current credible pages. Be strict about whether the exact cited source supports the exact sentence. Return JSON only: {"passed":boolean,"issues":[string],"checkedClaims":[string]}. Pass only when every material claim is supported and at least three claims are checked.\n\nARTICLE:\n${JSON.stringify(article)}`,
      true,
    );
    result = parseJson(checked.text);
    checkedSources.push(...checked.sources);
  }
  if (result.passed !== true || !Array.isArray(result.checkedClaims) || result.checkedClaims.length < 3) fail(`Fact check failed for ${category}: ${(result.issues || []).join('; ') || 'not enough checked claims'}`);
  const allSources = uniqueSources([...researched.sources, ...checkedSources]);
  const wordCount = validateArticle(article, allSources, existing, date, pairing);
  if (dailyRead) article.dailyRead = true;
  return { article, wordCount, sourcesChecked: result.checkedClaims.length, sourceResults: allSources };
}

async function main() {
  if (!TOKEN) fail('Missing OPENAI_API_KEY. No content files were changed.');
  const date = editionDate(process.env.WILDWIRE_TEST_DATE || '', DRY_RUN);
  const existing = readExisting();
  const priorTileDescriptions = readEditionManifests().slice(-30).flatMap(manifest => Object.values(manifest.pillarImages || {}).map(tile => tile.alt).filter(Boolean));
  const existingWithTileHistory = [...existing, ...priorTileDescriptions.map((imageAlt, index) => ({ id: `prior-pillar-tile-${index}`, imageAlt }))];
  const alreadyPublishedToday = editionArticles(existing, date);
  if (CATEGORIES.every(category => alreadyPublishedToday.some(item => item.category === category && !item.dailyRead)) && alreadyPublishedToday.filter(item => item.dailyRead === true).length === DAILY_READ_COUNT) {
    console.log(JSON.stringify({ status: 'ALREADY_PUBLISHED', date, articles: alreadyPublishedToday.map(item => item.id) }, null, 2));
    return;
  }
  if (alreadyPublishedToday.length) fail(`Found a partial WILDWIRE edition dated ${date}; refusing to add stories to it.`);
  const pairings = selectedPairings(date);
  const results = [];
  const assignments = [...CATEGORIES.map(category => ({ category, dailyRead: false })), ...Array.from({ length: DAILY_READ_COUNT }, (_, index) => ({ category: DAILY_READ_CATEGORIES[(new Date(date + 'T00:00:00Z').getUTCDate() + index) % DAILY_READ_CATEGORIES.length], dailyRead: true }))];
  for (let index = 0; index < assignments.length; index++) {
    const previousInEdition = results.map(item => item.article);
    const { category, dailyRead } = assignments[index];
    const result = await makeArticle(category, date, pairings[index], [...existing, ...previousInEdition], dailyRead);
    const candidateId = `${slugify(result.article.title)}-${date.replaceAll('-', '')}`;
    if (existing.some(item => item.id === candidateId) || results.some(item => item.article.id === candidateId)) fail(`Output already exists; refusing overwrite: ${candidateId}`);
    const image = await generateImage(result.article, pairings[index], candidateId, [...existingWithTileHistory, ...results.map(item => item.article)]);
    result.article.image = image.path;
    result.article.imagePrompt = image.prompt;
    result.article.imageGenerator = IMAGE_MODEL;
    result.article.imageUsage = 'AI-generated editorial illustration; no real people or documentary event.';
    result.article.imageVisualCheck = image.imageCheck;
    results.push({ ...result, image });
    console.log(`Validated ${dailyRead ? 'Daily Read' : category}: ${result.wordCount} words, ${result.article.sources.length} citations, image ${image.bytes.length} bytes.`);
  }
  const pillarImages = [];
  for (const [index, category] of CATEGORIES.entries()) {
    const concept = PILLAR_SCENES[category];
    const tileArticle = { category, title: `Take the wider view: ${category}`, subtitle: concept, imageAlt: concept, imageConcept: concept };
    const id = `pillar-${category.toLowerCase()}-${date.replaceAll('-', '')}`;
    const pairing = pairings[(index + 1) % pairings.length];
    const image = await generateImage(tileArticle, pairing, id, [...existingWithTileHistory, ...results.map(item => item.article), ...pillarImages.map(item => ({ imageAlt: item.imageAlt }))]);
    pillarImages.push({ category, imageAlt: concept, image, imageConcept: concept });
    console.log(`Validated fresh ${category} pillar tile image: ${image.bytes.length} bytes.`);
  }
  const allImages = [...results.map(item => item.image.path), ...pillarImages.map(item => item.image.path)];
  if (new Set(allImages).size !== assignments.length + CATEGORIES.length) fail('Image reuse detected in the daily edition and pillar tiles.');
  if (DRY_RUN) {
    console.log(JSON.stringify({
      status: 'DRY_RUN_PASSED', date, articles: results.map(({ article, wordCount, sourcesChecked, image }) => ({
        id: article.id, category: article.category, title: article.title, words: wordCount,
        sources: article.sources.length, claimsChecked: sourcesChecked, generatedImage: image.path,
      })), pillarTileImages: pillarImages.map(({ category, image }) => ({ category, generatedImage: image.path })),
    }, null, 2));
    return;
  }

  fs.mkdirSync(IMAGE_DIR, { recursive: true });
  const written = [];
  try {
    for (const item of results) {
      const articlePath = path.join(ARTICLES_DIR, `${item.article.id}.json`);
      const imagePath = path.join(ROOT, item.image.path);
      if (fs.existsSync(articlePath) || fs.existsSync(imagePath)) fail(`Refusing to overwrite ${item.article.id}`);
      fs.writeFileSync(imagePath, item.image.bytes, { flag: 'wx' });
      written.push(imagePath);
      fs.writeFileSync(articlePath, JSON.stringify(item.article, null, 2) + '\n', { flag: 'wx' });
      written.push(articlePath);
    }
    for (const item of pillarImages) {
      const imagePath = path.join(ROOT, item.image.path);
      if (fs.existsSync(imagePath)) fail(`Refusing to overwrite pillar image ${item.category}`);
      fs.writeFileSync(imagePath, item.image.bytes, { flag: 'wx' });
      written.push(imagePath);
    }
    fs.mkdirSync(EDITIONS_DIR, { recursive: true });
    const editionPath = path.join(EDITIONS_DIR, `${date}.json`);
    if (fs.existsSync(editionPath)) fail(`Refusing to overwrite edition manifest ${date}`);
    const manifest = { date, articles: results.map(({ article }) => article.id), pillarImages: Object.fromEntries(pillarImages.map(({ category, image, imageAlt, imageConcept }) => [category, { image: image.path, alt: imageAlt, prompt: image.prompt, imageGenerator: IMAGE_MODEL, imageUsage: 'AI-generated editorial illustration; no real people or documentary event.', visualCheck: image.imageCheck }])) };
    fs.writeFileSync(editionPath, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
    written.push(editionPath);
    const catalog = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: ROOT, encoding: 'utf8' });
    if (catalog.status !== 0) fail(`Catalog build failed: ${catalog.stderr || catalog.stdout}`);
    console.log(`WILDWIRE edition ${date} staged: eight stories (five pillars and three Daily Reads), plus five unique pillar tile images; thirteen generated images total. Run all content and functional checks before committing.`);
  } catch (error) {
    for (const file of written.reverse()) fs.rmSync(file, { force: true });
    require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: ROOT, encoding: 'utf8' });
    throw error;
  }
}

if (require.main === module) main().catch(error => {
  console.error(`WILDWIRE edition failed closed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { torontoDate, editionDate, editionArticles, selectedPairings, imagePrompt, titleOverlap, contentOverlap, validateArticle, DAILY_READ_COUNT, DAILY_READ_CATEGORIES };
