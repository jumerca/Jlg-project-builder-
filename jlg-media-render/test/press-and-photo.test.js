'use strict';
const t=require('node:test'),a=require('node:assert/strict');
const M=require('../lib/media-catalog'),S=require('../lib/sources'),E=require('../lib/editorial'),I=require('../lib/photos'),F=require('../lib/frontpage');
const {DOSSIERS}=require('../lib/dossiers'),{handler}=require('../server');
async function route(url){let status=0,body='';await handler({url},{writeHead(s){status=s},end(s){body=String(s||'')}});return{status,body};}
t('mainstream French television radio and written outlets included',()=>{
 for(const n of ['BFMTV','TF1 INFO','franceinfo','Le Figaro','Le Monde','RTL','France Inter','France Culture','Ouest-France','Sud Ouest','Le Parisien','ICI Limousin']){
  a.ok(M.GENERAL.some(x=>x.name===n),n);
 }
 for(const n of ['RMC Sport',"L'Équipe",'Rugbyrama','Midi Olympique'])a.ok(M.SPORT.some(x=>x.name===n),n);
});
t('Le Monde is researched without copying its RSS as a public feed',()=>{
 a.equal(M.GENERAL.find(x=>x.name==='Le Monde').researchOnly,true);
 a.equal(S.FEEDS.some(x=>/lemonde\.fr/.test(x.url)),false);
});
t('trusted Google News discovery only accepts explicitly allowed newsroom attribution',()=>{
 const feed=M.DISCOVERY[0];
 a.equal(M.acceptsAggregate(feed,'BFMTV','https://news.google.com/rss/articles/a'),true);
 a.equal(M.acceptsAggregate(feed,'TF1 INFO','https://news.google.com/rss/articles/a'),true);
 a.equal(M.acceptsAggregate(feed,'Rugbyrama','https://news.google.com/rss/articles/a'),false);
 a.equal(M.acceptsAggregate(feed,'Unknown outlet','https://news.google.com/rss/articles/a'),false);
});
t('BFMTV and RMC Sport and Midi Olympique and Rugbyrama are not fake independent confirmations',()=>{
 const items=[
 {title:'Victoire historique du rugby français en finale',url:'https://a.fr/1',publisher:'Rugbyrama',epoch:2},
 {title:'Victoire historique du rugby français en finale',url:'https://a.fr/2',publisher:'Midi Olympique',epoch:1}];
 const [story]=E.combine(items);
 a.equal(story.kind,'breve');a.equal(story.publishers,1);
 a.equal(M.family('BFMTV'),M.family('RMC Sport'));
});
t('all seven editorial dossiers have one true photo identified with attribution and license',()=>{
 a.equal(DOSSIERS.length,7);
 for(const d of DOSSIERS){
  const p=I.PHOTOS[d.slug];
  a.ok(p,d.slug);
  a.ok(p.file.match(/\.(jpg|JPG)$/),d.slug);
  a.ok(p.author&&p.license&&p.licenseUrl&&p.caption);
  const rendered=I.picture(d,'article');
  a.match(rendered,/Wikimedia Commons/);
  a.match(rendered,/figcaption/);
  a.match(rendered,/Special:FilePath/);
 }
});
t('front-page leading report displays a photo and no Notre méthode block',()=>{
 const cover=F.cover([]);
 a.match(cover,/ed-photo-lead/);
 a.doesNotMatch(cover,/NOTRE MÉTHODE|Notre méthode/);
 const card=F.newsroomCard(DOSSIERS[1]);
 a.match(card,/ed-photo-card/);
});
t('public homepage and article render correct photo credits and no method aside',async()=>{
 const home=await route('/');
 a.equal(home.status,200);
 a.doesNotMatch(home.body,/NOTRE MÉTHODE|Notre méthode/);
 const article=await route('/dossier/cop31-antalya-pas-accord-final');
 a.equal(article.status,200);
 a.match(article.body,/Necati Savas/);
 a.match(article.body,/CC BY 4.0/);
 a.doesNotMatch(article.body,/Notre méthode/);
});
