// One-time editorial cover repair. Not part of the scheduled edition generator.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const id='a-small-pause-that-belongs-to-you-20261018';
const file=path.join(root,'content/articles',id+'.json');
const article=JSON.parse(fs.readFileSync(file,'utf8'));
const imagePath='images/generated/'+id+'-exclusive.webp';
const destination=path.join(root,imagePath);
if(!process.env.OPENAI_API_KEY)throw Error('OPENAI_API_KEY is required');
const prompt='Generate a PREMIUM PHOTOREALISTIC WILDWIRE magazine cover photograph, landscape 3:2. A peaceful sunlit wooden terrace overlooking a breathtaking mist-filled forest valley, winding lake and distant blue-gray mountains at golden sunrise. On the rustic table in the foreground: an open journal with pen, ceramic steaming coffee mug, woven blanket, warm lantern and lush plants. Immersive warm cinematic light, exquisite realistic textures, professional editorial photography, sophisticated composition, deep natural colors, high dynamic range. No people, no illustrations, no cartoon or flat vector art, no lettering, no watermarks. Entirely original image.';
(async()=>{
 const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.WILDWIRE_MODEL||'gpt-6-luna',input:prompt,tools:[{type:'image_generation',model:process.env.WILDWIRE_IMAGE_MODEL||'gpt-image-2.5-flare',size:'1536x1024',quality:'medium',output_format:'webp',output_compression:82}],max_output_tokens:1000})});
 const json=await res.json();if(!res.ok)throw Error('Image generation failed: '+JSON.stringify(json).slice(0,1500));
 const generated=(json.output||[]).find(x=>x.type==='image_generation_call'&&x.result);if(!generated)throw Error('No image returned');
 const bytes=Buffer.from(generated.result,'base64');if(bytes.length<20000||bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP')throw Error('Invalid image bytes');
 fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,bytes);
 article.image=imagePath;article.imageAlt='A cinematic golden sunrise over a misty mountain valley, with an open journal, warm lantern and steaming cup on a rustic terrace.';article.imageCredit='Original AI-generated WILDWIRE editorial photograph; no stock imagery or reused cover.';
 fs.writeFileSync(file,JSON.stringify(article,null,2)+'\n');
 const bridge=path.join(root,'js/spirit-feature-bridge.js');let b=fs.readFileSync(bridge,'utf8');b=b.replaceAll('images/mind-spirit-20261018-original.svg',imagePath);fs.writeFileSync(bridge,b);
 const home=path.join(root,'index.html');let h=fs.readFileSync(home,'utf8');h=h.replaceAll('images/mind-spirit-20261018-original.svg',imagePath);fs.writeFileSync(home,h);
 console.log('Original photorealistic image installed:',imagePath,bytes.length,'bytes');
})().catch(e=>{console.error(e);process.exitCode=1});
