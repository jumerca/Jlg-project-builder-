'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const P=require('../lib/frontpage');
const {DOSSIERS}=require('../lib/dossiers');
const {handler}=require('../server');
async function read(url){
 let status=0,body='';
 await handler({url,method:'GET'},{
  writeHead(s){status=s},end(x){body=String(x??'')}
 });
 return {status,body};
}
test('front page has only national/international authored editorial items and no local content',async()=>{
 const h=P.cover([]);
 for(const slug of ['souvigne-correze-barrage-riviere','correze-restrictions-eau-fin-novembre','oyonnax-brive-32-22-2026']){
  assert.doesNotMatch(h,new RegExp('/dossier/'+slug));
 }
 assert.match(h,/À la une/);
 assert.match(h,/\/dossier\/marseille-le-mans-virevolte-2026-11-23/);
 assert.match(h,/\/dossier\/cop31-antalya-pas-accord-final/);
 assert.doesNotMatch(h,/EN CORRÈZE|Au plus près du territoire|Le fil des brèves/);
 const page=await read('/');
 assert.equal(page.status,200);
 const main=page.body.split('<main class="container">')[1]?.split('</main>')[0]||'';
 assert.doesNotMatch(main,/\/dossier\/souvigne-correze|\/dossier\/oyonnax-brive/);
 assert.doesNotMatch(main,/Flux de presse · BRÈVE|médias d’origine/);
});
test('national sports may be on homepage; departmental sports stays in its own section',()=>{
 const sport=DOSSIERS.find(d=>d.slug==='marseille-le-mans-virevolte-2026-11-23');
 const local=DOSSIERS.find(d=>d.slug==='oyonnax-brive-32-22-2026');
 assert.equal(P.homeEligible(sport),true);
 assert.equal(P.homeEligible(local),false);
 assert.equal(P.homeEligible({section:'Corrèze',scope:'national',slug:'bad',title:'Local'}),false);
 assert.equal(P.homeEligible({section:'France',scope:'local',slug:'bad2',title:'Local'}),false);
 assert.equal(P.homeEligible({section:'International',scope:'international',slug:'news',title:'World'}),true);
});
test('briefs are genuine editorial excerpts, not an automatic copy of RSS headlines',async()=>{
 const raw=[{id:'unverified',title:'Titre brut repris du flux RSS ne doit jamais paraître',sourceNames:['Inconnu'],category:'France'}];
 assert.doesNotMatch(P.cover(raw),/Titre brut repris du flux RSS/);
 const shorts=await read('/breves');
 assert.equal(shorts.status,200);
 assert.match(shorts.body,/En bref/);
 assert.match(shorts.body,/JLG Média/);
 assert.doesNotMatch(shorts.body,/Ce que rapportent les publications|État des flux :/);
 const old=await read('/article?id=unverified');
 assert.equal(old.status,410);
 assert.doesNotMatch(old.body,/Titre brut repris du flux RSS/);
});
test('Corrèze remains accessible in dedicated section, not in the national front page',async()=>{
 const r=await read('/?section=Corr%C3%A8ze');
 assert.equal(r.status,200);
 assert.match(r.body,/Souvigne|Oyonnax|sécheresse/);
 assert.match(r.body,/\/dossier\/souvigne-correze-barrage-riviere/);
 const front=await read('/');
 assert.doesNotMatch(front.body,/\/dossier\/souvigne-correze-barrage-riviere/);
});
test('all editorial pages are built from content written for JLG, with sourced original body paragraphs',()=>{
 for(const d of P.publishedArticles()){
  assert.ok(d.sections.length>=1&&d.sections.every(s=>s.paragraphs.some(p=>p.length>25)));
  assert.ok(d.sources.length>=1);
 }
});
