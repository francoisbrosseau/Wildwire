const assert = require('node:assert/strict');
const { normalizeReviewSourceIds, torontoDate, editionDate, editionArticles, selectedPairings, imagePrompt, titleOverlap, contentOverlap, validateArticle, articleSchema, bindSources, applyVerifiedCorrections, canonicalEvidenceUrl, countWords, assertFreshImages, apiRequest, DAILY_READ_COUNT } = require('../scripts/automated-publish.cjs');

assert.equal(torontoDate(new Date('2026-01-01T02:00:00Z')), '2025-12-31', 'Toronto date follows local midnight across UTC');
assert.equal(torontoDate(new Date('2026-01-01T05:00:00Z')), '2026-01-01', 'Toronto calendar date is used after local midnight');
assert.equal(torontoDate(new Date('2026-03-08T06:59:00Z')), '2026-03-08', 'Spring DST transition keeps Toronto publication date stable');
assert.equal(torontoDate(new Date('2026-11-01T05:59:00Z')), '2026-11-01', 'Fall DST transition keeps Toronto publication date stable');
assert.equal(editionDate('2026-10-17', true), '2026-10-17', 'An explicit future Toronto date is allowed for an isolated dry run');
assert.throws(() => editionDate('2026-10-17', false), /only be used for a dry run/);
assert.throws(() => editionDate('2026-02-30', true), /valid calendar date/);
assert.equal(editionDate('', false, new Date('2026-01-01T02:00:00Z')), '2025-12-31', 'Production dates always use Toronto time');
const earlierSameDayStories=[{date:'2026-10-16',id:'legacy-draft'},{editionDate:'2026-10-16',id:'today-a'},{editionDate:'2026-10-16',id:'today-b'}];
assert.deepEqual(editionArticles(earlierSameDayStories,'2026-10-16').map(a=>a.id),['today-a','today-b'],'Only explicitly grouped edition articles count as today’s completed run');
const first = selectedPairings('2026-10-16');
assert.equal(first.length, 10);
assert.ok(!selectedPairings('2026-10-17').some(pairing => /traveling/i.test(pairing)), 'Rotating group identities must not require travel in unrelated category scenes');
assert.equal(DAILY_READ_COUNT, 3);
assert.equal(new Set(first).size, 10, 'Six pillar stories and three Daily Reads each get distinct partnerships');
assert.notDeepEqual(first, selectedPairings('2026-10-17'), 'Pairing mix changes with the Toronto publication date');
const image = imagePrompt({
  category: 'Strength',
  title: 'A Training Story',
  subtitle: 'A practical session.',
  imageConcept: 'Two training partners work through a focused set.',
}, first[0]);
assert.match(image, /couple, family or friends together/i);
assert.match(image, /focused partners training/i);
assert.match(image, /no smiling while lifting/i);
assert.match(imagePrompt({category:'Culture',title:'T',subtitle:'S',imageConcept:'Two friends in a gallery'},first[0],['Three generations cook at home']), /Avoid repeating these recent WILDWIRE image scenes/);
assert.ok(titleOverlap('A shared training plan', 'A training plan shared'), 'Near-duplicate title overlap is detected');
assert.equal(titleOverlap('A winter museum visit', 'Cooking with family'), 0);
assert.ok(contentOverlap('Training partners share a plan and build strength together', 'Build strength together with a shared plan for training partners') > 0.68, 'Near-duplicate story topics are detected even when headlines differ');

