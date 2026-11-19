const assert = require('node:assert/strict');
const { factCheckArticle } = require('../scripts/automated-publish.cjs');
const article = {
  title: 'Test article',
  sources: [{sourceId:'S1', url:'https://example.com/source', title:'Wrong title', authors:'Publisher', publication:'Publisher'}],
  body: [['Section', 'Original supported prose [1].']],
};
const missingCorrection = {
  passed:false, issues:['S1 title does not match its cited page.'],
  checkedClaims:['Claim one', 'Claim two', 'Claim three'],
  sourceCorrections:[], textCorrections:[],
};
(async () => {
  let calls = 0;
  const checked = await factCheckArticle(article, 'Style', async (current, category, round, unresolved) => {
    calls++;
    assert.equal(category, 'Style');
    let review;
    if (round === 0) review = structuredClone(missingCorrection);
    else if (round === 1) {
      assert.deepEqual(unresolved.issues, missingCorrection.issues);
      review = {...structuredClone(missingCorrection), sourceCorrections:[{
        sourceId:'S1', title:'Verified page title', authors:'Publisher', publication:'Publisher',
        evidenceUrl:'https://example.com/source',
      }]};
    } else {
      assert.equal(current.sources[0].title, 'Verified page title');
      review = {passed:true, issues:[], checkedClaims:['Claim one','Claim two','Claim three'],sourceCorrections:[],textCorrections:[]};
    }
    return {review, sources:[]};
  });
  assert.equal(calls, 3);
  assert.deepEqual(checked.article.body, article.body);
  assert.equal(article.sources[0].title, 'Wrong title', 'The input is preserved.');
  calls = 0;
  await assert.rejects(factCheckArticle(article, 'Style', async () => {
    calls++;
    return {review:structuredClone(missingCorrection), sources:[]};
  }), /Fact check failed/);
  assert.equal(calls, 4, 'Unresolved reviews stop at the existing round limit.');
  await assert.rejects(factCheckArticle(article, 'Style', async () => ({
    review:{...structuredClone(missingCorrection),sourceCorrections:[{
      sourceId:'S1',title:'Invented title',authors:'Publisher',publication:'Publisher',evidenceUrl:'https://example.com/unrelated',
    }]},sources:[],
  })), /own cited page/);
  console.log('PASS omitted corrections can recover, unresolved reviews remain bounded, and unrelated evidence is rejected.');
})().catch(error => { console.error(error); process.exitCode=1; });
