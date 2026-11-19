const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
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
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'wildwire-review-'));
  try {
    let calls = 0;
    const reviewer = async (current, category, round, unresolved) => {
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
    };
    const checked = await factCheckArticle(article, 'Style', {dailyRead:true, directory, reviewer});
    assert.equal(calls, 3);
    assert.deepEqual(checked.article.body, article.body);
    assert.equal(article.sources[0].title, 'Wrong title');
    const audit = JSON.parse(fs.readFileSync(path.join(directory, 'style-read-test-article.review.json')));
    assert.equal(audit.audit.length, 3, 'The real Daily Read diagnostic path writes every review round.');
    calls = 0;
    const omitted = async () => {
      calls++;
      return {review:structuredClone(missingCorrection), sources:[]};
    };
    await assert.rejects(factCheckArticle(article, 'Style', {reviewer:omitted, directory}), /Fact check failed/);
    assert.equal(calls, 4, 'Unresolved reviews stop at the existing round limit.');
    assert.ok(fs.existsSync(path.join(directory, 'style-lead-test-article.review.json')));
    const unrelated = async () => ({
      review:{...structuredClone(missingCorrection),sourceCorrections:[{
        sourceId:'S1',title:'Invented title',authors:'Publisher',publication:'Publisher',evidenceUrl:'https://example.com/unrelated',
      }]},sources:[],
    });
    await assert.rejects(factCheckArticle(article, 'Style', {reviewer:unrelated, directory}), /own cited page/);
    console.log('PASS Daily Read and pillar audits, recovery, review cap and evidence isolation.');
  } finally {
    fs.rmSync(directory, {recursive:true, force:true});
  }
})().catch(error => { console.error(error); process.exitCode=1; });
