'use strict';
// Schedule snapshots from federation calendars, verified 22 November 2026.
// These are *fixtures*, never score or live-status assertions.
const OFFICIAL=[
 {date:'2026-11-26',time:'19:30',home:'Allemagne',away:'France',competition:'Amical international féminin',venue:'Stuttgart (Allemagne)',url:'https://www.ffhandball.fr/actualite/equipe-de-france/edff-preparation-finale-de-lehf-euro-2026-20-joueuses-appelees/',source:'FFHandball'},
 {date:'2026-11-28',time:'15:30',home:'Allemagne',away:'France',competition:'Amical international féminin',venue:'Neu-Ulm (Allemagne)',url:'https://www.ffhandball.fr/actualite/equipe-de-france/edff-preparation-finale-de-lehf-euro-2026-20-joueuses-appelees/',source:'FFHandball'},
 {date:'2026-12-05',time:'18:00',home:'France',away:'Pologne',competition:'Euro féminin 2026 · Groupe E',venue:'Katowice (Pologne)',url:'https://www.eurohandball.com/en/club/qTEsyLUufkrnyhQCUjCiiQ/France/',source:'EHF'},
 {date:'2026-12-07',time:'20:30',home:'France',away:'Îles Féroé',competition:'Euro féminin 2026 · Groupe E',venue:'Katowice (Pologne)',url:'https://www.eurohandball.com/en/club/qTEsyLUufkrnyhQCUjCiiQ/France/',source:'EHF'},
 {date:'2026-12-09',time:'20:30',home:'Ukraine',away:'France',competition:'Euro féminin 2026 · Groupe E',venue:'Katowice (Pologne)',url:'https://www.eurohandball.com/en/club/qTEsyLUufkrnyhQCUjCiiQ/France/',source:'EHF'}
];
const iso=d=>d.toISOString().slice(0,10);
const offset=(date,n)=>{const d=new Date(date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return iso(d)};
const range=(start,days=7)=>Array.from({length:Math.max(1,Math.min(7,days))},(_,i)=>offset(start,i));
const dailyOfficial=date=>OFFICIAL.filter(e=>e.date===date);
const weeklyOfficial=(start,days=7)=>OFFICIAL.filter(e=>e.date>=start&&e.date<=offset(start,days-1));
const SPORTSDB='https://www.thesportsdb.com/api/v1/json/123/eventsday.php';
let memory=new Map();
async function week(start,fetcher=fetch){
 const dayList=range(start,7),cache=memory.get(start);
 if(fetcher===fetch&&cache&&Date.now()-cache.at<300000)return cache.data;
 const sport=require('./sports');
 const results=await Promise.all(dayList.map(async date=>{
  const sourceUrl=SPORTSDB+'?d='+date+'&s=Handball';
  try{
   const r=await fetcher(sourceUrl,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(5500)});
   if(!r.ok)throw Error('HTTP '+r.status);
   const payload=await r.json();
   if(!(payload&&('events' in payload))||!(Array.isArray(payload.events)||payload.events===null))throw Error('Format inattendu');
   const remote=(payload.events||[]).map(e=>sport.handballEvent(e,date,{name:e.strLeague||'Handball'})).filter(Boolean).slice(0,30);
   return {date,sourceUrl,ok:true,events:remote};
  }catch(e){return {date,sourceUrl,ok:false,events:[],error:String(e.message||e).slice(0,90)}}
 }));
 const data={start,days:results,official:weeklyOfficial(start,7),sourceNote:'Couverture gratuite TheSportsDB partielle et non exhaustive. Les rencontres EHF / FFHandball annoncées ne constituent pas un flux de scores et leurs horaires sont ceux relevés le 22/11/2026.'};
 if(fetcher===fetch)memory.set(start,{data,at:Date.now()});
 return data;
}
module.exports={OFFICIAL,SPORTSDB,offset,range,dailyOfficial,weeklyOfficial,week};