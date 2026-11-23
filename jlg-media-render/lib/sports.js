'use strict';
const SOURCE=[
 {sport:'Football',name:'Ligue 1',group:'France',kind:'soccer',code:'fra.1'},
 {sport:'Football',name:'Ligue 2',group:'France',kind:'soccer',code:'fra.2'},
 {sport:'Football',name:'Premier League',group:'Angleterre',kind:'soccer',code:'eng.1'},
 {sport:'Football',name:'Liga',group:'Espagne',kind:'soccer',code:'esp.1'},
 {sport:'Football',name:'Bundesliga',group:'Allemagne',kind:'soccer',code:'ger.1'},
 {sport:'Football',name:'Serie A',group:'Italie',kind:'soccer',code:'ita.1'},
 {sport:'Football',name:'Ligue des champions',group:'Europe',kind:'soccer',code:'uefa.champions'},
 {sport:'Football',name:'Équipes nationales',group:'International',kind:'soccer',code:'fifa.friendly'},
 {sport:'Basket',name:'NBA',group:'États-Unis',kind:'basketball',code:'nba'},
 {sport:'Rugby',name:'Top 14',group:'France',kind:'rugby',code:'270559'},
 {sport:'Rugby',name:'Six Nations',group:'International',kind:'rugby',code:'180659'},
 {sport:'Rugby',name:'Coupe du monde',group:'International',kind:'rugby',code:'164205'}
];
const HB=[
 {id:4980,name:'Champions League EHF',group:'Europe'},
 {id:5275,name:'Ligue européenne EHF',group:'Europe'},
 {id:4894,name:'Euro masculin',group:'Sélections'},
 {id:4895,name:'Mondial masculin',group:'Sélections'},
 {id:5483,name:'Amicaux internationaux hommes',group:'Sélections'},
 {id:5484,name:'Amicaux internationaux femmes',group:'Sélections'},
 {id:4536,name:'Starligue',group:'France'}
];
const parisDate=d=>{try{return new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(d))}catch{return null}};
const dateValid=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s))&&Number.isFinite(Date.parse(s+'T12:00:00Z'))&&new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
const today=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const parisClock=d=>{try{return new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}).format(new Date(d))}catch{return null}};
const num=s=>s===null||s===undefined||s===''||! /^\d{1,3}$/.test(String(s))?null:Number(s);
const safeLink=s=>{try{const u=new URL(s);return u.protocol==='https:'?u.href:null}catch{return null}};
function espnMatch(e,kind){
 const c=e.competitions?.[0],rows=c?.competitors||[],st=e.status?.type||c?.status?.type||{};
 if(rows.length!==2||rows.some(x=>!x.team?.displayName))return null;
 const h=rows.find(x=>x.homeAway==='home')||rows[0],a=rows.find(x=>x.homeAway==='away')||rows[1];
 const finished=st.completed===true||st.state==='post',live=st.state==='in';
 const score=x=>(finished||live)?num(x.score):null;
 return {id:String(e.id||''),home:h.team.displayName,away:a.team.displayName,homeScore:score(h),awayScore:score(a),state:finished?'final':live?'live':'scheduled',kickoff:e.date||null,status:finished?'Terminé':live?'En cours selon ESPN':'Programmé',time:parisClock(e.date),url:safeLink((e.links||[]).find(l=>safeLink(l.href))?.href)||null,provider:'ESPN',kind};
}
async function espn(league,date,fetcher=fetch){
 const url='https://site.api.espn.com/apis/site/v2/sports/'+league.kind+'/'+league.code+'/scoreboard?dates='+date.replaceAll('-','');
 try{
  const r=await fetcher(url,{signal:AbortSignal.timeout(6500),headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  if(!Array.isArray(j.events))throw Error('Format fournisseur');
  return {...league,ok:true,url,events:j.events.filter(e=>e.date&&parisDate(e.date)===date).slice(0,55).map(e=>espnMatch(e,league.sport)).filter(Boolean)};
 }catch(e){return {...league,ok:false,url,events:[],error:String(e.message||e).slice(0,90)}}
}
function handballEvent(e,date,league){
 if(!e||String(e.strSport||'').toLowerCase()!=='handball'||e.dateEvent!==date)return null;
 const home=String(e.strHomeTeam||'').trim(),away=String(e.strAwayTeam||'').trim();
 if(!home||!away||home===away)return null;
 const raw=String(e.strStatus||e.strProgress||'').trim().toLowerCase();
 const final=/^(match finished|finished|final|full time|ft|ended|after penalties|after extra time|aet|pen|penalties|full-time|after overtime|aot|ap)$/.test(raw);
 const live=/^(live|in progress|1st half|2nd half|half time|halftime|ht|first half|second half|1h|2h)$/.test(raw);
 const status=final?'Terminé':live?'En cours selon TheSportsDB':/postponed|cancelled|canceled|suspended/.test(raw)?'Reporté ou annulé':'Programmé ou statut non confirmé';
 const h=num(e.intHomeScore),a=num(e.intAwayScore),has=(final||live)&&h!==null&&a!==null&&h<=100&&a<=100;
 const id=/^\d{1,13}$/.test(String(e.idEvent||''))?e.idEvent:null;
 // TheSportsDB timestamps are UTC; never label raw strTime as Paris local time.
 const rawStamp=e.strTimestamp||((e.dateEvent&&/^\d{2}:\d{2}(:\d{2})?$/.test(String(e.strTime||'')))?e.dateEvent+'T'+e.strTime+'Z':null);
 const utc=rawStamp?new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(rawStamp)?rawStamp:rawStamp.replace(' ','T')+'Z'):null;
 const time=utc&&Number.isFinite(utc.getTime())?parisClock(utc.toISOString()):null;
 return {id,home,away,homeScore:has?h:null,awayScore:has?a:null,state:final?'final':live?'live':/postponed|cancelled|canceled|suspended/.test(raw)?'cancelled':'scheduled',kickoff:utc&&Number.isFinite(utc.getTime())?utc.toISOString():null,status,time,url:id?'https://www.thesportsdb.com/event/'+id:null,provider:'TheSportsDB · communauté',kind:'Handball',league:e.strLeague||league.name};
}
async function handball(league,date,fetcher=fetch){
 const url='https://www.thesportsdb.com/api/v1/json/123/eventsday.php?d='+date+'&s=Handball&l='+league.id;
 try{
  const r=await fetcher(url,{signal:AbortSignal.timeout(6000),headers:{Accept:'application/json'}});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  if(!j||!(Array.isArray(j.events)||j.events===null))throw Error('Format fournisseur');
  return {sport:'Handball',name:league.name,group:league.group,ok:true,url,events:(j.events||[]).map(x=>handballEvent(x,date,league)).filter(Boolean)};
 }catch(e){return {sport:'Handball',name:league.name,group:league.group,ok:false,url,events:[],error:String(e.message||e).slice(0,100)}}
}
const caches=new Map();
async function scores(sport,date,fetcher=fetch){
 if(!dateValid(date))throw new RangeError('Invalid date');
 const k=sport+'|'+date;
 if(fetcher===fetch&&caches.has(k)&&Date.now()-caches.get(k).at<150000)return caches.get(k).value;
 const selected=sport==='Tous'?SOURCE:[...SOURCE.filter(x=>x.sport===sport)];
 const all=[...selected.map(x=>espn(x,date,fetcher)),...(sport==='Handball'||sport==='Tous'?HB.map(x=>handball(x,date,fetcher)):[])];
 const leagues=await Promise.all(all);
 const dedupe=new Set();
 for(const lg of leagues)lg.events=lg.events.filter(e=>{const id=e.id?lg.name+'|'+e.id:lg.name+'|'+e.home+'|'+e.away; if(dedupe.has(id))return false;dedupe.add(id);return true});
 const value={date,sport,leagues,fetchedAt:new Date().toISOString(),complete:false};
 if(fetcher===fetch)caches.set(k,{at:Date.now(),value});
 return value;
}
async function standings(kind,code,fetcher=fetch){
 const url='https://site.api.espn.com/apis/v2/sports/'+kind+'/'+code+'/standings';
 try{
  const r=await fetcher(url,{signal:AbortSignal.timeout(6500)});
  if(!r.ok)throw Error('HTTP '+r.status);
  const j=await r.json();
  const entries=j.children?.flatMap(g=>(g.standings?.entries||[]).map(x=>({x,conference:g.name||g.abbreviation||''})))||j.standings?.entries?.map(x=>({x,conference:''}))||[];
  const isNBA=kind==='basketball';
  const records=entries.map(({x,conference},i)=>{
   const stats=x.stats||[];
   const get=(...names)=>stats.find(z=>names.includes(z.name)||names.includes(z.abbreviation))?.value??null;
   const wins=get('wins','W'),losses=get('losses','L');
   const validRecord=isNBA&&Number.isInteger(wins)&&Number.isInteger(losses)&&wins>=0&&losses>=0;
   const officialSeed=get('playoffSeed');
   return {team:x.team?.displayName||x.team?.name||'',conference:conference.includes('Eastern')?'Est':conference.includes('Western')?'Ouest':conference,rank:isNBA?(Number.isInteger(officialSeed)&&officialSeed>=1&&officialSeed<=15?officialSeed:null):(get('rank','RANK')??i+1),played:isNBA?(validRecord?wins+losses:null):get('gamesPlayed','GP','games'),points:isNBA?(validRecord?wins+'–'+losses:null):get('points','PTS')};
  }).filter(x=>x.team);
  if(isNBA)records.sort((a,b)=>(a.conference||'').localeCompare(b.conference||'','fr')||(a.rank??99)-(b.rank??99));
  return {ok:true,url,records:records.slice(0,isNBA?30:24)};
 }catch(e){return {ok:false,url,records:[],error:String(e.message||e)}}
}
module.exports={SOURCE,HB,dateValid,today,num,espnMatch,handballEvent,espn,handball,scores,standings,parisClock,parisDate};