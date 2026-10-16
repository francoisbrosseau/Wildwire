const assert = require('node:assert/strict');
const { torontoDate, editionDate, editionArticles, selectedPairings, imagePrompt, titleOverlap, contentOverlap, validateArticle, articleSchema, bindSources, apiRequest, DAILY_READ_COUNT } = require('../scripts/automated-publish.cjs');

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
assert.equal(first.length, 8);
assert.equal(DAILY_READ_COUNT, 3);
assert.equal(new Set(first).size, 8, 'Five pillar stories and three Daily Reads each get distinct partnerships');
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
const registry = article.sources.map((source, index) => ({ ...source, sourceId: `S${index + 1}` }));
const bound = bindSources({sources: registry.map(source => ({...source, url:'https://fabricated.example/not-verified'}))}, registry);
assert.deepEqual(bound.sources.map(source => source.url), registry.map(source => source.url), 'Generated URLs never override verified research URLs');
assert.throws(() => bindSources({sources:[...registry.slice(0,2), {...registry[2],sourceId:'S999'}]},registry), /Invalid or repeated/);
assert.throws(() => bindSources({sources:[registry[0],registry[0],registry[2]]},registry), /Invalid or repeated/);
assert.ok(!articleSchema(registry).properties.sources.items.properties.url, 'The API output schema does not permit model-written source URLs');

(async () => {
  const originalFetch = global.fetch;
  let calls = 0;
  try {
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
    global.fetch = async () => { calls++; return new Response(JSON.stringify({status:'incomplete',incomplete_details:{reason:'max_output_tokens'}})); };
    await assert.rejects(apiRequest({model:'test'},'Mock truncation'),/incomplete/);
    assert.equal(calls,1,'Truncated responses cannot silently become accepted articles');
  } finally { global.fetch = originalFetch; }
  console.log('Editorial engine checks passed, including forged source URLs, invalid source IDs, permanent API failures, transient retries and incomplete output.');
})().catch(error => { console.error(error); process.exitCode=1; });
