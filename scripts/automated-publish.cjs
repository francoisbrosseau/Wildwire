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
let runDirectory;
let runReport;
function saveReport() {
  if (runDirectory && runReport) fs.writeFileSync(path.join(runDirectory, 'report.json'), JSON.stringify(runReport, null, 2) + '\n');
}
function log(message) { console.log(`${new Date().toISOString()} ${message}`); }
const CATEGORIES = ['Strength', 'Style', 'Explore', 'Culture', 'Living', 'Finance'];
const DAILY_READ_COUNT = 3;
const DAILY_READ_CATEGORIES = ['Living', 'Culture', 'Explore', 'Living', 'Style'];
const PILLAR_SCENES = {
  Finance: 'Two thoughtful friends review household money questions with a notebook and calculator in a modest, lived-in setting.',
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
  'two adult friends of different genders',
  'two women partners with distinct builds and features',
  'a couple of different ethnic backgrounds sharing a thoughtful moment',
  'two adult siblings or close friends collaborating',
  'an adult couple with one older family member',
];

const fail = message => { throw new Error(message); };
const tokens = value => String(value || '').toLowerCase().match(/[a-z0-9]{3,}/g) || [];
const countWords = value => String(value || '').split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word) && !/^\[\d+\]$/.test(word)).length;

function assertFreshImages(images, previousFiles) {
  const hashes = new Map();
  for (const file of new Set(previousFiles)) if (fs.existsSync(file)) hashes.set(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), file);
  for (const image of images) {
    const hash = crypto.createHash('sha256').update(image.bytes).digest('hex');
    if (hashes.has(hash)) fail(`Image content is repeated: ${image.path} matches ${hashes.get(hash)}`);
    hashes.set(hash, image.path);
  }
}
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
  const sources = new Map();
  for (const source of items) {
    if (!source?.url?.startsWith('https://')) continue;
    const prior = sources.get(source.url) || {};
    sources.set(source.url, { ...prior, ...Object.fromEntries(Object.entries(source).filter(([, value]) => value !== undefined && value !== '')) });
  }
  return [...sources.values()];
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

function articleSchema(sourceCandidates) {
  return {
    type: 'object', additionalProperties: false,
    required: ['category', 'title', 'subtitle', 'imageAlt', 'imageConcept', 'body', 'sources'],
    properties: {
      category: { type: 'string', enum: CATEGORIES },
      ...Object.fromEntries(['title', 'subtitle', 'imageAlt', 'imageConcept'].map(key => [key, { type: 'string' }])),
      body: { type: 'array', minItems: 6, maxItems: 9, items: { type: 'array', minItems: 2, maxItems: 2, items: { type: 'string' } } },
      sources: { type: 'array', minItems: 3, maxItems: 3, items: {
        type: 'object', additionalProperties: false,
        required: ['sourceId', 'title', 'authors', 'publication'],
        properties: {
          sourceId: { type: 'string', enum: sourceCandidates.map(source => source.sourceId) },
          ...Object.fromEntries(['title', 'authors', 'publication'].map(key => [key, { type: 'string' }])),
        },
      } },
    },
  };
}

function bindSources(article, sourceCandidates) {
  const registry = new Map(sourceCandidates.map(source => [source.sourceId, source]));
  if (!Array.isArray(article.sources) || article.sources.length !== 3) fail('The draft must cite exactly three registered sources.');
  const seen = new Set();
  article.sources = article.sources.map(source => {
    const registered = registry.get(source.sourceId);
    if (!registered || seen.has(source.sourceId)) fail(`Invalid or repeated research source ID: ${source.sourceId}`);
    seen.add(source.sourceId);
    // The model selects an ID; only the verified research registry supplies URLs.
    return { ...source, url: registered.url };
  });
  return article;
}

function normalizeReviewSourceIds(article) {
  // Research can select sparse IDs (S4, S8, S12). The review only sees the
  // three cited pages, so give those pages IDs matching their citation order.
  return { ...article, sources: article.sources.map((source, index) => ({
    ...source, researchSourceId: source.researchSourceId || source.sourceId, sourceId: `S${index + 1}`,
  })) };
}

function canonicalEvidenceUrl(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') fail('Evidence must use HTTPS.');
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  url.searchParams.sort();
  return url.href.replace(/\/$/, '');
}

