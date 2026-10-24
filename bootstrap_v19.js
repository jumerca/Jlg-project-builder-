'use strict';
// V2.0 self-contained source -> static assets for HTTP + WebSocket server.
// All game code and banks come from the same tested HTML release.
const fs=require('node:fs'),path=require('node:path');
const root=__dirname,dir=path.join(root,'public');
fs.mkdirSync(dir,{recursive:true});
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const a=html.indexOf('/* Quiz Panic Live original');
const b=html.indexOf('window.QUIZ_BANK=',a);
const c=html.indexOf('/* Quiz Panic Live: 12',b);
const d=html.indexOf("\n(() => {\n'use strict';",c);
if([a,b,c,d].some(x=>x<0))throw Error('V2.0 source incomplete: missing rule/AI anchors');
fs.writeFileSync(path.join(dir,'index.html'),html);
fs.writeFileSync(path.join(dir,'panic-rules.js'),html.slice(a,b));
fs.writeFileSync(path.join(dir,'show-director.js'),html.slice(c,d));
for(const [key,out] of [['QUIZ_BANK','questions.json'],['KNOCKOUT_BANK','knockout-questions.json']]){
 const line=html.split('\n').find(x=>x.startsWith('window.'+key+'='));
 if(!line||!line.endsWith(';'))throw Error('V2.0 bank missing '+key);
 const content=line.slice(('window.'+key+'=').length,-1);
 fs.writeFileSync(path.join(dir,out),content);
}
(async()=>{
 await require('./pwa_install').buildAssets(dir);
 const sw=fs.readFileSync(path.join(dir,'sw.js'),'utf8').replace(/quiz-panic-v[0-9]+[a-z0-9-]*/g,'quiz-panic-v20-championnat');
 fs.writeFileSync(path.join(dir,'sw.js'),sw);
 fs.writeFileSync(path.join(dir,'manifest.webmanifest'),JSON.stringify({id:'/',name:'Quiz Panic Live — Édition Championnat',short_name:'Quiz Panic',description:'Panic Arena : 32 Panikos, gong, podium, palmarès et médailles.',start_url:'/?source=pwa&v=20',scope:'/',display:'standalone',background_color:'#090f20',theme_color:'#090f20',lang:'fr',categories:['games','entertainment'],icons:[{src:'/icon-192.png',type:'image/png',sizes:'192x192',purpose:'any'},{src:'/icon-512.png',type:'image/png',sizes:'512x512',purpose:'any'},{src:'/icon-maskable-512.png',type:'image/png',sizes:'512x512',purpose:'maskable'}]}));
 const q=JSON.parse(fs.readFileSync(path.join(dir,'questions.json'),'utf8'));
 const k=JSON.parse(fs.readFileSync(path.join(dir,'knockout-questions.json'),'utf8'));
 if(q.length+k.length!==3710)throw Error('Incomplete V2.0 banks '+(q.length+k.length));
 console.log('Quiz Panic Live V2.0: '+(q.length+k.length)+' unique questions, Gong, carrière locale, PWA ready');
})().catch(error=>{console.error(error);process.exitCode=1});
