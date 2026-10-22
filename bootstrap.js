'use strict';
const fs=require('node:fs'),path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const dir=path.join(__dirname,'public');
fs.mkdirSync(dir,{recursive:true});
source=require('./patch_bootstrap').applyLiveRecoveryPatch(source);
source=require('./pwa_install').applyPWA(source);
const start=source.indexOf('<script>'),a=source.indexOf('/* Quiz Panic Live original',start),b=source.indexOf('window.QUIZ_BANK=',a),c=source.indexOf('/* Quiz Panic Live: 12',b),d=source.indexOf("\n(() => {\n'use strict';",c);
if([start,a,b,c,d].some(n=>n<0))throw Error('Édition V1.0 incomplète');
fs.writeFileSync(path.join(dir,'panic-rules.js'),source.slice(a,b));
fs.writeFileSync(path.join(dir,'show-director.js'),source.slice(c,d));
const lines=source.split('\n');
for(const [key,name] of [['QUIZ_BANK','questions'],['KNOCKOUT_BANK','knockout-questions'],['GUESS_BANK','guess-questions']]){
const line=lines.find(l=>l.startsWith('window.'+key+'='));
if(!line||!line.endsWith(';'))throw Error('Banque absente : '+key);
const json=line.slice(('window.'+key+'=').length,-1),data=JSON.parse(json);
if(!Array.isArray(data)||data.length<30)throw Error('Banque tronquée : '+key);
fs.writeFileSync(path.join(dir,name+'.json'),json);
}
fs.writeFileSync(path.join(dir,'index.html'),source);
fs.writeFileSync(path.join(dir,'manifest.webmanifest'),JSON.stringify({name:'Quiz Panic Live',short_name:'Quiz Panic',start_url:'/',display:'standalone',background_color:'#090f20',theme_color:'#090f20',lang:'fr'}));
require('./pwa_install').buildAssets(dir).catch(e=>{console.error('PWA build failed',e);process.exitCode=1;});
console.log('Quiz Panic V1.0 : moteur et 2 modes restaurés');
