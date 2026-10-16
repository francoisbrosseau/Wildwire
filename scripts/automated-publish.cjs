const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles');
const IMAGE_DIR = path.join(ROOT, 'images', 'generated');
const TOKEN = process.env.OPENAI_API_KEY;
const MODEL = process.env.WILDWIRE_MODEL || 'gpt-6-luna';
const IMAGE_MODEL = process.env.WILDWIRE_IMAGE_MODEL || 'gpt-image-2.5-flare';
const DRY_RUN = process.env.WILDWIRE_DRY_RUN === 'true';
const CATEGORIES = ['Strength', 'Style', 'Explore', 'Culture', 'Living'];
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
  return CATEGORIES.map((_, index) => PAIRINGS[(seed + index * 3) % PAIRINGS.length]);
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
      { type: 'input_text', text: 'Review this proposed editorial cover. Return JSON only: {"passed":boolean,"peopleCount":number,"issues":[string]}. Pass only if it visibly centers at least two adult people together, matches the story concept, has no text, logo or watermark, and appears suitable as a polished editorial illustration. Be conservative.' },
      { type: 'input_image', image_url: `data:image/webp;base64,${bytes.toString('base64')}`, detail: 'low' },
    ] }],
    max_output_tokens: 350,
  }, `Visual image check for ${article.category}`);
  const imageCheck = parseJson(responseText(reviewed));
  if (imageCheck.passed !== true || Number(imageCheck.peopleCount) < 2) fail(`Generated cover failed its visual check for ${article.category}: ${(imageCheck.issues || []).join('; ') || 'pair/family not confirmed'}`);
  return { bytes, path: `images/generated/${id}.webp`, prompt, imageCheck };
}

function validateArticle(article, searchedSources, existing, date) {
  if (!CATEGORIES.includes(article.category)) fail('Invalid article category.');
  if (!article.title || !article.subtitle || !Array.isArray(article.body) || article.body.length < 6) fail('Article structure is incomplete.');
  if (!article.imageConcept || !article.imageAlt || !/\b(couple|family|friends|partners|siblings)\b/i.test(article.imageConcept)) fail('Image concept must explicitly center companions.');
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
  article.url = `article.html?id=${encodeURIComponent(article.id)}`;
  article.read = Math.max(4, Math.ceil(count / 220));
  article.author = 'WILDWIRE Editorial';
  article.imageCredit = 'AI-generated editorial illustration; depicts no real people or documentary event.';
  return count;
}

async function makeArticle(category, date, pairing, existing) {
  const history = existing.map(item => `- ${item.title} (${item.category})`).join('\n');
  const oldLivingEndings = existing.filter(item => item.category === 'Living').map(item => `- ${item.body?.at(-1)?.[0] || 'untitled'}: ${(item.body?.at(-1)?.[1] || '').slice(0, 220)}`).join('\n');
  const researched = await textCall(
    `Research a fresh, useful WILDWIRE feature in the ${category} pillar. Find at least five credible current or primary sources; give exact URLs, publication names, publication dates, verified named author(s) from each source page, and factual notes. For training, health, nutrition or cooking topics, prioritize authoritative public-health, clinical or government sources for any safety and practical guidance. Never use placeholders such as “not specified,” “unknown,” or infer authors. If a source lists no individual author, identify its publishing organization as the author. Avoid repeating these archived stories:\n${history}\nThe editorial image will feature ${pairing}. The story itself can focus on a meaningful subject in this pillar. Do not invent quotes, people, results or statistics.`,
    true,
  );
  if (researched.sources.length < 3) fail(`Research returned fewer than three source links for ${category}.`);
  const sourceCandidates = uniqueSources(researched.sources);
  const drafted = await textCall(
    `Write one original, substantial WILDWIRE article in JSON only, based on the research notes below. Voice: intelligent, confident, warm, inclusive and human; no filler, alpha clichés or generic AI phrasing. Keep reporting distinct from commentary. Do not invent interviews, personal experience, statistics or quotations. Category must be ${category}. Write 6–9 useful sections and 800–1,600 words. Put inline [1], [2], [3] citations immediately beside material factual claims. Every health, safety, training, nutrition or cooking recommendation—including warning signs and contraindications—must be directly supported by one of the linked sources and cited beside it. Do not add generic symptom lists or safety warnings unless a source supports them; if the sources do not support a warning, omit it or clearly frame it as a general non-clinical precaution. Include concrete steps when the topic is training, cooking or another practical guide. For Living, make the final section a grounded, story-specific practice or reflection of at least 70 words; make its heading distinct from all previous Living endings below. Do not repeat a generic daily ritual.\n\nArchived Living endings:\n${oldLivingEndings}\n\nResearch notes:\n${researched.text}\n\nFor each of the exactly three cited sources, verify the title, publication, date, and named author(s) against the linked source page. Never use placeholder author metadata or infer names; if no individual author is listed, use the publishing organization. Use exactly three verified URLs from these search results:\n${JSON.stringify(sourceCandidates)}\n\nReturn: {"category":"${category}","title":"...","subtitle":"...","imageAlt":"...","imageConcept":"a specific, visual scene centered on a couple, family or friends","body":[["section heading","substantial prose"],...],"sources":[{"title":"...","url":"exact verified URL","authors":"...","publication":"..."},...]}`,
  );
  let article = parseJson(drafted.text);
  if (article.category !== category) fail(`Draft category mismatch for ${category}.`);
  const repairSources = [];
  let checked;
  let result;
  for (let attempt = 0; attempt < 3; attempt++) {
    checked = await textCall(
      `Fact-check the claims, citations, and health or safety recommendations in this draft against current credible sources. Treat every warning, contraindication and practical health recommendation as a factual claim that needs direct source support and a nearby citation. Return JSON only: {"passed":boolean,"issues":[string],"checkedClaims":[string]}. Fail if any material factual claim is unsupported, a quote is fabricated, or a citation does not support its nearby claim.\n\nDRAFT:\n${JSON.stringify(article)}`,
      true,
    );
    result = parseJson(checked.text);
    if (result.passed === true && Array.isArray(result.checkedClaims) && result.checkedClaims.length >= 3) break;
    if (attempt === 2) fail(`Fact check failed for ${category}: ${(result.issues || []).join('; ') || 'not enough checked claims'}`);
    repairSources.push(...checked.sources);
    const availableSources = uniqueSources([...sourceCandidates, ...repairSources]);
    const repaired = await textCall(
      `Repair this draft using the fact-check issues below. Correct every unsupported claim or citation mismatch. Remove recommendations or specifics that the verified sources do not directly support. Do not invent facts, quotations, authors or source metadata. Add current credible sources through web research when needed, then cite each material factual claim immediately with [1], [2], or [3]. Keep the article in the ${category} category, maintain the WILDWIRE voice and 800–1,600 word range, and return the full article JSON with exactly three source objects. Each source must use an exact URL from the verified search results supplied below and include its real title, named author(s) or publishing organization, and publication. If a claim cannot be supported, remove it.\n\nFact-check issues:\n${JSON.stringify(result.issues || [])}\n\nCurrent article:\n${JSON.stringify(article)}\n\nVerified source candidates:\n${JSON.stringify(availableSources)}`,
      true,
    );
    repairSources.push(...repaired.sources);
    article = parseJson(repaired.text);
    if (article.category !== category) fail(`Repair category mismatch for ${category}.`);
  }
  const allSources = uniqueSources([...researched.sources, ...repairSources, ...checked.sources]);
  const wordCount = validateArticle(article, allSources, existing, date);
  return { article, wordCount, sourcesChecked: result.checkedClaims.length, sourceResults: allSources };
}

