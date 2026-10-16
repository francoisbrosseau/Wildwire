const fs=require('node:fs'),path=require('node:path');
const data=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../js/articles.js'),'utf8').replace(/^window\.WILDWIRE_ARTICLES\s*=\s*/,'').replace(/;\s*$/,''));
const ids=new Set(), images=new Map(), recent=data.filter(a=>Date.now()-Date.parse(a.date+'T12:00:00Z')<120*86400000);
const words=s=>(s||'').toLowerCase().match(/[a-z0-9]{3,}/g)||[];
const overlap=(a,b)=>{const A=new Set(words(a)),B=new Set(words(b));return A.size&&B.size?[...A].filter(x=>B.has(x)).length/Math.min(A.size,B.size):0};
for(const a of data){
  if(images.has(a.image))throw Error(`Image repeated by ${images.get(a.image)} and ${a.id}: ${a.image}`);images.set(a.image,a.id);
  if(ids.has(a.id))throw Error(`Duplicate permanent article ID: ${a.id}`);ids.add(a.id);
  const body=a.body.map(x=>x.join(' ')).join(' '), count=words(body).length;
  if(count<450)throw Error(`${a.id} is too short (${count} words)`);
  const isRecipe=/recipe|skillet|soup|dinner/i.test(a.title+' '+a.subtitle);
  const needsSources=!isRecipe;
  if(needsSources&&a.sources.length<1)throw Error(`${a.id} needs credible source links`);
  for(const s of a.sources){if(!/^https:\/\//.test(s.url))throw Error(`Unsafe source URL on ${a.id}`)}
  for(const old of recent){if(old.id===a.id)continue;if(overlap(a.title,old.title)>.66)throw Error(`Possible duplicate title: ${a.title} / ${old.title}`)}
}
console.log(`Content checks passed for ${data.length} articles; unique IDs, images and no near-matching titles.`);
