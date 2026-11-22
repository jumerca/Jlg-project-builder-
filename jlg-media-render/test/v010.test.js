'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const S=require('../lib/sports'),A=require('../lib/agenda'),V=require('../lib/agenda-view');
const {DOSSIERS}=require('../lib/dossiers');
const {handler}=require('../server');
async function page(url){
 let status=0,body='',headers={};
 const res={writeHead(code,h){status=code;headers=h},end(s){body=String(s??'')}};
 await handler({url,method:'GET'},res);
 return {status,body,headers};
}
test('all published dossiers have unique slugs and more than one documentary host',()=>{
 assert.ok(DOSSIERS.length>=3);
 const slugs=new Set(DOSSIERS.map(d=>d.slug));
 assert.equal(slugs.size,DOSSIERS.length);
 for(const d of DOSSIERS){
  assert.ok(d.title&&d.subtitle&&d.sections.length>=3);
  assert.ok(d.sections.every(s=>s.paragraphs.length>=2));
  assert.ok(new Set(d.sources.map(s=>new URL(s.url).hostname.replace(/^www\./,''))).size>=2);
 }
});
test('official handball matches from FFHandball November and EHF December are separated from results',()=>{
 assert.equal(A.weeklyOfficial('2026-11-22').length,2);
 assert.equal(A.weeklyOfficial('2026-12-03').length,3);
 const nov=A.dailyOfficial('2026-11-26')[0];
 assert.equal(nov.home,'Allemagne');
 assert.equal(nov.time,'19:30');
 assert.ok(A.dailyOfficial('2026-11-22').length===0);
});
test('seven day calendar requests each date and rejects unrelated sports',async()=>{
 const seen=[];
 const fetcher=async url=>{
  const date=new URL(url).searchParams.get('d');seen.push(date);
  return {ok:true,json:async()=>({events:[{strSport:'Handball',dateEvent:date,idEvent:'12345',strHomeTeam:'AAA',strAwayTeam:'BBB',strStatus:'Not Started'},{strSport:'Soccer',dateEvent:date,strHomeTeam:'C',strAwayTeam:'D'}]})};
 };
 const data=await A.week('2026-11-22',fetcher);
 assert.equal(seen.length,7);
 assert.equal(data.days.length,7);
 assert.equal(data.official.length,2);
 assert.ok(data.days.every(d=>d.events.length===1));
 assert.ok(data.days.every(d=>d.events[0].homeScore===null));
 assert.match(V.calendarPage(data),/Stuttgart/);
});
test('dossier index and new dossier article routes respond 200 without network',async()=>{
 const index=await page('/dossiers');
 assert.equal(index.status,200);
 assert.match(index.body,/Le journal, /);
 assert.match(index.body,/Euro féminin 2026/);
 assert.match(index.body,/Oyonnax/);
 const eu=await page('/dossier/euro-feminin-2026-bleues');
 assert.equal(eu.status,200);
 assert.match(eu.body,/5 décembre/);
 const brive=await page('/dossier/oyonnax-brive-32-22-2026');
 assert.equal(brive.status,200);
 assert.match(brive.body,/32 à 22/);
});
test('rugby and handball rankings never silently show football tables',async()=>{
 for(const sport of ['Rugby','Handball']){
  const r=await page('/classements?sport='+sport+'&jour=2026-11-22');
  assert.equal(r.status,200);
  assert.match(r.body,/Classement indisponible/);
  assert.doesNotMatch(r.body,/<h3>Premier League<\/h3>/);
  assert.doesNotMatch(r.body,/<h3>NBA<\/h3>/);
 }
});
test('invalid weekly calendar date returns 400 and never calls upstream feeds',async()=>{
 const r=await page('/calendrier?debut=2026-02-29');
 assert.equal(r.status,400);
});
test('official match cards show zero invented scores and link to federation',()=>{
 const s=V.officialCards('2026-12-05','Handball');
 assert.match(s,/— : —/);
 assert.match(s,/Source EHF/);
 assert.match(s,/France/);
 assert.equal(V.officialCards('2026-11-22','Football'),'');
});
test('ESPN filters events on Paris local calendar date',async()=>{
 const home=(date,id)=>({id,date,status:{type:{state:'pre'}},competitions:[{competitors:[{homeAway:'home',team:{displayName:'AAA'}},{homeAway:'away',team:{displayName:'BBB'}}]}]});
 const events=[home('2026-11-22T23:45:00Z','x'),home('2026-11-22T18:00:00Z','y')];
 const fetcher=async()=>({ok:true,json:async()=>({events})});
 const result=await S.espn(S.SOURCE[0],'2026-11-22',fetcher);
 assert.equal(result.ok,true);
 assert.deepEqual(result.events.map(e=>e.id),['y']);
});
test('TheSportsDB time is interpreted as UTC and shown in Paris time',()=>{
 const event={idEvent:'123',strSport:'Handball',dateEvent:'2026-11-26',strHomeTeam:'Allemagne',strAwayTeam:'France',strStatus:'Not Started',strTimestamp:'2026-11-26T18:30:00Z'};
 const match=S.handballEvent(event,'2026-11-26',{name:'Amical'});
 assert.match(match.time,/19:30/);
 assert.equal(match.homeScore,null);
});
