const {readNotes,torontoDate}=require('./founders-desk-core.cjs');
const note=readNotes().find(n=>n.date===torontoDate());
if(!note){console.error('No current Founder’s Desk note to verify');process.exitCode=1;}else{
 (async()=>{
  for(const file of [note.url,'founders-desk.html','js/founders-notes.js']){
   const response=await fetch(`https://wildwiremag.com/${file}?verify=${Date.now()}`,{signal:AbortSignal.timeout(15000),cache:'no-store'});
   if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
   const text=await response.text();
   // HTML escapes apostrophes; title/date and fixed disclosure are also checked locally.
   if(!text.includes(note.date))throw Error(`${file} is missing the current note date`);
   if(file.endsWith('.html')&&!text.includes('not individually written or approved by the founder'))throw Error(`${file} is missing the authorship disclosure`);
  }
  console.log(JSON.stringify({status:'LIVE_NOTE_VERIFIED',id:note.id,url:`https://wildwiremag.com/${note.url}`,publicVerifiedAt:new Date().toISOString()}));
 })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