function applyVerifiedCorrections(article, review) {
  const revised = structuredClone(article);
  let changes = 0;
  for (const correction of review.sourceCorrections || []) {
    const source = revised.sources.find(item => item.sourceId === correction.sourceId);
    if (!source) fail('Fact-check correction references an unknown source ID.');
    if (canonicalEvidenceUrl(correction.evidenceUrl) !== canonicalEvidenceUrl(source.url)) fail('Source metadata correction must be grounded in its own cited page.');
    for (const key of ['title', 'authors', 'publication']) {
      if (typeof correction[key] !== 'string' || !correction[key].trim() || /^(?:unknown|not specified|n\/a)\b/i.test(correction[key])) fail(`Invalid verified source correction: ${key}.`);
      if (source[key] !== correction[key].trim()) changes++;
      source[key] = correction[key].trim();
    }
  }
  const allowed = new Set(revised.sources.map(source => canonicalEvidenceUrl(source.url)));
  for (const correction of review.textCorrections || []) {
    const section = revised.body[correction.sectionIndex];
    if (!Number.isInteger(correction.sectionIndex) || !section || typeof correction.original !== 'string' || !correction.original.trim() || typeof correction.replacement !== 'string') fail('Invalid targeted text correction.');
    if (section[1].split(correction.original).length !== 2) fail('Fact-check text correction did not match exactly one passage.');
    if (correction.replacement.trim() && (!correction.evidenceUrl || !allowed.has(canonicalEvidenceUrl(correction.evidenceUrl)))) fail('Replacement factual text needs evidence from a cited source.');
    if (correction.original !== correction.replacement) changes++;
    const evidenceIndex = correction.replacement.trim() ? revised.sources.findIndex(source => canonicalEvidenceUrl(source.url) === canonicalEvidenceUrl(correction.evidenceUrl)) + 1 : 0;
    const replacement = correction.replacement.replace(/\[\d+\]/g, `[${evidenceIndex}]`);
    section[1] = section[1].replace(correction.original, replacement).replace(/ {2,}/g, ' ').trim();
  }
  return { article: revised, changes };
}

async function reviewArticle(article, category, round) {
  const checked = await textCall(
    `Act as a careful WILDWIRE fact-checker. Open the exact cited pages and check material factual claims, nearby inline citations, and source metadata against those exact pages. The sourceId and URL mapping is fixed. Inline citation numbers are positions in ARTICLE.sources, NOT numbers from sourceId or research notes. Citation [1] MUST mean sources[0], [2] sources[1], [3] sources[2]. Check every numbered citation against that exact mapping, including already factual prose. Return textCorrections for mismatched numbers. Replacement citations must refer to the provided evidenceUrl, and no other page. Explicitly check that every one of the three sources is used at a supported claim and no citation number is outside 1–3. Do not mix the byline of a university repost with its original publication, or mix author names from different repository records. Use the cited page's own byline/preferred citation. Preserve a credited author name variant when it clearly identifies the same person; report a correction if it is genuinely inaccurate. Commentary, interpretation and explicitly framed practical suggestions need not be direct quotations from research, but must not be attributed to a study as findings the study did not establish. Check whether a claimed finding is actually supported.\n\nReturn one JSON object ONLY, with no markdown or text outside it:\n{"passed":boolean,"issues":["material problems still present"],"checkedClaims":["at least three precise claims verified against their cited pages"],"sourceCorrections":[{"sourceId":"S1","title":"complete title on that cited page","authors":"exact byline or publishing organization when no individual author is credited","publication":"publisher of that page","evidenceUrl":"the exact cited page URL"}],"textCorrections":[{"sectionIndex":0,"original":"EXACT existing sentence or short passage from that section's prose","replacement":"precise supported replacement, or empty string to delete an unsupported claim","evidenceUrl":"cited source supporting the replacement; empty only for deletion"}]}\n\nFor every fixable issue provide the direct correction, not just instructions to a writer. For citation-number mismatches specifically, return an exact textCorrection that changes the incorrect inline [number] to the number of the source supporting that claim (while preserving surrounding words), with that source's exact evidenceUrl. Do not merely describe a citation-number mismatch in issues without supplying this concrete grounded correction. sectionIndex is zero-based. original must match exactly once in that section; copy it character for character. Prefer deleting an unverifiable sentence to introducing new facts. Do not rewrite unaffected paragraphs. For a source metadata problem return the full correct metadata grounded only in that SAME cited page. Never invent missing names. If a material issue cannot be resolved from the cited evidence, list it and leave passed false. Return passed true only with no remaining issues and no requested corrections. Do not include a new unsupported concern solely because a previous reviewer requested edits; judge this actual version.\n\nARTICLE:\n${JSON.stringify(article)}`,
    true, null, `${category}: ${round ? 'verify targeted corrections' : 'fact-check'}`,
  );
  let review;
  try { review = parseJson(checked.text); } catch {
    const formatted = await textCall(`Convert the following fact-check report into its requested JSON object. Preserve every finding and correction exactly; do not add research, approve a failed report, infer missing evidence or alter quoted source text. If it cannot be represented faithfully, use passed:false with the explanation in issues. Include arrays issues, checkedClaims, sourceCorrections and textCorrections. Return JSON only.\n${checked.text}`, false, null, `${category}: format fact-check report`);
    review = parseJson(formatted.text);
  }
  if (!Array.isArray(review.issues) || !Array.isArray(review.checkedClaims) || !Array.isArray(review.sourceCorrections) || !Array.isArray(review.textCorrections)) fail('Fact-check report is missing required evidence/correction arrays.');
  if (review.issues.length || review.sourceCorrections.length || review.textCorrections.length) review.passed = false;
  return { review, sources: checked.sources };
}

