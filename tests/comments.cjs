const assert = require('node:assert/strict');
const fs = require('node:fs');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(require('node:path').join(__dirname, '../js/comments.js'), 'utf8');
const tick = () => new Promise(resolve => setTimeout(resolve, 10));
(async () => {
  const dom = new JSDOM('<div id="comment-widget"></div>', { url: 'https://wildwiremag.com/article.html?id=test-story', runScripts: 'dangerously' });
  const w = dom.window, d = w.document;
  let session = null, insertError = null, readError = false;
  let rows = [
    { id:'other', article_id:'test-story', author_id:'reader-two', display_name:'<script>bad()</script>', body:'<img src=x onerror="bad()">', created_at:'2026-10-16T12:00:00Z' },
    { id:'mine', article_id:'test-story', author_id:'reader-one', display_name:'A reader', body:'An earlier thought.', created_at:'2026-10-16T11:00:00Z' },
  ];
  const writes = [];
  w.WILDWIRE_ACCOUNT = { client:{
    auth:{ async getSession(){return {data:{session},error:null};} },
    from(table){ assert.equal(table,'article_comments'); return {
      select(){ const q={eq(key,value){if(key==='article_id')assert.equal(value,'test-story');if(key==='status')assert.equal(value,'published');return q;},order(){return q;},async range(){return {data:rows,error:readError?{message:'offline'}:null};}}; return q; },
      async insert(row){ writes.push(row); if(insertError)return{error:insertError}; rows=[{...row,id:'new',created_at:'2026-10-16T13:00:00Z'},...rows]; return{error:null}; },
      delete(){ let id;return{eq(key,value){assert.equal(key,'id');id=value;return{async eq(ownerKey,owner){assert.equal(ownerKey,'author_id');assert.equal(owner,session.user.id);rows=rows.filter(r=>!(r.id===id&&r.author_id===owner));return{error:null};}};}}; }
    };}
  }};
  w.eval(source); await tick();
  assert.match(d.querySelector('#comment-widget').textContent,/Sign in or create/,'Guest sees a real WILDWIRE sign-in link');
  assert.equal(d.querySelector('textarea'),null,'A guest cannot submit a comment');
  assert.equal(d.querySelectorAll('.reader-comment').length,2,'Public comments load without signing in');
  assert.equal(d.querySelectorAll('.reader-comment img,.reader-comment script').length,0,'User text is never parsed as HTML');
  assert.match(d.querySelector('.comment-body').textContent,/<img/,'Markup remains literal text');
  session={user:{id:'reader-one',email:'private@example.test'}};
  w.dispatchEvent(new w.CustomEvent('wildwire:session',{detail:{session}}));
  assert.equal(d.querySelectorAll('.comment-remove').length,1,'Only the signed-in reader sees their own removal control');
  assert.equal(d.querySelector('[name="display_name"]').value,'','Private email is not copied into a public display name');
  const input = (selector,value) => {const n=d.querySelector(selector);n.value=value;n.dispatchEvent(new w.Event('input'));};
  input('[name="display_name"]','Public nickname');input('textarea','A useful new perspective.');
  d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  assert.equal(writes[0].author_id,'reader-one','Posting binds to the current authenticated session');
  assert.equal(writes[0].article_id,'test-story','Comments use the permanent article ID');
  assert.equal(d.querySelector('textarea').value,'','Successful posting clears the body');
  assert.match(d.querySelector('form [role="status"]').textContent,/posted/);
  assert.equal(d.querySelectorAll('.reader-comment').length,3);
  insertError={message:'Please wait 30 seconds between comments.'};input('textarea','Keep this draft on an error.');
  d.querySelector('form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
  assert.equal(d.querySelector('textarea').value,'Keep this draft on an error.');
  assert.match(d.querySelector('form [role="status"]').textContent,/30 seconds/);
  const remount = async()=>{await w.WILDWIRE_COMMENTS.mount('test-story',d.querySelector('#comment-widget'));};
  await remount();assert.equal(d.querySelector('textarea').value,'Keep this draft on an error.','Account/favorites rerenders preserve the current reader’s draft');
  const countBefore=rows.length;d.querySelector('.comment-remove').click();await tick();assert.equal(rows.length,countBefore-1,'Owner removal updates stored comments and display');
  session={user:{id:'reader-three'}};w.dispatchEvent(new w.CustomEvent('wildwire:session',{detail:{session}}));assert.equal(d.querySelector('textarea').value,'','Another signed-in reader cannot see the previous reader’s draft');
  session=null;w.dispatchEvent(new w.CustomEvent('wildwire:session',{detail:{session}}));assert.equal(d.querySelector('form'),null,'Signing out removes the posting form');
  readError=true;await remount();assert.match(d.querySelector('#comment-widget').textContent,/could not load/);assert.equal([...d.querySelectorAll('button')].find(b=>b.textContent==='Retry loading comments').hidden,false,'Loading errors are actionable, never presented as an empty conversation');
  dom.window.close();console.log('Comment UI checks passed: guest/signed-in states, public reading, posting, ownership, removal, XSS, draft recovery/isolation, rate errors and retry.');
})().catch(error=>{console.error(error);process.exitCode=1;});