const longBody = ('A useful practical section gives the reader clear context and next steps. This story keeps the advice specific, responsible and human. [1] [2] [3] ').repeat(8);
const article = {
  category: 'Strength',
  title: 'Train Together With Purpose',
  subtitle: 'A clear, useful guide.',
  imageConcept: 'Two adult friends train together in a neighborhood gym.',
  imageAlt: 'Two training partners prepare a barbell.',
  body: [['A section', longBody], ['Another section', longBody], ['A third section', longBody], ['A fourth section', longBody], ['A fifth section', longBody], ['A sixth section', longBody]],
  sources: [1,2,3].map(index => ({title:`Source ${index}`, authors:'Named Researcher', publication:'Journal', url:`https://example.com/${index}` })),
};
const count = validateArticle(article, article.sources, [], '2026-10-16');
assert.ok(count >= 800);
assert.equal(article.id, 'train-together-with-purpose-20261016');
assert.equal(article.url, 'article.html?id=train-together-with-purpose-20261016');
assert.throws(() => validateArticle({...article, sources:article.sources.map((source,index)=>index===0?{...source,authors:'Not specified in the research notes'}:source)}, article.sources, [], '2026-10-16'), /verified author or publishing-organization metadata/);
const repairedImageArticle = {...article, imageConcept:'A solitary athlete'};
validateArticle(repairedImageArticle, repairedImageArticle.sources, [], '2026-10-16', first[0]);
assert.match(repairedImageArticle.imageConcept, /two men friends.*together.*A solitary athlete/i, 'Missing companion wording is repaired from the assigned daily pairing');
assert.throws(() => validateArticle({...article, title:'Previously Used Story'}, article.sources, [{title:'Previously Used Story'}], '2026-10-16'), /Possible duplicate/);
const living = {...article, category:'Living', title:'A Different Evening Practice', body:[...article.body.slice(0,-1), ['A practice for the walk home', longBody]]};
assert.ok(validateArticle(living, living.sources, [], '2026-10-16') >= 800, 'Living stories finish with a substantial, story-specific practice');
assert.throws(() => validateArticle({...living, body:[...living.body.slice(0,-1), ['A practice for the walk home', 'Too short.']]}, living.sources, [], '2026-10-16'), /substantial, specific practice/);
assert.throws(() => validateArticle({...living, body:[...living.body.slice(0,-1), ['A practice for the walk home', longBody]]}, living.sources, [{category:'Living',body:[['Ending',''],['A practice for the walk home',longBody]]}], '2026-10-16'), /repeats an archived closing practice/);
const sparseReview = normalizeReviewSourceIds({sources: article.sources.map((source,index)=>({...source,sourceId:['S4','S8','S12'][index]}))});
assert.deepEqual(sparseReview.sources.map(source=>source.sourceId),['S1','S2','S3'],'Review IDs match citation positions even when research selected sparse IDs');
assert.deepEqual(sparseReview.sources.map(source=>source.researchSourceId),['S4','S8','S12'],'Original research IDs remain in provenance');
assert.deepEqual(sparseReview.sources.map(source=>source.url),article.sources.map(source=>source.url),'Review ID normalization never changes evidence URLs');
const registry = article.sources.map((source, index) => ({ ...source, sourceId: `S${index + 1}` }));
const bound = bindSources({sources: registry.map(source => ({...source, url:'https://fabricated.example/not-verified'}))}, registry);
assert.deepEqual(bound.sources.map(source => source.url), registry.map(source => source.url), 'Generated URLs never override verified research URLs');
assert.throws(() => bindSources({sources:[...registry.slice(0,2), {...registry[2],sourceId:'S999'}]},registry), /Invalid or repeated/);
assert.throws(() => bindSources({sources:[registry[0],registry[0],registry[2]]},registry), /Invalid or repeated/);
assert.ok(!articleSchema(registry).properties.sources.items.properties.url, 'The API output schema does not permit model-written source URLs');

