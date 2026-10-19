const {readNotes,torontoDate}=require('./founders-desk-core.cjs');
const note=readNotes().find(n=>n.date===torontoDate());
if(!note){console.error('No current Founder’s Desk note to verify');process.exitCode=1;}else{
 (async()=>{
  // The Pages deployment action can succeed before the custom domain refreshes.
  // Retry only the public verification; never weaken content/date/attribution checks.
  const paths=[note.url,'founders-desk.html','js/founders-notes.js'];
  const deadline=Date.now()+8*60*1000;
  let lastError;
  while(Date.now()<deadline){
   try{
    for(const file of paths){
     const response=await fetch(`https://wildwiremag.com/${file}?verify=${Date.now()}`,{signal:AbortSignal.timeout(15000),cache:'no-store'});
     if(!response.ok)throw Error(`${file}: HTTP ${response.status}`);
     const text=await response.text();
     if(!text.includes(note.date))throw Error(`${file} is missing the current note date`);
     if(file.endsWith('.html')&&!text.includes('WILDWIRE Editorial'))throw Error(`${file} is missing the editorial attribution`);
    }
    console.log(JSON.stringify({status:'LIVE_NOTE_VERIFIED',id:note.id,url:`https://wildwiremag.com/${note.url}`,publicVerifiedAt:new Date().toISOString()}));
    return;
   }catch(error){lastError=error;console.log(`Waiting for public Founder’s Desk deployment: ${error.message}`);}
   await new Promise(resolve=>setTimeout(resolve,15000));
  }
  throw lastError||Error('Live verification timed out');
 })().catch(error=>{console.error(error.message);process.exitCode=1;});
}
