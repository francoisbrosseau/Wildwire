const assert = require('node:assert/strict');
const { torontoDate, selectedPairings, imagePrompt, titleOverlap, validateArticle } = require('../scripts/automated-publish.cjs');

assert.equal(torontoDate(new Date('2026-01-01T02:00:00Z')), '2025-12-31', 'Toronto date follows local midnight across UTC');
assert.equal(torontoDate(new Date('2026-01-01T05:00:00Z')), '2026-01-01', 'Toronto calendar date is used after local midnight');
const first = selectedPairings('2026-10-16');
assert.equal(first.length, 5);
assert.equal(new Set(first).size, 5, 'A daily edition rotates to five distinct partnerships');
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

const longBody = ('A useful practical section gives the reader clear context and next steps. This story keeps the advice specific, responsible and human. [1] [2] [3] ').repeat(8);
const article = {
  category: 'Strength',
  title: 'Train Together With Purpose',
  subtitle: 'A clear, useful guide.',
  imageConcept: 'Two adult friends train together in a neighborhood gym.',
  imageAlt: 'Two training partners prepare a barbell.',
  body: [['A section', longBody], ['Another section', longBody], ['A third section', longBody], ['A fourth section', longBody], ['A fifth section', longBody], ['A sixth section', longBody]],
  sources: [1,2,3].map(index => ({title:`Source ${index}`, publication:'Journal', url:`https://example.com/${index}` })),
};
const count = validateArticle(article, article.sources, [], '2026-10-16');
assert.ok(count >= 800);
assert.equal(article.id, 'train-together-with-purpose-20261016');
assert.equal(article.url, 'article.html?id=train-together-with-purpose-20261016');
assert.throws(() => validateArticle({...article, imageConcept:'A solitary athlete'}, article.sources, [], '2026-10-16'), /center companions/);
assert.throws(() => validateArticle({...article, title:'Previously Used Story'}, article.sources, [{title:'Previously Used Story'}], '2026-10-16'), /Possible duplicate/);
console.log('Editorial engine unit checks passed: Toronto dates, rotating partnerships, image brief, citations, length and duplicate safeguards.');
