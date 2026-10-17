(()=>{
 const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
  const notes=Array.isArray(window.WILDWIRE_FOUNDER_NOTES)?window.WILDWIRE_FOUNDER_NOTES:[];
  const date=value=>new Date(value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const target=document.getElementById('founders-desk-home');const note=[...notes].sort((a,b)=>b.date.localeCompare(a.date))[0];
  if(target&&note&&/^founder-note-\d{4}-\d{2}-\d{2}\.html$/.test(note.url)){
   target.hidden=false;target.innerHTML=`<div class="desk-home-inner"><div class="desk-home-label"><div class="desk-kicker">The Founder’s Desk</div><h2 id="founders-desk-heading">Notes from<br>the Founder<span class="gold">.</span></h2><p>A life worth living.<br>A thought worth carrying.</p></div><div class="desk-home-story"><div class="desk-meta"><time datetime="${esc(note.date)}">${esc(date(note.date))}</time><span>${esc(note.theme)}${note.preview?' · Sample for review':''}</span><span>1 minute read</span></div><h3><a href="${note.url}">${esc(note.title)}</a></h3><p>${esc(note.paragraphs[0])}</p><div class="desk-links"><a class="desk-text-link" href="${note.url}">Read the note →</a><a class="desk-text-link" href="founders-desk.html">Browse the desk →</a></div><p class="desk-home-disclosure">Automated, AI-assisted reflections inspired by WILDWIRE’s founding philosophy. Not individually written or approved by the founder. <a href="founders-desk.html#about-the-series">About the series</a></p></div></div>`;
  }
  const select=document.getElementById('desk-theme');if(select&&!select.dataset.bound){select.dataset.bound='true';select.addEventListener('change',()=>{let count=0;document.querySelectorAll('[data-desk-theme]').forEach(item=>{item.hidden=!!select.value&&item.dataset.deskTheme!==select.value;if(!item.hidden)count++;});document.getElementById('desk-no-results').hidden=count!==0;});}
  const search=document.getElementById('search'),result=document.getElementById('founders-search-results');
  if(search&&result&&!search.dataset.deskBound){search.dataset.deskBound='true';search.addEventListener('input',()=>{const query=search.value.trim().toLowerCase();const found=query?notes.filter(n=>[n.title,n.theme,...n.paragraphs].join(' ').toLowerCase().includes(query)):[];result.hidden=!found.length;result.innerHTML=found.length?'<h2>From The Founder’s Desk</h2>'+found.map(n=>`<article><div class="desk-meta">${esc(date(n.date))} · ${esc(n.theme)}</div><h3><a href="${esc(n.url)}">${esc(n.title)}</a></h3><p>${esc(n.paragraphs[0])}</p><a class="desk-text-link" href="${esc(n.url)}">Read the note →</a></article>`).join(''):'';});}
 }
 document.addEventListener('DOMContentLoaded',render);
})();