// Reproduce the real Style rejection: metadata from a repost and its original
// publication were mixed, and "identity" was overstated as a finding about style.
const disputed = {
  title:'Visible Repair, Your Own Way', category:'Style', subtitle:'Keep what works.',
  sources:[
    {sourceId:'S1',title:'An inaccurate title',authors:'Elaine L. Ritch',publication:'The Conversation',url:'https://www.mmu.ac.uk/news-and-events/news/story/visible-mending-why-showing-repairs-better-hiding-them'},
    {sourceId:'S2',title:'Repair research',authors:'Researchers',publication:'Sustainability',url:'https://www.mdpi.com/2071-1050/14/17/10821'},
  ],
  body:[['Repair and identity','The study found whether repair fits a person’s sense of style is a barrier. [2] Keep the repair visible if you like its character.']],
};
const review = {
  sourceCorrections:[{sourceId:'S1',title:'Visible mending: why showing off repairs is better than hiding them',authors:'Amber Martin-Woodhead and Martyn Evans',publication:'Manchester Metropolitan University',evidenceUrl:disputed.sources[0].url+'?utm_source=openai'}],
  textCorrections:[{sectionIndex:0,original:'The study found whether repair fits a person’s sense of style is a barrier. [2]',replacement:'The study identified incongruence with identity as a barrier to repair. [2]',evidenceUrl:disputed.sources[1].url}],
};
const patched=applyVerifiedCorrections(disputed,review);
assert.equal(patched.article.sources[0].authors,'Amber Martin-Woodhead and Martyn Evans','Verified byline is applied directly, not rewritten from disputed notes');
assert.equal(patched.article.sources[0].publication,'Manchester Metropolitan University');
assert.match(patched.article.body[0][1],/incongruence with identity/);
assert.match(patched.article.body[0][1],/Keep the repair visible if you like its character/,'Unaffected commentary survives the targeted edit');
assert.equal(patched.article.title,disputed.title);
const wrongNumber=applyVerifiedCorrections(disputed,{textCorrections:[{...review.textCorrections[0],replacement:'The study identified identity as a barrier. [61]'}]});
assert.match(wrongNumber.article.body[0][1],/barrier\. \[2\]/,'Corrected citations are bound to evidence URL position, never sourceId or research-note numbering');
assert.throws(()=>validateArticle({...article,body:article.body.map((section,index)=>index===0?[section[0],section[1]+' Invalid [4].']:section)},article.sources,[],'2026-10-16'),/out-of-range inline citation/);
assert.equal(disputed.sources[0].authors,'Elaine L. Ritch','The audit keeps the original candidate unchanged');
assert.equal(patched.article.sources[0].url,disputed.sources[0].url,'Corrections cannot substitute another URL');
assert.equal(canonicalEvidenceUrl(disputed.sources[1].url+'?utm_source=openai#references'),disputed.sources[1].url);
assert.throws(()=>applyVerifiedCorrections(disputed,{sourceCorrections:[{...review.sourceCorrections[0],evidenceUrl:disputed.sources[1].url}]}),/own cited page/,'A byline from another record cannot be mixed into the cited source');
assert.throws(()=>applyVerifiedCorrections(disputed,{textCorrections:[{...review.textCorrections[0],original:'Invented passage'}]}),/match exactly one/);
assert.throws(()=>applyVerifiedCorrections(disputed,{textCorrections:[{...review.textCorrections[0],evidenceUrl:'https://fabricated.example/claim'}]}),/needs evidence/);
assert.throws(()=>applyVerifiedCorrections(disputed,{sourceCorrections:[{...review.sourceCorrections[0],sourceId:'S99'}]}),/unknown source ID/);

