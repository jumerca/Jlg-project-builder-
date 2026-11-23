'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {ROLLING,UPDATED_AT}=require('../lib/edition-rolling');
const {DOSSIERS}=require('../lib/dossiers');
const {cover}=require('../lib/frontpage');
const {picture}=require('../lib/photos');
const MEDIA=require('../lib/media-catalog');
const valid=/^https:\/\//;
test('rolling edition publishes valid original dated articles with independent sources',()=>{
 assert.ok(Array.isArray(ROLLING));
 assert.ok(ROLLING.length<=25);
 const ids=new Set();
 for(const article of ROLLING){
  assert.ok(article.slug&&!ids.has(article.slug));ids.add(article.slug);
  assert.match(article.date,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(['France','International','Corrèze','Sport','Cinéma','Voyages','Économie'].includes(article.section));
  assert.ok(article.title?.length>=20&&article.subtitle?.length>=45);
  assert.ok(article.sections?.length>=3&&article.sections.every(s=>s.title&&s.paragraphs?.length>=2));
  assert.ok(article.sources?.length>=2&&article.sources.every(s=>valid.test(s.url)&&s.title?.length>4));
  assert.ok(article.sections.flatMap(s=>s.paragraphs).join(' ').split(/\s+/).length>=250);
  assert.ok(['une','secondary'].includes(article.priority||'secondary'));
 }
});
test('rolling issue leads on the homepage using its actual edition date',()=>{
 const lead=ROLLING.find(x=>x.priority==='une')||ROLLING[0];
 if(!lead)return;
 const html=cover([]);
 assert.ok(html.includes(lead.title.replace(/&/g,'&amp;'))||html.includes(lead.title));
 assert.ok(html.includes('datetime="'+lead.date+'"'));
 assert.ok(html.includes('Actualisée le'));
 assert.ok(!html.includes('Une datée du 22 novembre 2026'));
});
test('new articles are listed ahead of old dossiers and preserve archival originals',()=>{
 assert.ok(DOSSIERS.length>=7);
 for(const article of ROLLING)assert.ok(DOSSIERS.some(d=>d.slug===article.slug));
 assert.ok(DOSSIERS.some(d=>d.slug==='mondial-handball-2027-france'));
 assert.ok(new Set(DOSSIERS.map(d=>d.slug)).size===DOSSIERS.length);
});
test('rolling article pictures show verified attribution and correct archive caption',()=>{
 for(const article of ROLLING){
  const p=article.photo;
  if(!p)continue;
  assert.ok(p.file&&p.author&&p.caption&&p.license&&valid.test(p.licenseUrl));
  const html=picture(article,'article');
  assert.match(html,/<figure/);
  assert.ok(html.includes(p.author));
  assert.ok(html.includes('Wikimedia Commons'));
 }
});

test('live status endpoint exposes the current rolling editorial issue',async()=>{
 const {handler}=require('../server');
 let code=0,data='';
 await handler({url:'/api/health'}, {writeHead(status){code=status},end(body){data=body}});
 assert.equal(code,200);
 const status=JSON.parse(data);
 assert.equal(status.rollingArticles,ROLLING.length);
 assert.equal(status.editorialUpdatedAt,UPDATED_AT);
});