async function pollResponse(body, payload, label, { sleep = ms => new Promise(resolve => setTimeout(resolve, ms)), now = Date.now, timeoutMs = 600000 } = {}) {
  const deadline = now() + timeoutMs;
  const id = body.id;
  if (!id) fail(`${label}: background response has no ID.`);
  const url = new URL(`https://api.openai.com/v1/responses/${encodeURIComponent(id)}`);
  for (const field of payload.include || []) url.searchParams.append('include[]', field);
  while (['queued', 'in_progress'].includes(body.status)) {
    if (now() >= deadline) fail(`${label}: background response ${id} exceeded its polling deadline; no duplicate request submitted.`);
    await sleep(2000);
    let response;
    try {
      response = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` }, signal: AbortSignal.timeout(30000) });
    } catch (error) {
      log(`${label}: retrieval interrupted; continuing to poll the same response.`);
      continue;
    }
    if ([408, 409, 429, 500, 502, 503, 504].includes(response.status)) continue;
    if (!response.ok) fail(`${label}: background retrieval failed with HTTP ${response.status}.`);
    body = await response.json();
  }
  return body;
}

async function apiRequest(payload, label) {
  if (payload.tools?.some(tool => ['web_search', 'web_search_preview'].includes(tool.type))) payload = { ...payload, background: true };
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    const started = Date.now();
    let retryable = true;
    log(`${label}: request ${attempt + 1}/3 started.`);
    const heartbeat = setInterval(() => log(`${label}: still waiting (${Math.round((Date.now() - started) / 1000)}s).`), 45000);
    heartbeat.unref();
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(payload.background ? 60000 : 300000),
      });
      const raw = await response.text();
      let body;
      try { body = JSON.parse(raw); } catch { body = { error: { message: raw.slice(0, 400) } }; }
      if (response.ok) {
        if (['queued', 'in_progress'].includes(body.status)) {
          // Once accepted, retrieve this response; never restart paid research
          // merely because a polling request or the bounded wait failed.
          retryable = false;
          body = await pollResponse(body, payload, label);
        }
        if (body.status && body.status !== 'completed') {
          const truncated = body.status === 'incomplete' && body.incomplete_details?.reason === 'max_output_tokens';
          const previousLimit = payload.max_output_tokens || 8000;
          retryable = truncated && previousLimit < 32000;
          if (retryable) payload = { ...payload, max_output_tokens: Math.min(previousLimit * 2, 32000) };
          if (runReport) {
            runReport.requests.push({ label, status: body.status, reason: body.incomplete_details?.reason, model: payload.model, usage: body.usage || null });
            saveReport();
          }
          fail(`${label}: API response ${body.status} (${body.incomplete_details?.reason || body.error?.message || 'no complete output'}).`);
        }
        log(`${label}: completed in ${Math.round((Date.now() - started) / 1000)}s.`);
        if (runReport) {
          runReport.requests.push({ label, seconds: Math.round((Date.now() - started) / 1000), model: payload.model, usage: body.usage || null,
            tools: (body.output || []).filter(item => /_call$/.test(item.type || '')).map(item => ({ type: item.type, model: item.model || null, usage: item.usage || null })) });
          saveReport();
        }
        return body;
      }
      const message = body.error?.message || `HTTP ${response.status}`;
      retryable = [408, 409, 429, 500, 502, 503, 504].includes(response.status) && !['insufficient_quota', 'billing_hard_limit_reached'].includes(body.error?.code);
      lastError = new Error(`${label}: ${message}`);
    } catch (error) {
      lastError = error;
    } finally {
      clearInterval(heartbeat);
    }
    if (!retryable) throw lastError;
    log(`${label}: ${lastError.message}; ${attempt < 2 ? 'retrying transient failure' : 'retry limit reached'}.`);
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 1500 * (2 ** attempt)));
  }
  throw lastError || new Error(`${label} failed after retries.`);
}

async function textCall(input, useSearch = false, schema = null, label = '') {
  const response = await apiRequest({
    model: MODEL,
    input,
    text: { format: useSearch ? { type: 'text' } : schema ? { type: 'json_schema', name: 'wildwire_article', strict: true, schema } : { type: 'json_object' } },
    tools: useSearch ? [{ type: 'web_search' }] : [],
    tool_choice: useSearch ? 'required' : undefined,
    include: useSearch ? ['web_search_call.action.sources'] : undefined,
    max_output_tokens: useSearch ? 16000 : 8000,
  }, label || (useSearch ? 'Research / fact-check' : 'Article generation'));
  const text = responseText(response);
  if (!text) fail('Responses API returned no text.');
  return { text, sources: responseSources(response) };
}

function selectedPairings(date) {
  const seed = crypto.createHash('sha256').update(date).digest().readUInt32BE(0);
  return Array.from({ length: CATEGORIES.length + DAILY_READ_COUNT + 1 }, (_, index) => PAIRINGS[(seed + index * 3) % PAIRINGS.length]);
}
function imagePrompt(article, pairing, recentDescriptions = []) {
  const categoryDirection = {
    Finance: 'attentive partners or friends discussing everyday money in a realistic setting, no luxury or get-rich imagery',
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
async function generateImage(article, pairing, id, existing, attempt = 0) {
  const checkpoint = path.join(runDirectory, `${id}.webp`);
  const metadata = path.join(runDirectory, `${id}.image.json`);
  if (fs.existsSync(checkpoint) && fs.existsSync(metadata)) {
    const saved = JSON.parse(fs.readFileSync(metadata, 'utf8'));
    const bytes = fs.readFileSync(checkpoint);
    if (saved.imageCheck?.passed === true && saved.imageCheck.peopleCount >= 2 && bytes.length > 20000 && saved.sha256 === crypto.createHash('sha256').update(bytes).digest('hex')) {
      log(`${article.category}: recovered validated image ${id}.`);
      return { ...saved, bytes };
    }
  }
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
      { type: 'input_text', text: `Review this proposed WILDWIRE editorial cover for the ${article.category} story "${article.title}". Story concept: ${article.imageConcept}. Intended pairing: ${pairing}. Return JSON only: {"passed":boolean,"peopleCount":number,"issues":[string]}. Pass if it visibly centers at least two adult people together, fits the stated story concept and category, has no text, logo or watermark, and looks like a polished premium magazine editorial image. Accept either cinematic editorial photography or a clearly intentional editorial illustration; do not reject an image merely because it is photorealistic. Be conservative about subject count, relevance, and artifacts.` },
      { type: 'input_image', image_url: `data:image/webp;base64,${bytes.toString('base64')}`, detail: 'low' },
    ] }],
    max_output_tokens: 350,
  }, `Visual image check for ${article.category}`);
  const imageCheck = parseJson(responseText(reviewed));
  if (imageCheck.passed !== true || Number(imageCheck.peopleCount) < 2) {
    const issues = (imageCheck.issues || []).join('; ') || 'pair/family not confirmed';
    if (!attempt) {
      log(`${article.category}: cover rejected (${issues}); generating one corrected image.`);
      return generateImage({ ...article, imageConcept: `${article.imageConcept}. Correct these previous image errors: ${issues}. Make the required companions unmistakable.` }, pairing, id, existing, 1);
    }
    fail(`Generated cover failed its visual check for ${article.category}: ${issues}`);
  }
  const result = { path: `images/generated/${id}.webp`, prompt, imageCheck, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  fs.writeFileSync(checkpoint, bytes);
  fs.writeFileSync(metadata, JSON.stringify(result, null, 2) + '\n');
  runReport.images.push({ id, category: article.category, path: result.path, imageCheck, bytes: bytes.length });
  saveReport();
  return { ...result, bytes };
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
  if ([...body.matchAll(/\[(\d+)\]/g)].some(match => Number(match[1]) < 1 || Number(match[1]) > article.sources.length)) fail('Article contains an out-of-range inline citation.');
  const count = countWords(body);
  if (count < 800 || count > 2000) fail(`Article length ${count} is outside 800–2,000 words.`);
  if (article.category === 'Living') {
    const finalSection = article.body.at(-1);
    if (!finalSection || tokens(finalSection[1]).length < 50) fail('Living story must finish with a substantial, specific practice or reflection.');
    const ending = slugify(finalSection[0]);
    if (existing.some(old => old.category === 'Living' && slugify(old.body?.at(-1)?.[0] || '') === ending)) fail('Living story repeats an archived closing practice heading.');
  }
  const verified = new Set(searchedSources.map(source => source.url));
  article.sources.forEach((source, index) => {
    if (!source.title || !source.publication) fail(`Source ${index + 1} is missing title or publication metadata.`);
    if (!verified.has(source.url)) fail(`Source ${index + 1} URL is not a verified research result: ${source.url}`);
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

async function makeArticle(category, date, pairing, existing, dailyRead = false, rejectedTopics = [], spiritFeature = false) {
  const history = existing.map(item => `- ${item.title} (${item.category})`).join('\n');
  const oldLivingEndings = existing.filter(item => item.category === 'Living').map(item => `- ${item.body?.at(-1)?.[0] || 'untitled'}: ${(item.body?.at(-1)?.[1] || '').slice(0, 220)}`).join('\n');
  const researched = await textCall(
    `Research a fresh, useful WILDWIRE ${spiritFeature ? 'independent Mind & Spirit feature about meditation, mindful breathing, reflective rituals or emotional wellness (NOT the Living pillar or a Daily Read)' : dailyRead ? 'supplemental Daily Read' : 'pillar'} feature in the ${category} category. Find at least five credible current or primary sources; give exact URLs, publication names, publication dates, verified named author(s) from each source page, and factual notes. Never use placeholders such as “not specified,” “unknown,” or infer authors. If a source lists no individual author, identify its publishing organization as the author. Avoid repeating these archived stories:\n${history}\nRejected candidate topics that must NOT be repeated: ${JSON.stringify(rejectedTopics)}. If any candidate was rejected, choose a substantially different, simpler-to-verify angle and different sources, not a paraphrase of the rejected story.\n${spiritFeature ? 'For Mind & Spirit, choose a fresh, distinct grounded mindfulness, gentle breathing, meditation, reflection, spirituality or emotional-wellness practice. Explain steps and limitations without medical treatment claims, supernatural promises or forced breathing. Never reuse the Living pillar angle. ' : ''}For Finance, cover financial literacy such as saving, investing concepts, mortgage mechanics or cryptocurrency risks. Use official primary sources. State the relevant jurisdiction for laws, taxes, account rules and mortgage conventions. Explain concepts without personalized recommendations, asset picks, price forecasts, guaranteed returns or instructions to buy/sell. Add a brief educational-only scope note. The editorial image will feature ${pairing}. The story itself can focus on a meaningful subject in this pillar. Do not invent quotes, people, results or statistics.`,
    true, null, `${category}: research`,
  );
  if (researched.sources.length < 3) fail(`Research returned fewer than three source links for ${category}.`);
  const sourceCandidates = uniqueSources(researched.sources).map((source, index) => ({ ...source, sourceId: `S${index + 1}` }));
  const schema = articleSchema(sourceCandidates);
  const drafted = await textCall(
    `Write one original, substantial WILDWIRE article in JSON only, based on the research notes below. Voice: intelligent, confident, warm, inclusive and human; no filler, alpha clichés or generic AI phrasing. Keep reporting distinct from commentary. Do not invent interviews, personal experience, statistics or quotations. Category must be ${category}; ${spiritFeature ? 'this is the independent Mind & Spirit feature, not a pillar and not a Daily Read' : dailyRead ? 'mark this as an additional Daily Read story' : 'this is the main pillar story'}. Write 6–9 useful sections and target 1,000–1,200 words (never fewer than 900). Build each section with real explanation, examples or useful steps, not padding. Put inline [1], [2], [3] citations in the relevant prose. IMPORTANT: these numbers are positions in YOUR final sources array, not sourceId numbers or citation numbering from research notes. Use every selected source at least once; never output [4] or higher. Choose the sources array first, then assign the prose citations to its exact order. Include concrete steps when the topic is training, cooking or another practical guide. For Living, make the final section a grounded, story-specific practice or reflection of at least 70 words; make its heading distinct from all previous Living endings below. Do not repeat a generic daily ritual.\n\nArchived Living endings:\n${oldLivingEndings}\n\nResearch notes:\n${researched.text}\n\nFor each of the exactly three cited sources, copy the complete exact page title, publication name, date, and named author(s) from the linked source page; do not shorten or paraphrase titles. Never use placeholder author metadata or infer names; if no individual author is listed, use the publishing organization. Select exactly three distinct sourceId values from this verified registry. Never write or change URLs; the publisher attaches each URL from its sourceId:\n${JSON.stringify(sourceCandidates)}\n\nReturn: {"category":"${category}","title":"...","subtitle":"...","imageAlt":"...","imageConcept":"a specific, visual scene centered on a couple, family or friends","body":[["section heading","substantial prose"],...],"sources":[{"title":"...","sourceId":"S1","authors":"...","publication":"..."},...]}`,
    false, schema, `${category}: draft`,
  );
  let article = bindSources(parseJson(drafted.text), sourceCandidates);
  if (article.category !== category) fail(`Draft category mismatch for ${category}.`);
  const draftWords = countWords((article.body || []).map(section => section.join('\n')).join('\n'));
  if (draftWords < 800) {
    const repaired = await textCall(
      `Expand this underlength WILDWIRE article to 1,000–1,200 words across 6–9 useful sections. Preserve its headline, category, angle, source records, and inline [1], [2], [3] citations. Add meaningful explanation, practical detail, tradeoffs, and specific examples grounded only in the supplied research notes. Do not invent sources, quotes, statistics, personal experiences, or factual claims. Return the complete article JSON in the same schema using sourceId, title, authors and publication in each source record (omit URL and all computed publishing fields). The final Living section, if applicable, must remain a distinct story-specific practice/reflection of at least 70 words.\n\nRESEARCH NOTES:\n${researched.text}\n\nARTICLE TO EXPAND:\n${JSON.stringify(article)}`,
      false, schema, `${category}: expand draft`,
    );
    article = bindSources(parseJson(repaired.text), sourceCandidates);
    if (article.category !== category) fail(`Expanded draft category mismatch for ${category}.`);
  }
  article = normalizeReviewSourceIds(article);
  const checkedSources = [];
  const audit = [];
  let result;
  for (let round = 0; round < 4; round++) {
    const checked = await reviewArticle(article, category, round);
    result = checked.review;
    checkedSources.push(...checked.sources);
    audit.push({ round, review: result });
    if (runDirectory) fs.writeFileSync(path.join(runDirectory, `${category.toLowerCase()}-${dailyRead ? 'read' : 'lead'}-${slugify(article.title)}.review.json`), JSON.stringify({ article, audit }, null, 2) + '\n');
    if (result.passed === true && result.checkedClaims.length >= 3) break;
    if (round === 3) break;
    const corrected = applyVerifiedCorrections(article, result);
    if (!corrected.changes) fail(`Fact check failed for ${category}: no evidence-grounded correction was supplied. ${(result.issues || []).join('; ')}`);
    article = corrected.article;
    log(`${category}: applied ${corrected.changes} targeted factual/metadata corrections; checking the corrected version.`);
  }
  if (result.passed !== true || result.checkedClaims.length < 3) fail(`Fact check failed for ${category}: ${(result.issues || []).join('; ') || 'not enough checked claims'}`);
  const allSources = uniqueSources([...researched.sources, ...checkedSources]);
  const wordCount = validateArticle(article, allSources, existing, date, pairing);
  if (dailyRead) article.dailyRead = true;
  if (spiritFeature) article.spiritFeature = true;
  return { article, wordCount, sourcesChecked: result.checkedClaims.length, sourceResults: allSources, editorialAudit: audit };
}

async function main() {
  if (!TOKEN) fail('Missing OPENAI_API_KEY. No content files were changed.');
  const date = editionDate(process.env.WILDWIRE_TEST_DATE || '', DRY_RUN);
  runDirectory = path.join(ROOT, '.wildwire-runs', date);
  fs.mkdirSync(runDirectory, { recursive: true });
  runReport = { date, dryRun: DRY_RUN, startedAt: new Date().toISOString(), status: 'GENERATING', requests: [], articles: [], images: [] };
  saveReport();
  log(`Starting ${DRY_RUN ? 'isolated preview' : 'production candidate'} for ${date}: ten stories, sixteen images.`);
  const existing = readExisting();
  const priorTileDescriptions = readEditionManifests().slice(-30).flatMap(manifest => Object.values(manifest.pillarImages || {}).map(tile => tile.alt).filter(Boolean));
  const existingWithTileHistory = [...existing, ...priorTileDescriptions.map((imageAlt, index) => ({ id: `prior-pillar-tile-${index}`, imageAlt }))];
  const alreadyPublishedToday = editionArticles(existing, date);
  if (CATEGORIES.every(category => alreadyPublishedToday.some(item => item.category === category && !item.dailyRead && !item.spiritFeature)) && alreadyPublishedToday.filter(item => item.dailyRead === true).length === DAILY_READ_COUNT && alreadyPublishedToday.some(item => item.spiritFeature === true)) {
    console.log(JSON.stringify({ status: 'ALREADY_PUBLISHED', date, articles: alreadyPublishedToday.map(item => item.id) }, null, 2));
    return;
  }
  if (alreadyPublishedToday.length) fail(`Found a partial WILDWIRE edition dated ${date}; refusing to add stories to it.`);
  const pairings = selectedPairings(date);
  const results = [];
  const assignments = [...CATEGORIES.map(category => ({ category, dailyRead: false })), ...Array.from({ length: DAILY_READ_COUNT }, (_, index) => ({ category: DAILY_READ_CATEGORIES[(new Date(date + 'T00:00:00Z').getUTCDate() + index) % DAILY_READ_CATEGORIES.length], dailyRead: true })), {category:'Living',dailyRead:false,spiritFeature:true}];
  for (let index = 0; index < assignments.length; index++) {
    const previousInEdition = results.map(item => item.article);
    const { category, dailyRead, spiritFeature = false } = assignments[index];
    log(`Story ${index + 1}/${assignments.length}: ${category}${dailyRead ? ' Daily Read' : ''}.`);
    const checkpoint = path.join(runDirectory, `story-${index}.json`);
    let result;
    if (fs.existsSync(checkpoint)) {
      result = JSON.parse(fs.readFileSync(checkpoint, 'utf8'));
      if (result.article.category !== category || Boolean(result.article.dailyRead) !== dailyRead || Boolean(result.article.spiritFeature) !== spiritFeature) fail('Cached article assignment does not match this edition.');
      result.wordCount = validateArticle(result.article, result.sourceResults, [...existing, ...previousInEdition], date, pairings[index]);
      log(`${category}: recovered validated article "${result.article.title}".`);
    } else {
      const rejectedTopics = [];
      for (let topicAttempt = 0; topicAttempt < 2; topicAttempt++) {
        try {
          result = await makeArticle(category, date, pairings[index], [...existing, ...previousInEdition], dailyRead, rejectedTopics, spiritFeature);
          break;
        } catch (error) {
          if (topicAttempt || !/Fact check failed|Fact-check correction references an unknown source ID|Possible duplicate|Article length|Research returned fewer|inline citation|correction (?:did not match|must be grounded)|Replacement factual text/.test(error.message)) throw error;
          rejectedTopics.push(error.message);
          runReport.rejectedCandidates = [...(runReport.rejectedCandidates || []), { category, dailyRead, reason: error.message }];
          saveReport();
          log(`${category}: candidate rejected; making one fresh-topic attempt instead of recycling an unreliable draft.`);
        }
      }
      fs.writeFileSync(checkpoint, JSON.stringify(result, null, 2) + '\n');
    }
    const candidateId = `${slugify(result.article.title)}-${date.replaceAll('-', '')}`;
    if (existing.some(item => item.id === candidateId) || results.some(item => item.article.id === candidateId)) fail(`Output already exists; refusing overwrite: ${candidateId}`);
    const image = await generateImage(result.article, pairings[index], candidateId, [...existingWithTileHistory, ...results.map(item => item.article)]);
    result.article.image = image.path;
    result.article.imagePrompt = image.prompt;
    result.article.imageGenerator = IMAGE_MODEL;
    result.article.imageUsage = 'AI-generated editorial illustration; no real people or documentary event.';
    result.article.imageVisualCheck = image.imageCheck;
    results.push({ ...result, image });
    runReport.articles.push({ id: result.article.id, category, dailyRead, spiritFeature, words: result.wordCount });
    saveReport();
    console.log(`Validated ${dailyRead ? 'Daily Read' : category}: ${result.wordCount} words, ${result.article.sources.length} citations, image ${image.bytes.length} bytes.`);
  }
  const pillarImages = [];
  for (const [index, category] of CATEGORIES.entries()) {
    const concept = PILLAR_SCENES[category];
    const tileArticle = { category, title: `Take the wider view: ${category}`, subtitle: concept, imageAlt: concept, imageConcept: concept };
    const id = `pillar-${category.toLowerCase()}-${date.replaceAll('-', '')}`;
    // Category tiles have an approved specific group/scene. An unrelated
    // activity-bearing article pairing can contradict it (travel vs cooking).
    const pairing = concept;
    const image = await generateImage(tileArticle, pairing, id, [...existingWithTileHistory, ...results.map(item => item.article), ...pillarImages.map(item => ({ imageAlt: item.imageAlt }))]);
    pillarImages.push({ category, imageAlt: concept, image, imageConcept: concept });
    console.log(`Validated fresh ${category} pillar tile image: ${image.bytes.length} bytes.`);
  }
  const allImages = [...results.map(item => item.image.path), ...pillarImages.map(item => item.image.path)];
  if (new Set(allImages).size !== assignments.length + CATEGORIES.length) fail('Image reuse detected in the daily edition and pillar tiles.');
  const previousImages = [...existing.map(article => article.image), ...readEditionManifests().flatMap(manifest => Object.values(manifest.pillarImages || {}).map(tile => tile.image))].filter(Boolean).map(file => path.join(ROOT, file));
  assertFreshImages([...results.map(item => item.image), ...pillarImages.map(item => item.image)], previousImages);
  // Even previews stage the complete edition in this disposable checkout, so
  // the following homepage, archive and site checks exercise NEW content.
  // The workflow's production gates alone authorize commits and deployment.
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
    runReport.status = DRY_RUN ? 'PREVIEW_STAGED' : 'CANDIDATE_STAGED';
    runReport.finishedAt = new Date().toISOString();
    saveReport();
    console.log(`WILDWIRE edition ${date} staged: ten stories (six pillars, three Daily Reads and one Mind & Spirit feature), plus six unique pillar tile images; fifteen generated images total. Run all content and functional checks before committing.`);
  } catch (error) {
    for (const file of written.reverse()) fs.rmSync(file, { force: true });
    require('node:child_process').spawnSync(process.execPath, [path.join(__dirname, 'build-content.cjs')], { cwd: ROOT, encoding: 'utf8' });
    throw error;
  }
}

if (require.main === module) main().catch(error => {
  if (runReport) {
    runReport.status = 'REJECTED';
    runReport.error = error.message;
    runReport.finishedAt = new Date().toISOString();
    saveReport();
  }
  console.error(`WILDWIRE edition failed closed: ${error.message}`);
  process.exitCode = 1;
});

module.exports = { normalizeReviewSourceIds, torontoDate, editionDate, editionArticles, selectedPairings, imagePrompt, titleOverlap, contentOverlap, validateArticle, articleSchema, bindSources, applyVerifiedCorrections, canonicalEvidenceUrl, countWords, assertFreshImages, apiRequest, pollResponse, DAILY_READ_COUNT, DAILY_READ_CATEGORIES };