async function main() {
  if (!TOKEN) fail('Missing OPENAI_API_KEY. No content files were changed.');
  const date = editionDate(process.env.WILDWIRE_TEST_DATE || '', DRY_RUN);
  const existing = readExisting();
  const alreadyPublishedToday = existing.filter(item => item.date === date);
  if (CATEGORIES.every(category => alreadyPublishedToday.some(item => item.category === category))) {
    console.log(JSON.stringify({ status: 'ALREADY_PUBLISHED', date, articles: alreadyPublishedToday.map(item => item.id) }, null, 2));
    return;
  }
  if (alreadyPublishedToday.length) fail(`Found a partial WILDWIRE edition dated ${date}; refusing to add stories to it.`);
  const pairings = selectedPairings(date);
  const results = [];
  for (let index = 0; index < CATEGORIES.length; index++) {
    const previousInEdition = results.map(item => item.article);
    const result = await makeArticle(CATEGORIES[index], date, pairings[index], [...existing, ...previousInEdition]);
    const candidateId = `${slugify(result.article.title)}-${date.replaceAll('-', '')}`;
    if (existing.some(item => item.id === candidateId) || results.some(item => item.article.id === candidateId)) fail(`Output already exists; refusing overwrite: ${candidateId}`);
    const image = await generateImage(result.article, pairings[index], candidateId, existing);
    result.article.image = image.path;
    result.article.imagePrompt = image.prompt;
    result.article.imageGenerator = IMAGE_MODEL;
    result.article.imageUsage = 'AI-generated editorial illustration; no real people or documentary event.';
    result.article.imageVisualCheck = image.imageCheck;
    results.push({ ...result, image });
    console.log(`Validated ${CATEGORIES[index]}: ${result.wordCount} words, ${result.article.sources.length} citations, image ${image.bytes.length} bytes.`);
  }
  if (new Set(results.map(item => item.article.image)).size !== CATEGORIES.length) fail('Image reuse detected in the daily edition.');
  if (DRY_RUN) {
    console.log(JSON.stringify({
      status: 'DRY_RUN_PASSED', date, articles: results.map(({ article, wordCount, sourcesChecked, image }) => ({
        id: article.id, category: article.category, title: article.title, words: wordCount,
        sources: article.sources.length, claimsChecked: sourcesChecked, generatedImage: image.path,
      })),
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
    const catalog = require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: ROOT, encoding: 'utf8' });
    if (catalog.status !== 0) fail(`Catalog build failed: ${catalog.stderr || catalog.stdout}`);
    console.log(`WILDWIRE edition ${date} staged: five stories, five unique generated images. Run all content and functional checks before committing.`);
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

module.exports = { torontoDate, editionDate, selectedPairings, imagePrompt, titleOverlap, contentOverlap, validateArticle };
