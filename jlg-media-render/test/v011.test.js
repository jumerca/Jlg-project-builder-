'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {DOSSIERS}=require('../lib/dossiers');
const {STORIES}=require('../lib/edition-20261122');
const P=require('../lib/frontpage');
const E=require('../lib/editorial');
const {handler}=require('../server');
async function page(url){
 let status=0,body='',headers={};
 const res={writeHead(code,h){status=code;headers=h},end(s){body=String(s??'')}};
 await handler({url,method:'GET'},res);return {status,body,headers};
}
test('the edition contains seven original sourced articles, not RSS replicas',()=>{
 assert.equal(STORIES.length,4);
 assert.ok(DOSSIERS.length>=7);
 for(const s of STORIES){
  const written=s.sections.flatMap(x=>x.paragraphs).join(' ');
  assert.ok(written.split(/\s+/).length>=350,s.title+' is too short');
  assert.ok(s.sources.length>=3,s.title+' too few sources');
  assert.ok(s.sources.every(x=>/^https:\/\//.test(x.url)));
  assert.ok(s.date==='2026-11-22');
  assert.ok(!/rss/i.test(s.eyebrow));
 }
});
test('home only displays JLG-authored national and international articles, never RSS copy or local news',()=>{
 const teaser={id:'sample',title:'Titre de dépêche non rédigée',category:'France',sourceNames:['Agence'],kind:'breve'};
 const h=P.cover([teaser]);
 assert.match(h,/À la une/);
 assert.ok(h.includes('/dossier/marseille-le-mans-virevolte-2026-11-23'));
 assert.ok(h.includes('/dossier/cop31-antalya-pas-accord-final'));
 assert.ok(h.includes('/dossier/choose-france-42-milliards-decryptage'));
 assert.doesNotMatch(h,/Titre de dépêche non rédigée/);
 assert.doesNotMatch(h,/EN CORRÈZE|Au plus près du territoire|Le fil des brèves/);
 for(const slug of ['souvigne-correze-barrage-riviere','correze-restrictions-eau-fin-novembre','oyonnax-brive-32-22-2026']){
  assert.ok(!h.includes('/dossier/'+slug),'local headline must not be on the front page: '+slug);
 }
});
test('front page is independent of RSS feed availability',()=>{
 const h=P.cover([]);
 assert.match(h,/À la une/);
 assert.ok(h.includes('/dossiers'));
 assert.ok(h.includes('/?section=Corr%C3%A8ze'));
});
test('newsroom index shows all editorial titles',()=>{
 const h=P.dossierIndex();
 for(const d of DOSSIERS)assert.ok(h.includes(E.esc(d.title)),d.slug+' is absent');
 assert.ok(!h.includes('france24.com'));
});
test('France, Correze and international sections feature authored coverage first',()=>{
 for(const section of ['France','Corrèze','International','Sport']){
  const t=P.sectionPage(section,{},[]);
  assert.match(t,/Articles, analyses et informations courtes écrits par la rédaction/);
  for(const d of DOSSIERS.filter(x=>x.section===section))assert.ok(t.includes(E.esc(d.title)));
 }
});
test('new original articles are served in full with sources, byline, and date without RSS',async()=>{
 for(const item of STORIES){
  const res=await page('/dossier/'+item.slug);
  assert.equal(res.status,200,item.slug+' not found');
  assert.match(res.body,/Rédaction/);
  assert.match(res.body,/Sources et documents consultés/);
  assert.match(res.body,/22 nov. 2026/);
  for(const section of item.sections)assert.ok(res.body.includes(section.title),'missing section '+section.title);
  for(const s of item.sources)assert.ok(res.body.includes(s.url),'missing source '+s.url);
 }
});
test('journal page leads to authored articles instead of RSS summaries',async()=>{
 const r=await page('/journal');
 assert.equal(r.status,200);
 assert.ok(r.body.includes('cop31-antalya-pas-accord-final'));
 assert.ok(r.body.includes('choos'));
 assert.ok(!r.body.includes('État des flux :'));
});
test('journal homepage links to style, curated articles, and independent briefs',()=>{
 const h=P.cover([]);
 assert.match(h,/\/breves/);
 assert.match(h,/\/dossiers/);
});
test('new CSS file is served and health reports next edition',async()=>{
 const r=await page('/api/health');
 assert.equal(r.status,200);
 assert.equal(JSON.parse(r.body).version,'0.12.0');
});
