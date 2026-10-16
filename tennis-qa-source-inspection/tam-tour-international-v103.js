(function Touring(){
'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),eur=v=>Math.round(v).toLocaleString('fr-FR')+' €',minmax=(x,a,b)=>Math.min(b,Math.max(a,x)),read=k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch{return null}};
const KEY='tennis_tourism_v103',SAVE='tennis_dynasty_v05_career',MANAGER='tennis_dynasty_director_v5',PLAYERS='tennis_academy_recruit_v10';
const tours=[
 ['Barcelone','Espagne','terre battue',740,390,'Europe'],['Lisbonne','Portugal','dur',630,390,'Europe'],['Prague','Tchéquie','terre battue',790,450,'Europe'],['Londres','Royaume-Uni','gazon',980,680,'Europe'],
 ['Montréal','Canada','dur',2100,790,'Amérique'],['New York','États-Unis','dur',2360,880,'Amérique'],['Tokyo','Japon','dur',2820,800,'Asie'],['Melbourne','Australie','dur',3280,990,'Océanie'],
 ['Rome','Italie','terre battue',760,540,'Europe'],['Berlin','Allemagne','dur',700,470,'Europe'],['Buenos Aires','Argentine','terre battue',2670,690,'Amérique'],['Stockholm','Suède','dur',980,560,'Europe']];
const modes={
 low:{name:'Économique',detail:'Hébergement partagé, joueur autonome, fatigue plus importante',travel:.78,lodging:.76,staff:0,medical:0,edge:-8,fatigue:20,gain:.8},
 normal:{name:'Encadré',detail:'Entraîneur accompagnant, hébergement standard, suivi de récupération',travel:1,lodging:1,staff:640,medical:0,edge:0,fatigue:12,gain:1},
 top:{name:'Performance',detail:'Entraîneur, préparation sur place et suivi médical',travel:1.17,lodging:1.24,staff:940,medical:520,edge:7,fatigue:6,gain:1.18}};
const core=()=>window.__TennisDynastyCore?.getCareer?.(),week=c=>(c.year-1)*52+c.week;
const random=key=>{let seed=String(key).split('').reduce((a,x)=>(a*33+x.charCodeAt(0))>>>0,5381);return()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296}};
let state=read(KEY)||{version:103,bookings:[],results:[],athletes:{},ledger:[],sponsorships:[]};for(const k of ['bookings','results','ledger','sponsorships'])if(!Array.isArray(state[k]))state[k]=[];if(!state.athletes)state.athletes={};
let tab='',modal=null,open=false,chosen='lead',eventId='',mode='normal',sponsor=false,acceptRisk=false,notice='',advanceCareer=null,watch=null,page=null;
function people(){const c=core();if(!c)return[];
const arr=Object.values(c.playerRatings||{}).filter(Number.isFinite);const avg=arr.length?Math.round(arr.reduce((s,n)=>s+n,0)/arr.length):60;
const first={id:'lead',type:'pro',name:c.name||'Joueur de l’académie',age:c.age,level:avg,potential:c.potential||85};
const juniors=(c.academyV2?.prospects||[]).filter(x=>x.name).map(x=>({id:'junior:'+x.id,type:'junior',name:x.name,age:x.age,level:Number(x.skill)||48,potential:Number(x.potential)||85}));
const pros=(read(PLAYERS)?.players||[]).filter(x=>x.age>=18).map(x=>({id:'pro:'+x.id,type:'pro',name:x.name,age:x.age,level:Number(state.athletes['pro:'+x.id]?.level||x.rating||68),potential:Number(x.potential)||90}));
return [first,...juniors,...pros]}
function calendar(){const c=core();if(!c)return[];const now=week(c),all=[];for(const year of [c.year,c.year+1])for(let wk=3;wk<=51;wk+=2){const at=(year-1)*52+wk,delta=at-now;if(delta<1||delta>13)continue;const i=Math.floor((wk-3)/2),kind=i%2===0?'junior':'pro',venue=tours[(i+year*3)%tours.length];all.push({id:'evt-'+year+'-'+wk,year,week:wk,at,delta,kind,city:venue[0],country:venue[1],surface:venue[2],travel:venue[3],lodging:venue[4],zone:venue[5],opponent:kind==='junior'?61+(i%4)*6:74+(i%4)*5,name:(kind==='junior'?'International Junior':'Open Circuit')+' · '+venue[0]})}return all.sort((a,b)=>a.at-b.at)}
function chosenDetails(){const group=people();if(!group.some(x=>x.id===chosen))chosen=group[0]?.id||'lead';const person=group.find(x=>x.id===chosen);const events=calendar().filter(x=>x.kind===person?.type);
if(!events.some(e=>e.id===eventId))eventId=events[0]?.id||'';const event=events.find(e=>e.id===eventId);if(!event||!canSponsor(event))sponsor=false;return{person,event}}
function management(){return read(MANAGER)||{}}
function canSponsor(event){return !!event&&Number(management().sponsor||0)>0&&!state.sponsorships.some(s=>s.year===event.year)}
function costs(ev,tier,useSponsor){const m=modes[tier];const entry=ev.kind==='junior'?225:530;const base=Math.ceil((ev.travel*m.travel+ev.lodging*m.lodging+entry+m.staff+m.medical+(ev.zone==='Europe'?80:230))/10)*10;const allowance=useSponsor?Math.min(1200,Math.round(base*.22/10)*10):0;return{before:base,support:allowance,due:base-allowance}}
function reserve(){const c=core(),dir=management();const weekly=Math.max(300,Math.round((c.courts||1)*85+(c.staffLevel||1)*120+(c.academyV2?.prospects?.length||0)*36+(dir.staff||[]).reduce((s,x)=>s+Math.max(0,Number(x.monthly||0))/4.33,0)));return{weekly,safe:weekly*4}}
function log(msg){state.ledger.unshift({year:core()?.year,week:core()?.week,text:msg});state.ledger=state.ledger.slice(0,70);core()?.log?.(msg)}
function persist(){const c=core();if(!c||typeof c.snapshot!=='function')throw Error('Sauvegarde de carrière indisponible');localStorage.setItem(KEY,JSON.stringify(state));window.__TennisDynastyCore?.saveCareer?.();const snapshot=read(SAVE);if(snapshot?.format===2&&snapshot.career){snapshot.career=c.snapshot();localStorage.setItem(SAVE,JSON.stringify(snapshot))}}
function priceBalance(q){const c=core(),f=reserve();return{balance:c.funds,after:c.funds-q.due,buffer:f.safe,deficit:c.funds-q.due<f.safe}}
function confirm(){
const c=core(),{person,event}=chosenDetails();if(!c||!person||!event){notice='Choisis un joueur et un tournoi.';paint();return}if(c.active){notice='Termine le tournoi déjà commencé avant ce déplacement.';paint();return}
const q=costs(event,mode,sponsor),balance=priceBalance(q);
const already=state.bookings.some(b=>b.status==='scheduled'&&b.person===person.id&&Math.abs(b.at-event.at)<3);
if(already){notice='Un déplacement est déjà prévu pour ce joueur sur cette période.';paint();return}
const occupied=state.bookings.filter(b=>b.status==='scheduled'&&b.tier!=='low'&&Math.abs(b.at-event.at)<=1).length;
if(mode!=='low'&&occupied>=Math.max(1,c.staffLevel||1)){notice='Aucun entraîneur disponible pour accompagner ce déplacement. Choisis une formule autonome ou un autre tournoi.';paint();return}
if(sponsor&&!canSponsor(event)){notice='Aide du sponsor déjà utilisée cette saison.';paint();return}
if(c.funds<q.due){notice='Trésorerie insuffisante pour payer le déplacement.';paint();return}
if(balance.deficit&&!acceptRisk){notice='Coche la case de risque financier pour engager la réserve de fonctionnement.';paint();return}
const old={state:JSON.stringify(state),funds:c.funds,save:localStorage.getItem(KEY),career:localStorage.getItem(SAVE)};
try{c.funds-=q.due;
 const b={id:'trip-'+Date.now().toString(36)+'-'+state.bookings.length,person:person.id,name:person.name,category:person.type,age:person.age,level:person.level,potential:person.potential,event:event.id,title:event.name,at:event.at,year:event.year,week:event.week,city:event.city,zone:event.zone,opponent:event.opponent,surface:event.surface,tier:mode,price:q.due,support:q.support,status:'scheduled'};
 state.bookings.push(b);if(sponsor)state.sponsorships.push({id:b.id,year:event.year});
 state.ledger.unshift({year:c.year,week:c.week,type:'reservation',amount:-q.due,description:b.title});log('Déplacement confirmé : '+b.name+' à '+b.city+' ('+eur(q.due)+')');persist();
 notice='Tournoi confirmé pour '+b.name+' : semaine '+b.week+', '+eur(q.due)+' réglés.';sponsor=false;acceptRisk=false;paint();
}catch(e){state=JSON.parse(old.state);c.funds=old.funds;try{old.save===null?localStorage.removeItem(KEY):localStorage.setItem(KEY,old.save);old.career===null?localStorage.removeItem(SAVE):localStorage.setItem(SAVE,old.career)}catch{}notice='Sauvegarde impossible : aucun déplacement confirmé. '+String(e.message||e);paint()}
}
function cancel(id){const c=core(),b=state.bookings.find(x=>x.id===id&&x.status==='scheduled');if(!c||!b)return;const d=b.at-week(c);if(d<=0){notice='Le tournoi est commencé : annulation impossible.';paint();return}
const percent=d>=3?.6:d>=2?.35:.15,refund=Math.round(b.price*percent),old={s:JSON.stringify(state),funds:c.funds};try{b.status='cancelled';b.refund=refund;c.funds+=refund;if(b.support)state.sponsorships=state.sponsorships.filter(x=>x.id!==b.id);state.ledger.unshift({type:'refund',year:c.year,week:c.week,amount:refund,description:b.title});log('Déplacement annulé : remboursement partiel '+eur(refund));persist();notice='Annulation enregistrée : '+eur(refund)+' remboursés.';paint()}catch(e){state=JSON.parse(old.s);c.funds=old.funds;notice='Annulation impossible à sauvegarder.';paint()}}
function finish(b,c){
 const m=modes[b.tier],r=random(b.id+':'+b.name),one=people().find(x=>x.id===b.person),prev=state.athletes[b.person]||{fatigue:0,points:0,played:0,wins:0,level:b.level};
 const skill=Number(one?.level||prev.level||b.level),tired=Number(prev.fatigue||0);
 const trainer=(management().staff||[]).some(x=>['coach','juniorCoach','fitness'].includes(x.role))&&b.tier!=='low'?3:0;
 const chance=minmax(.48+(skill-b.opponent)*.012+m.edge*.012+trainer*.009-tired*.002,.12,.8);
 let wins=0;for(let k=0;k<4;k++){if(r()<minmax(chance-wins*.1,.07,.82))wins++;else break}
 const pts=([0,4,12,30,65][wins])*(b.category==='pro'?2:1);
 const prize=b.category==='pro'?[0,150,440,960,2400][wins]:0;
 const improve=Math.round((wins===0?.12:.28+wins*.23)*m.gain*100)/100;
 const health=minmax(tired+m.fatigue+wins*4,0,100);
 state.athletes[b.person]={fatigue:health,points:(prev.points||0)+pts,played:(prev.played||0)+1,wins:(prev.wins||0)+wins,level:Math.min(b.potential||95,Math.round((skill+improve)*100)/100)};
 if(b.category==='junior'){const junior=c.academyV2?.prospects?.find(x=>'junior:'+x.id===b.person);if(junior){junior.skill=Math.min(junior.potential||99,Math.round((Number(junior.skill||skill)+improve)*100)/100);junior.tourPoints=(junior.tourPoints||0)+pts;junior.travelFatigue=health;}}
 if(b.person==='lead'){c.points=Math.max(0,(c.points||0)+pts);c.fatigue=minmax((c.fatigue||0)+Math.round(m.fatigue/2)+wins,0,100)}
 if(wins>=2&&c.academyV2)c.academyV2.reputation=minmax((c.academyV2.reputation||12)+(wins>=3?2:1),1,100);
 if(prize)c.funds+=prize;
 Object.assign(b,{status:'played',wins,points:pts,prize,progress:improve,fatigue:health});
 state.results.unshift({id:b.id,name:b.name,event:b.title,wins,pts,prize,improve,mode:b.tier,year:c.year,week:c.week});
 state.results=state.results.slice(0,70);state.ledger.unshift({type:'prize',year:c.year,week:c.week,amount:prize,description:b.title});
 log(b.name+' : '+b.title+' · '+wins+' victoire(s), +'+pts+' points, progression '+improve+', prime '+eur(prize));
}
function installHook(){const c=core();if(!c||c===advanceCareer||typeof c.advance!=='function')return;advanceCareer=c;const original=c.advance;
 c.advance=function(...args){const begin=week(c),res=original.apply(this,args),end=week(c);if(end<=begin)return res;
 let needs=false;for(let i=begin+1;i<=Math.min(end,begin+4);i++){for(const b of state.bookings.filter(x=>x.status==='scheduled'&&x.at===i)){finish(b,c);needs=true;}for(const s of Object.values(state.athletes))s.fatigue=Math.max(0,Math.round((s.fatigue||0)-3));}
 if(needs){try{persist()}catch(e){console.warn('Tournois V10.3 : sauvegarde échouée',e)}if(open)paint()}return res};
 c.advance.__tour103=true}
function paint(){
 if(!page||!open)return;const c=core(),athletes=people(),selected=chosenDetails(),p=selected.person,events=calendar().filter(e=>e.kind===p?.type),event=selected.event,q=p&&event?costs(event,mode,sponsor):null,pred=q?priceBalance(q):null;
 page.innerHTML='<header class="tour103-head"><div><small>ACADÉMIE · GESTION SPORTIVE INTERNATIONALE</small><h2>Tournois et déplacements</h2><p>Budget, encadrement et progression : chaque décision a un coût.</p></div><button data-exit="1">← Académie</button></header>'+
 (!c?'<p>Crée une académie pour planifier les déplacements.</p>':
 '<section class="tour103-pane"><div class="tour103-selects"><label>Joueur / joueuse<select id="tour103Player">'+athletes.map(x=>'<option value="'+esc(x.id)+'" '+(x.id===chosen?'selected':'')+'>'+esc(x.name)+' · '+(x.type==='junior'?'Junior':'Pro')+' · niveau '+Math.round(x.level)+'</option>').join('')+'</select></label><label>Tournoi<select id="tour103Event">'+events.map(x=>'<option value="'+x.id+'" '+(x.id===eventId?'selected':'')+'>'+esc(x.name)+' · S'+x.week+' A'+x.year+'</option>').join('')+'</select></label></div>'+
 (event?'<div class="tour103-event"><strong>'+esc(event.name)+'</strong><small>'+esc(event.country)+' · '+esc(event.surface)+' · dans '+event.at-week(c)+' sem. · adversaires '+event.opponent+'/100</small></div>':'<p>Pas de tournoi de cette catégorie dans les 13 prochaines semaines.</p>')+
 '<h3>Comment financer ce déplacement ?</h3><div class="tour103-modes">'+Object.entries(modes).map(([id,m])=>'<button data-mode="'+id+'" class="'+(mode===id?'selected':'')+'"><strong>'+m.name+'</strong><small>'+m.detail+'</small><b>'+ (event?eur(costs(event,id,false).before):'—')+'</b><span>Performance '+(m.edge>=0?'+':'')+m.edge+' · Fatigue +'+m.fatigue+'</span></button>').join('')+'</div>'+
 '<label class="tour103-check"><input id="tour103Sponsor" type="checkbox" '+(sponsor?'checked':'')+' '+(!canSponsor(event)?'disabled':'')+'>Mobiliser le sponsor déjà signé (co-financement limité à une fois par saison)</label>'+
 '<label class="tour103-check"><input id="tour103Risk" type="checkbox" '+(acceptRisk?'checked':'')+'>Accepter de descendre sous la réserve financière recommandée</label>'+
 '<div class="tour103-kpis"><div><small>Trésorerie</small><strong>'+eur(c.funds)+'</strong></div><div><small>Coût immédiat</small><strong>'+eur(q?.due||0)+'</strong></div><div><small>Réserve 4 semaines</small><strong>'+eur(reserve().safe)+'</strong></div><div><small>Après décision</small><strong>'+eur(pred?.after||c.funds)+'</strong></div></div>'+
 (pred?.deficit?'<p class="tour103-risk">Attention : cet investissement entame la réserve de fonctionnement et peut fragiliser l’académie.</p>':'<p>La réserve recommandée de fonctionnement est préservée.</p>')+
 '<p>Les jeunes gagnent de l’expérience et des points juniors, sans primes financières. Les professionnels peuvent remporter des prix, mais rien n’est garanti.</p>'+
 '<button id="tour103Book" '+(!event?'disabled':'')+'>Financer le tournoi · '+eur(q?.due||0)+'</button></section>'+
 '<section class="tour103-pane"><h3>Voyages programmés</h3>'+(state.bookings.some(x=>x.status==='scheduled')?state.bookings.filter(x=>x.status==='scheduled').map(x=>'<div class="tour103-row"><span><strong>'+esc(x.name)+'</strong> · '+esc(x.title)+'<small>S'+x.week+' A'+x.year+' · '+eur(x.price)+' payés · '+modes[x.tier].name+'</small></span><button data-cancel="'+x.id+'">Annuler</button></div>').join(''):'<p>Aucun voyage engagé.</p>')+'</section>'+
 '<section class="tour103-pane"><h3>Résultats et retour sur investissement</h3>'+(state.results.length?state.results.slice(0,8).map(x=>'<div class="tour103-row"><span><strong>'+esc(x.name)+'</strong> · '+esc(x.event)+'<small>'+x.wins+' victoires · +'+x.pts+' pts · +'+x.improve+' progression · '+eur(x.prize)+' de primes</small></span></div>').join(''):'<p>Les résultats apparaissent quand le calendrier atteint la semaine du tournoi.</p>')+'</section>')+
 '<p class="tour103-message" role="status">'+esc(notice)+'</p>';
}
function openPanel(){if(!page)return;open=true;page.hidden=false;const native=$('#td5Director .td5-page');if(native)native.style.display='none';paint()}
function closePanel(){open=false;if(page)page.hidden=true;const native=$('#td5Director .td5-page');if(native)native.style.display='';}
function ensure(){const base=$('#td5Director'),tabs=base?.querySelector('.td5-tabs');if(!base||!tabs)return;
 if(!tabs.querySelector('#tour103Tab')){const btn=document.createElement('button');btn.id='tour103Tab';btn.textContent='Tournois internationaux';btn.type='button';btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openPanel()});tabs.append(btn);}
 if(!page||!page.isConnected){page=document.createElement('section');page.id='tour103Panel';page.hidden=!open;base.append(page);if(open)paint()}
 installHook();}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(open&&b.closest('#td5Director .td5-tabs')&&b.id!=='tour103Tab'){closePanel();return;}
 if(!b.closest('#tour103Panel'))return;
 if(b.dataset.exit){closePanel();$('#td5Director [data-tab="direction"]')?.click();return}
 if(b.dataset.mode){mode=b.dataset.mode;paint();return}
 if(b.id==='tour103Book'){confirm();return}
 if(b.dataset.cancel){cancel(b.dataset.cancel);return}
});
document.addEventListener('change',e=>{if(!e.target.closest('#tour103Panel'))return;
 if(e.target.id==='tour103Player'){chosen=e.target.value;eventId='';sponsor=false;acceptRisk=false;paint();}
 if(e.target.id==='tour103Event'){eventId=e.target.value;sponsor=false;acceptRisk=false;paint();}
 if(e.target.id==='tour103Sponsor'){sponsor=e.target.checked;paint()}
 if(e.target.id==='tour103Risk'){acceptRisk=e.target.checked;paint()}
});
const style=document.createElement('style');style.id='tour103CSS';style.textContent=`
#tour103Tab{border-color:#22c7c9!important;color:#22c7c9!important;font-weight:800!important}
#tour103Panel{margin:10px 0;color:#f0f5f7;font:13px/1.5 system-ui,sans-serif}#tour103Panel[hidden]{display:none!important}
#tour103Panel *{box-sizing:border-box}#tour103Panel button{cursor:pointer;font:inherit}
#tour103Panel button:disabled{opacity:.4}
.tour103-head{display:flex;align-items:center;justify-content:space-between;gap:13px;background:#1e2e3a;border:1px solid #426776;border-radius:12px;padding:15px}
.tour103-head h2{color:#f5f8fa;font-size:23px;margin:4px 0}.tour103-head p{color:#b6cbd3;margin:0}
.tour103-head small{color:#22c7c9;font-size:10px;letter-spacing:.1em}
.tour103-head button,.tour103-row button{background:#324b59;color:#f3f8f9;border:1px solid #54717d;border-radius:8px;min-height:44px;padding:9px 12px}
.tour103-pane{background:#1e303b;border:1px solid #466371;border-radius:12px;margin-top:11px;padding:15px}
.tour103-pane h3{color:#edf5f7;font-size:16px;margin:11px 0}
.tour103-selects{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tour103-selects label{display:flex;flex-direction:column;gap:6px;color:#d2e1e7}
.tour103-selects select{width:100%;min-height:44px;padding:9px;color:#eaf4f7;background:#304958;border:1px solid #5d7b8a;border-radius:9px}
.tour103-event{display:flex;justify-content:space-between;gap:9px;background:#2a4250;border:1px solid #4c6f7c;border-radius:9px;padding:10px;margin-top:12px}
.tour103-event strong{color:#f5f8fa}.tour103-event small{color:#b6cad3}
.tour103-modes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
.tour103-modes button{background:#2b4552;text-align:left;border:1px solid #52727f;color:#f2f6f8;border-radius:10px;padding:12px;min-height:153px;display:flex;flex-direction:column;gap:6px}
.tour103-modes button.selected{border:2px solid #22c7c9;background:#1a454e}
.tour103-modes strong{font-size:15px}.tour103-modes small{flex:1;color:#bbd0d7;font-size:11px}.tour103-modes b{font-size:15px}.tour103-modes span{color:#a5d6d6;font-size:10px}
.tour103-check{display:flex;align-items:flex-start;gap:9px;padding:9px 0}.tour103-check input{margin-top:3px;accent-color:#22c7c9}
.tour103-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin:9px 0}
.tour103-kpis div{background:#304856;border:1px solid #4d6d7b;border-radius:8px;padding:9px;display:flex;flex-direction:column;gap:5px}
.tour103-kpis small{font-size:10px;color:#b5c9d1}.tour103-kpis strong{font-size:15px}
.tour103-risk{border:1px solid #c48b53;color:#ffd19e;padding:10px;border-radius:8px}
#tour103Book{border:1px solid #22c7c9;background:#22c7c9;color:#0c2933;font-weight:800;border-radius:8px;padding:12px;min-height:44px}
.tour103-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid #47616d}
.tour103-row span{display:flex;flex-direction:column;gap:4px}.tour103-row small{color:#b8cbd3;font-size:11px}
.tour103-message{color:#f7c48a;min-height:20px}
@media(max-width:800px){.tour103-modes{grid-template-columns:1fr}.tour103-modes button{min-height:96px}.tour103-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.tour103-head{flex-direction:column;align-items:flex-start}.tour103-selects{grid-template-columns:1fr}.tour103-event{flex-direction:column}}
`;document.head.append(style);
ensure();let i=0;const tid=setInterval(()=>{ensure();if(++i>=40)clearInterval(tid)},375);
window.TAM103={open:openPanel,status:()=>({loaded:true,tab:!!$('#tour103Tab'),plans:state.bookings.length,athletes:people().length,results:state.results.length,advanceHooked:!!advanceCareer?.advance?.__tour103}),quote:(id,personId,tier)=>{const ev=calendar().find(x=>x.id===id),p=people().find(x=>x.id===personId);return ev&&p?costs(ev,tier,false):null}};
})();