const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const BYLINE = "WILDWIRE Editorial — The Founder's Desk";
const DISCLOSURE = "Short editorial reflections from WILDWIRE Editorial, shaped by WILDWIRE's founding philosophy.";
const THEMES = ['Human connection', 'Everyday living', 'Personal finances', 'Ambition and entrepreneurship', 'Movement and recovery', 'Technology and attention', 'Culture and curiosity', 'Relationships and independence', 'Perspective and uncertainty', 'Humor and observations'];
const rootDefault = path.resolve(__dirname, '..');
const words = text => String(text).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
const norm = text => words(text).map(word => word.toLowerCase()).join(' ');
const fail = message => { throw new Error(message); };
const esc = text => String(text).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const torontoDate = now => new Intl.DateTimeFormat('en-CA', {timeZone:'America/Toronto'}).format(now || new Date());
const noteUrl = date => `founder-note-${date}.html`;
function overlap(a, b, size = 1) {
  const shingles = value => { const tokens = words(value).map(w=>w.toLowerCase()); return new Set(tokens.slice(0, Math.max(0,tokens.length-size+1)).map((_,i)=>tokens.slice(i,i+size).join(' '))); };
  const A = shingles(a), B = shingles(b);
  return A.size && B.size ? [...A].filter(x=>B.has(x)).length / Math.min(A.size,B.size) : 0;
}
function validateNote(note, history = []) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(note.date || '') || new Date(note.date+'T12:00:00Z').toISOString().slice(0,10)!==note.date) fail('Invalid Toronto publication date');
  if (note.id !== `founders-desk-${note.date}` || note.url !== noteUrl(note.date)) fail('Invalid permanent note identity');
  if (note.byline !== BYLINE || note.disclosure !== DISCLOSURE) fail('Missing truthful attribution or disclosure');
  if (!THEMES.includes(note.theme) || !note.angle || words(note.angle).length > 40) fail('Invalid theme or central idea');
  if (typeof note.title !== 'string' || note.title.length < 8 || note.title.length > 100) fail('Invalid note headline');
  if (!Array.isArray(note.paragraphs) || note.paragraphs.length < 3 || note.paragraphs.length > 5 || note.paragraphs.some(p=>typeof p!=='string'||!p.trim())) fail('A note needs 3–5 readable paragraphs');
  const text = note.paragraphs.join('\n\n'), count = words(text).length;
  if (count < 150 || count > 250) fail(`Note length ${count} is outside 150–250 words`);
  const all = note.title+' '+text;
  if (/<[^>]+>|https?:\/\/|^\s*(?:[-*]|\d+\.)\s/m.test(all)) fail('Notes must be plain paragraphs, without markup, links or lists');
  if (/\b(?:I|my|mine|myself|I'm|I've|I'd|I'll|I’m|I’ve|I’d|I’ll)\b/i.test(all)) fail('First-person founder impersonation is not allowed');
  if (/\b(?:the founder|fran[cç]ois|brosseau)\b|\b(?:we|our)\b.{0,45}\b(?:yesterday|childhood|deployment|diagnosis|partner said)\b/i.test(all)) fail('Do not invent or disclose founder biography');
  if (/unlock your full potential|best version of yourself|embrace your journey|outside your comfort zone|in today[’']s fast-paced world/i.test(all)) fail('Generic motivational language');
  if (/\b(?:guaranteed returns?|buy (?:this|these) (?:stock|coin)|sell your (?:stock|crypto)|stop taking|cure[sd]?|diagnos[ei]|legal advice|financial advice)\b|\d+%/i.test(all)) fail('Unsupported professional advice or factual claims');
  for (const old of history) {
    if (old.date === note.date || old.id === note.id) fail('A note already exists for this date');
    if (overlap(old.title,note.title) > .65 || overlap(old.paragraphs.join(' '),text,3) > .3 || norm(old.angle) === norm(note.angle) || norm(old.paragraphs.at(-1)) === norm(note.paragraphs.at(-1))) fail(`Possible recycled note: ${old.title}`);
  }
  return count;
}
function readNotes(root = rootDefault) {
  const dir = path.join(root,'content/founders-notes');
  if (!fs.existsSync(dir)) return [];
  const notes = fs.readdirSync(dir).filter(f=>f.endsWith('.json')).sort().map(file=>{
    const note = JSON.parse(fs.readFileSync(path.join(dir,file),'utf8'));
    if (file !== note.date+'.json') fail('Note filename must match its date');
    return note;
  });
  notes.forEach((note,index)=>validateNote(note,notes.slice(0,index)));
  return notes;
}
function selectTheme(date, notes) {
  const start = Math.floor(Date.parse(date+'T12:00:00Z')/86400000) % THEMES.length;
  const recent = new Set(notes.slice(-2).map(note=>note.theme));
  return Array.from({length:THEMES.length},(_,i)=>THEMES[(start+i)%THEMES.length]).find(theme=>!recent.has(theme));
}
function shell(root, title, description, canonical, body, schema = null) {
  const home = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const header = home.match(/<header\b[\s\S]*?<\/header>/)[0];
  const footer = home.match(/<footer\b[\s\S]*?<\/footer>/)[0];
  const data = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g,'\\u003c')}</script>` : '';
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} | WILDWIRE</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="https://wildwiremag.com/${canonical}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="https://wildwiremag.com/${canonical}"><meta property="og:type" content="${schema?'article':'website'}"><link rel="stylesheet" href="css/style.css?v=20261019-sanctuary"><link rel="stylesheet" href="css/founders-desk.css?v=1">${data}</head><body data-page="founders"><a class="skip-link" href="#main">Skip to content</a>${header}<main id="main">${body}</main>${footer}<script src="js/founders-desk.js?v=2"></script><script src="js/supabase-config.js?v=20261016-supabase1"></script><script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script><script src="js/accounts.js?v=20261016-supabase1"></script></body></html>\n`;
}
function buildOutputs(root, notes) {
  const out = new Map();
  for (const note of notes) {
    const description = note.paragraphs[0].slice(0,160);
    const body = `<article class="desk-note wrap"><a class="desk-back" href="founders-desk.html">← The Founder’s Desk archive</a><div class="desk-kicker">Notes from the Founder${note.preview?' · Sample for review':''}</div><div class="desk-meta"><time datetime="${note.date}">${esc(note.date)}</time><span>${esc(note.theme)}</span><span>1 minute read</span></div><h1>${esc(note.title)}</h1><p class="desk-byline">${esc(BYLINE)}</p><div class="desk-prose">${note.paragraphs.map(p=>`<p>${esc(p)}</p>`).join('')}</div><a class="desk-back" href="founders-desk.html">Explore more notes →</a></article>`;
    out.set(note.url,shell(root,note.title,description,note.url,body,{'@context':'https://schema.org','@type':'BlogPosting',headline:note.title,datePublished:note.date,description,author:{'@type':'Organization',name:BYLINE},publisher:{'@type':'Organization',name:'WILDWIRE'},mainEntityOfPage:`https://wildwiremag.com/${note.url}`,about:note.theme,articleBody:note.paragraphs.join('\n\n')}));
  }
  const newest = [...notes].reverse();
  const items = newest.map(note=>`<article class="desk-archive-item" data-desk-theme="${esc(note.theme)}"><div class="desk-meta"><time datetime="${note.date}">${esc(note.date)}</time><span>${esc(note.theme)}${note.preview?' · Sample for review':''}</span></div><h2><a href="${note.url}">${esc(note.title)}</a></h2><p>${esc(note.paragraphs[0])}</p><a class="desk-text-link" href="${note.url}">Read the note →</a></article>`).join('');
  const archive = `<section class="desk-archive wrap"><div class="desk-kicker">Notes from the Founder</div><h1>The Founder’s Desk<span class="gold">.</span></h1><p class="desk-intro">A life worth living. A thought worth carrying.</p><p class="desk-archive-byline">${esc(BYLINE)}</p><div class="desk-filter"><label for="desk-theme">Browse by theme</label><select id="desk-theme"><option value="">All themes</option>${THEMES.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div><div id="desk-archive-list">${items || '<p>The first note is being prepared.</p>'}</div><p id="desk-no-results" hidden>No notes in this theme yet.</p></section>`;
  out.set('founders-desk.html',shell(root,"The Founder’s Desk","Short, founder-inspired reflections on curiosity, connection and a life worth living.",'founders-desk.html',archive));
  out.set('js/founders-notes.js',`window.WILDWIRE_FOUNDER_NOTES = ${JSON.stringify(newest).replace(/</g,'\\u003c')};\n`);
  return out;
}
function writeOutputs(root, outputs) {
  const backups = new Map();
  try {
    for (const [file,content] of outputs) {
      const target = path.join(root,file); backups.set(target,fs.existsSync(target)?fs.readFileSync(target):null);
      fs.mkdirSync(path.dirname(target),{recursive:true});
      const temp = target+'.tmp-'+process.pid;
      fs.writeFileSync(temp,content); fs.renameSync(temp,target);
    }
  } catch (error) {
    for (const [target,bytes] of backups) { if(bytes===null)fs.rmSync(target,{force:true});else fs.writeFileSync(target,bytes); }
    throw error;
  }
}
function build(root = rootDefault) { const notes=readNotes(root);writeOutputs(root,buildOutputs(root,notes));return notes; }
function fingerprint(note) {return crypto.createHash('sha256').update(JSON.stringify(note)).digest('hex');}
module.exports={BYLINE,DISCLOSURE,THEMES,words,norm,overlap,esc,torontoDate,noteUrl,validateNote,readNotes,selectTheme,buildOutputs,writeOutputs,build,fingerprint};
if(require.main===module){build();console.log('Founder’s Desk archive and permanent pages built.');}