assert.equal(countWords('We go on. [1] A new start.'),6,'Reading times count short words and exclude citation markers');
assert.equal(article.read,Math.max(4,Math.ceil(countWords(article.body.map(section=>section.join(' ')).join(' '))/220)));
const tempFs=require('node:fs'),tempPath=require('node:path'),tempOs=require('node:os');
const fixtureDir=tempFs.mkdtempSync(tempPath.join(tempOs.tmpdir(),'wildwire-image-hash-'));
try {
  const earlier=tempPath.join(fixtureDir,'earlier.webp');tempFs.writeFileSync(earlier,'previous image bytes');
  assert.throws(()=>assertFreshImages([{path:'renamed.webp',bytes:Buffer.from('previous image bytes')}],[earlier]),/Image content is repeated/,'Renaming a past image cannot bypass the no-reuse guard');
  assert.throws(()=>assertFreshImages([{path:'a.webp',bytes:Buffer.from('new image')},{path:'b.webp',bytes:Buffer.from('new image')}],[]),/Image content is repeated/,'Two filenames cannot share image content in one edition');
  assertFreshImages([{path:'fresh.webp',bytes:Buffer.from('brand new image')}],[earlier]);
} finally {tempFs.rmSync(fixtureDir,{recursive:true,force:true});}

(async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  try {
    const { pollResponse } = require('../scripts/automated-publish.cjs');
    const statuses = [503, 'in_progress', 'completed'];
    global.fetch = async (url, options) => {
      assert.match(String(url), /responses\/resp_research/);
      assert.equal(new URL(url).searchParams.get('include[]'), 'web_search_call.action.sources');
      assert.equal(options.body, undefined, 'Recovery retrieves the accepted response instead of resubmitting research');
      const next = statuses.shift();
      return next === 503 ? new Response('{}', {status:503}) : new Response(JSON.stringify({id:'resp_research',status:next,output:[]}));
    };
    const completed = await pollResponse({id:'resp_research',status:'queued'}, {include:['web_search_call.action.sources']}, 'Mock background research', {sleep:async()=>{}});
    assert.equal(completed.status, 'completed');
    assert.equal(statuses.length, 0, 'A transient retrieval failure preserves the same research job');
    let clock = 0;
    global.fetch = async () => new Response(JSON.stringify({id:'resp_stuck',status:'in_progress'}));
    await assert.rejects(pollResponse({id:'resp_stuck',status:'queued'}, {}, 'Mock stuck research', {sleep:async()=>{clock+=10;},now:()=>clock,timeoutMs:15}), /polling deadline/);
    global.fetch = async (_url, options) => {
      calls++;
      assert.ok(options.signal instanceof AbortSignal, 'Every API attempt has a bounded timeout');
      return new Response(JSON.stringify({error:{message:'Invalid key',code:'invalid_api_key'}}), {status:401});
    };
    await assert.rejects(apiRequest({model:'test'}, 'Mock authentication'), /Invalid key/);
    assert.equal(calls,1,'Permanent authentication failures are not retried and billed repeatedly');
    calls = 0;
    global.fetch = async () => {
      calls++;
      return calls===1 ? new Response(JSON.stringify({error:{message:'Busy'}}),{status:503}) : new Response(JSON.stringify({status:'completed',output:[]}));
    };
    await apiRequest({model:'test'},'Mock transient outage');
    assert.equal(calls,2,'A transient server failure is retried successfully');
    calls = 0;
    const limits = [];
    global.fetch = async (_url, options) => {
      calls++; limits.push(JSON.parse(options.body).max_output_tokens);
      return new Response(JSON.stringify(calls === 1 ? {status:'incomplete',incomplete_details:{reason:'max_output_tokens'}} : {status:'completed',output:[]}));
    };
    await apiRequest({model:'test',max_output_tokens:8000},'Mock truncation recovery');
    assert.deepEqual(limits,[8000,16000],'A truncated response is discarded and retried with more output space');
    calls = 0;
    global.fetch = async () => { calls++; return new Response(JSON.stringify({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}})); };
    await assert.rejects(apiRequest({model:'test',max_output_tokens:32000},'Mock truncation cap'),/incomplete/);
    assert.equal(calls,1,'Responses still truncated at the cap cannot become accepted articles');
  } finally { global.fetch = originalFetch; }
  console.log('Editorial engine checks passed, including forged source URLs, invalid source IDs, permanent API failures, transient retries and incomplete output.');
})().catch(error => { console.error(error); process.exitCode=1; });
