(function TennisDirectorV5(){
'use strict';
const q=s=>document.querySelector(s), KEY='tennis_dynasty_director_v5', CAREER_KEY='tennis_dynasty_v05_career';
const esc=s=>String(s??'').replace(/[&<>"']/g,x=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
const eur=n=>Math.round(n).toLocaleString('fr-FR')+' €',clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
const geo={
'Europe':{'France':['Biot','Paris','Bordeaux','Lyon','Nice','Toulouse','Montpellier'],'Espagne':['Manacor','Madrid','Barcelone'],'Italie':['Rome','Milan'],'Allemagne':['Berlin','Munich'],'Royaume-Uni':['Londres'],'Portugal':['Lisbonne','Porto'],'Suisse':['Genève'],'Serbie':['Belgrade'],'Turquie':['Antalya']},
'Afrique':{'Maroc':['Rabat','Casablanca','Marrakech'],'Tunisie':['Tunis','Monastir'],'Afrique du Sud':['Le Cap','Johannesburg'],'Égypte':['Le Caire'],'Sénégal':['Dakar'],'Nigeria':['Lagos'],'Kenya':['Nairobi']},
'Asie':{'Japon':['Tokyo','Osaka'],'Chine':['Pékin','Shanghai'],'Corée du Sud':['Séoul'],'Inde':['Mumbai','New Delhi'],'Émirats arabes unis':['Dubaï'],'Thaïlande':['Bangkok'],'Kazakhstan':['Astana'],'Singapour':['Singapour']},
'Amérique du Nord':{'États-Unis':['Miami','New York','Bradenton','Los Angeles'],'Canada':['Montréal','Toronto'],'Mexique':['Mexico','Guadalajara'],'Costa Rica':['San José']},
'Amérique du Sud':{'Brésil':['São Paulo','Rio de Janeiro'],'Argentine':['Buenos Aires'],'Chili':['Santiago'],'Colombie':['Bogotá'],'Pérou':['Lima'],'Uruguay':['Montevideo']},
'Océanie':{'Australie':['Melbourne','Sydney','Brisbane'],'Nouvelle-Zélande':['Auckland'],'Nouvelle-Calédonie':['Nouméa'],'Polynésie française':['Papeete']}
};
const jobs=[
['director','Directeur sportif','Direction',4300,'Décisions sportives et encadrement'],
['finance','Directeur financier','Direction',3600,'Budget et réduction des charges'],
['commercial','Responsable commercial','Direction',3000,'Sponsors, partenariats et revenus'],
['coach','Entraîneur principal','Sport',3800,'Préparation et progression'],
['juniorCoach','Entraîneur juniors','Sport',2600,'Formation des 12–18 ans'],
['conditioning','Préparateur physique','Sport',2750,'Prévention de la fatigue'],
['analyst','Analyste vidéo','Sport',2450,'Observation tactique'],
['scout','Recruteur international','Recrutement',2850,'Détection internationale'],
['juniorScout','Recruteur juniors','Recrutement',2250,'Détection des jeunes'],
['doctor','Médecin du sport','Santé',4700,'Suivi médical'],
['general','Médecin généraliste','Santé',3350,'Suivi sanitaire'],
['physio','Kinésithérapeute','Santé',2950,'Rééducation et récupération'],
['osteo','Ostéopathe','Santé',2700,'Prévention musculo-squelettique'],
['nutrition','Nutritionniste','Santé',2350,'Alimentation des sportifs'],
['mental','Psychologue sportif','Santé',2650,'Accompagnement mental'],
['grounds','Responsable maintenance','Intendance',2350,'Entretien des courts'],
['gardener','Jardinier','Intendance',1950,'Entretien du gazon'],
['boarding','Responsable internat','Intendance',2300,'Vie des pensionnaires'],
['education','Responsable scolaire','Intendance',2500,'Scolarité des jeunes']
];
const facilities=[
['clay','Court terre battue','Courts',22000,120],['hard','Court dur','Courts',30000,110],['grass','Court gazon','Courts',79000,430],
['covered','Court dur couvert','Courts',126000,370],['coveredClay','Terre battue couverte','Courts',142000,455],
['gym','Salle de préparation physique','Sport',48000,170],['analysis','Analyse vidéo','Sport',23500,95],
['clinic','Cabinet médical','Santé',52000,185],['recovery','Espace kinés et rééducation','Santé',35000,135],['pool','Piscine de récupération','Santé',128000,465],
['housing','Internat juniors','Campus',92000,375],['school','Salles de cours','Campus',29500,120],['canteen','Restaurant diététique','Campus',79000,310],
['store','Boutique tennis','Commercial',33000,130],['clubhouse','Club-house et accueil','Commercial',51000,180],['hotel','Hébergement visiteurs','Commercial',195000,920]
];
const FN=['Camille','Léa','Lucas','Hugo','Maya','Noah','Sara','Amir','Aya','Milan','Nina','Jules','Luca','Adam','Sofia','Oliver','Keiko','Tom','Emma','Maria','Daria','Pablo','Yuki','Moussa','Amina','Zoé','Haruto','Elena','Diego','Fatou','Arthur','Chloé','Ethan','Nora','Raphaël','Priya','Matteo','Olivia','Santiago','Léna','Andreï','Yara','Maxime','Célia'];
const LN=['Martin','Laurent','Garcia','Costa','Silva','Rossi','Ito','Lee','Keller','Dupont','Fischer','Diallo','Nguyen','Fernandez','Santos','Patel','Kim','Bennani','Petrov','Brown','Mendes','Sato','Sanchez','Williams','Nowak','Rami','Ahmed','Dupuis','Bernard','Morales','Rojas','Johnson','Dubois','Tanaka','Lopes','Nakamura','Gonzalez','Ivanov','Müller'];
const seed=t=>[...String(t)].reduce((n,c)=>((n*33+c.charCodeAt(0))>>>0),5381);
const starter=()=>({version:5,location:null,pending:false,tab:'direction',group:'Direction',buildGroup:'Courts',recruitGroup:'junior',page:0,staff:[],juniors:[],pros:[],houses:[],facilities:{clay:1},students:0,camps:0,sponsor:0,discount:0,morale:65,reputation:12,ledger:[],conversations:[],rosterSelected:null,closing:null});
let db;try{db=JSON.parse(localStorage.getItem(KEY)||'null')}catch{}
if(!db){
 db=starter();
 try{const prev=JSON.parse(localStorage.getItem('tennis_dynasty_director_v4')||'null')||JSON.parse(localStorage.getItem('tennis_dynasty_academy_v4')||'null');
 if(prev){db.location=prev.location||null;db.staff=(prev.staff||prev.wages||[]).map(s=>({id:s.id||'legacy-'+s.role,role:s.role,name:s.name,monthly:s.monthly||s.salary||0,years:s.years||1,satisfaction:65,skill:s.rating||s.skill||65,startWeek:1,expiresWeek:53}));db.facilities=prev.facilities||prev.courts||{clay:1};db.students=prev.students||prev.classes||0;db.camps=prev.camps||0;db.sponsor=prev.sponsors||0;db.reputation=prev.reputation||12;db.ledger=prev.ledger||prev.history||[];}
 }catch{}
}
for(const name of ['staff','juniors','pros','houses','ledger','conversations'])if(!Array.isArray(db[name]))db[name]=[];
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}};
const c=()=>window.__TennisDynastyCore?.getCareer?.();
let root=null,hiddenLegacy=null,modal=null,neg=null,hooked=null,bypass=false,lastRosterSig='';
function persistCareer(){
 try{window.__TennisDynastyCore?.saveCareer?.();const cr=c(),old=JSON.parse(localStorage.getItem(CAREER_KEY)||'null');
 if(cr&&old?.format===2&&old.career){old.career=cr.snapshot();localStorage.setItem(CAREER_KEY,JSON.stringify(old))}else if(cr&&old&&old.version===1)localStorage.setItem(CAREER_KEY,JSON.stringify(cr.snapshot()));}catch(e){console.warn('Sauvegarde academy',e)}
}
function log(message){db.ledger.unshift({week:c()?.week||1,year:c()?.year||1,message});db.ledger=db.ledger.slice(0,70);save()}
function notify(msg){log(msg);const msgNode=q('#td5Message');if(msgNode)msgNode.textContent=msg;render();}
function commit(){persistCareer();save();render();window.__TennisDynastyCore?.renderCareer?.();}
function weekly(){
 const income=db.students*115+db.camps*290+db.sponsor+(db.facilities.clay||0)*105+(db.facilities.hard||0)*135+(db.facilities.covered||0)*185+(db.facilities.store||0)*285+(db.facilities.canteen||0)*410+(db.facilities.hotel||0)*860;
 const wages=db.staff.reduce((n,s)=>n+s.monthly/4.33,0)+db.pros.reduce((n,p)=>n+(p.monthly||0)/4.33,0);
 const housing=db.houses.reduce((n,v)=>n+v.weekly,0);
 const upkeep=facilities.reduce((n,f)=>n+(db.facilities[f[0]]||0)*f[4],0);
 return {income,wages,housing,upkeep,net:income-wages-housing-upkeep+db.discount};
}
function syncRecruitmentStaff(){
 const current=c();
 if(!current)return;
 let market;
 try{market=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'null')}catch{return}
 if(!market||!Array.isArray(market.staff))return;
 const now=(current.year-1)*52+current.week;
 for(const contract of market.staff){
  if(!contract?.role||!contract.id||!contract.name)continue;
  const starts=Number(contract.starts??contract.startWeek??now);
  const expires=Number(contract.expires??contract.expiresWeek??(starts+52*(contract.years||2)));
  if(starts>now||expires<=now)continue;
  const person=db.staff.find(x=>x.role===contract.role);
  if(person){
   if(!Number.isFinite(Number(person.expiresWeek)))person.expiresWeek=expires;
   if(!Number.isFinite(Number(person.startWeek)))person.startWeek=starts;
   continue;
  }
  db.staff.push({...contract,kind:'staff',
   monthly:Number(contract.monthly??contract.salary??0),
   ask:Number(contract.baseSalary??contract.salary??contract.monthly??0),
   rating:Number(contract.rating??contract.level??65),
   skill:Number(contract.rating??contract.level??65),
   satisfaction:Number(contract.satisfaction??65),
   startWeek:starts,expiresWeek:expires});
 }
}
function sync(){
 const cr=c();if(!cr)return;
 syncRecruitmentStaff();
 if(db.pending&&db.location){cr.funds=280000;db.pending=false;log('Académie fondée à '+db.location.city+' · dotation '+eur(280000));persistCareer();}
 if(cr!==hooked){
  hooked=cr;
  const original=cr.advance.bind(cr);
  cr.advance=function(w){
   const ret=original(w),n=w||1,f=weekly(),net=Math.round(f.net*n);cr.funds+=net;
   db.staff.forEach(s=>{s.satisfaction=clamp(s.satisfaction+(net<0?-2:1)+(s.monthly<s.ask*.9?-2:0),5,100);});
   db.juniors.forEach(j=>{j.satisfaction=clamp(j.satisfaction+(j.housing==='apartment'?1:0)+(net<0?-1:1),10,100);});
   if((cr.week||1)===1){db.staff=db.staff.filter(s=>s.expiresWeek>(cr.year-1)*52+cr.week);}
   log('Exploitation · '+n+' sem. · '+(net>=0?'+':'')+eur(net));
   persistCareer();
   return ret;
  };
 }
}
function overlay(title,content,act){
 modal?.remove();modal=document.createElement('div');modal.className='td5-overlay';
 modal.innerHTML='<div class="td5-modal" role="dialog" aria-modal="true" aria-labelledby="td5ModalTitle"><div class="td5-overline">TENNIS DYNASTY · DIRECTION</div><h2 id="td5ModalTitle">'+esc(title)+'</h2>'+content+'</div>';document.body.append(modal);
 modal.addEventListener('click',e=>{const b=e.target.closest('[data-modal]');if(b)act(b.dataset.modal,b)});
 modal.addEventListener('keydown',e=>{if(e.key==='Escape'){modal.remove();modal=null}});
}
function close(){modal?.remove();modal=null;neg=null}
function beginAcademy(after){
 overlay('Où implanter ton académie ?','<p>Choisis ton continent, ton pays et ta ville. Tu peux également saisir n’importe quel autre lieu.</p><div class="td5-form"><label>Continent<select id="td5Cont">'+Object.keys(geo).map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>Pays<select id="td5Country"></select></label><label>Ville<select id="td5City"></select></label><label>Autre pays ou ville<input id="td5Other" placeholder="Autre pays / autre ville"></label><label class="wide">Nom de l’académie<input id="td5Name" maxlength="42" value="'+esc(db.location?.name||'Tennis Dynasty Academy')+'"></label><label>Cadre de vie<select id="td5Site"><option>Campagne</option><option>Périurbain</option><option>Centre-ville</option><option>Bord de mer</option></select></label></div><div class="td5-grant"><small>Budget de départ (simulation)</small><b>280 000 €</b><span>Personnel et constructions financés ensuite sur la trésorerie.</span></div><p id="td5Error" role="status"></p><div class="td5-actions"><button data-modal="cancel" class="ghost">Annuler</button><button data-modal="create">Confirmer l’implantation →</button></div>',act=>{
  if(act==='cancel'){close();return}if(act!=='create')return;
  const cont=q('#td5Cont').value,pick=q('#td5Country').value,city=q('#td5City').value,other=q('#td5Other').value.trim(),name=q('#td5Name').value.trim();
  const ctry=pick==='Autre pays'?other:pick,town=city==='Autre ville'?other:city;
  if(name.length<3||!ctry||!town){q('#td5Error').textContent='Complète le lieu et le nom du centre.';return}
  db.location={continent:cont,country:ctry,city:town,site:q('#td5Site').value,name};db.pending=!c();save();
  if(q('#careerName'))q('#careerName').value=name.slice(0,24);
  close();
  if(!c()){bypass=true;q('#startCareer')?.click();bypass=false;setTimeout(()=>{sync();document.querySelector('[data-td-nav="academy"]')?.click();render()},150);}
  else {log('Implantation confirmée : '+town+' ('+ctry+')');commit();}
 });
 const cities=()=>{const cont=q('#td5Cont').value,country=q('#td5Country').value;q('#td5City').innerHTML=(geo[cont]?.[country]||[]).map(x=>'<option>'+esc(x)+'</option>').join('')+'<option>Autre ville</option>'};
 const countries=()=>{q('#td5Country').innerHTML=Object.keys(geo[q('#td5Cont').value]).map(x=>'<option>'+esc(x)+'</option>').join('')+'<option>Autre pays</option>';cities()};
 q('#td5Cont').onchange=countries;q('#td5Country').onchange=cities;countries();
}
function staffPool(role){
 const job=jobs.find(x=>x[0]===role);if(!job)return [];
 const h=seed(role+(db.location?.country||'France')+(c()?.year||1));
 return Array.from({length:12},(_,i)=>{
  const rating=53+((i*13+h)%44),ask=Math.round(job[3]*(.74+rating/270)/50)*50;
  return {id:role+'-'+i,kind:'staff',role,name:FN[(h+i*13)%FN.length]+' '+LN[(h+i*19)%LN.length],age:27+(i*3)%30,rating,ask,monthly:ask,bonusAsk:Math.ceil(ask*.35/100)*100,yearsAsk:i%3+2,
    housing:i%9===0?'apartment':'none',temperament:i%3,attitude:51+(i*7)%25};
 });
}
function playerPool(){
 const h=seed((db.location?.country||'France')+'|'+(c()?.year||1)+'|'+(c()?.week||1));
 return Array.from({length:32},(_,i)=>{
  const age=i<20?13+i%5:18+(i%9),rating=43+((i*11+h)%45);
  return {id:'prospect-'+(c()?.year||1)+'-'+i,kind:'player',name:FN[(i*7+h)%FN.length]+' '+LN[(i*11+h)%LN.length],age,gender:i%2?'H':'F',rating,potential:clamp(rating+9+(i%5)*3,50,97),
    ask:age<18?400+(i%4)*180:Math.round((1200+rating*35)/50)*50,monthly:age<18?400+(i%4)*180:Math.round((1200+rating*35)/50)*50,
    fee:age<18?450+rating*12:2700+rating*65,bonusAsk:age<18?400:1200+(i%4)*400,yearsAsk:age<18?2:2+(i%3),housing:age<18?(i%3===0?'apartment':'boarding'):(i%6===0?'apartment':'none'),temperament:i%3,attitude:46+(i*9)%27};
 });
}
function findCandidate(id){return jobs.flatMap(x=>staffPool(x[0])).find(x=>x.id===id)||playerPool().find(x=>x.id===id)}
function satisfaction(n,proposal){
 let score=n.attitude+((proposal.monthly/n.ask)-1)*95+(proposal.bonus-n.bonusAsk)/Math.max(500,n.ask)*14-Math.abs(proposal.years-n.yearsAsk)*6;
 if(n.housing==='apartment'&&proposal.housing!=='apartment')score-=33;
 else if(n.housing==='apartment'&&proposal.housing==='apartment')score+=14;
 if(n.housing==='boarding'&&proposal.housing==='none')score-=24;
 if(n.housing==='boarding'&&proposal.housing!=='none')score+=12;
 if(n.kind==='player'&&n.age<18&&proposal.housing==='apartment')score+=7;
 if(proposal.monthly<n.ask*.8)score-=18;
 score+=(db.reputation||12)/8;
 return Math.round(clamp(score,0,100));
}
function contractView(person,{renew=false}={}){
 const existing=renew?db.staff.find(x=>x.id===person.id||x.role===person.role):null;
 neg={candidate:person,existing,turn:0,status:'draft',lastOffer:null,threshold:person.kind==='player'&&person.age<18?78:70};
 const minor=person.kind==='player'&&person.age<18;
 const who=person.kind==='staff'?'Le candidat et son représentant':minor?'Les parents / responsables légaux'+(person.agent?' et l’agence':''):'Le joueur majeur et son agence';
 const monthlyLabel=minor?'Bourse et prise en charge mensuelle (€)':'Salaire mensuel proposé (€)';
 const options='<option value="none">Aucun logement</option><option value="boarding">Place en internat (juniors)</option><option value="apartment">Appartement proche (+750 €/mois, dépôt 1 500 €)</option>';
 overlay((renew?'Renégocier':'Négocier')+' · '+person.name,
  '<div class="td5-counterpart"><div><small>Interlocuteur</small><b>'+esc(who)+'</b></div><div><small>Compétence / potentiel</small><b>'+person.rating+'/100</b></div></div>'+
  '<div class="td5-satisfaction"><div><strong>Satisfaction de la négociation</strong><b id="td5ScoreText">—</b></div><div class="td5-meter"><i id="td5Meter"></i></div><p id="td5Mood">Adapte ta proposition et observe les réactions.</p></div>'+
  '<div class="td5-request"><strong>Demandes de départ</strong><p>Rémunération attendue : '+eur(person.ask)+'/mois · prime souhaitée '+eur(person.bonusAsk)+' · durée '+person.yearsAsk+' ans.'+
  (person.housing==='apartment'?' Demande prioritaire : **un appartement à proximité**.':person.housing==='boarding'?' Demande familiale : **internat encadré**.':'')+'</p></div>'+
  '<div class="td5-form">'+
  '<label>'+monthlyLabel+'<input id="td5Wage" type="number" step="50" min="0" max="160000" value="'+Math.round((existing?.monthly||person.ask)*.89/50)*50+'"></label>'+
  '<label>Durée de contrat<select id="td5Years">'+[1,2,3,4,5].map(n=>'<option value="'+n+'"'+(n===person.yearsAsk?' selected':'')+'>'+n+' an'+(n>1?'s':'')+'</option>').join('')+'</select></label>'+
  '<label>Prime de signature (€)<input id="td5Bonus" type="number" min="0" max="900000" step="100" value="'+Math.max(0,person.bonusAsk-400)+'"></label>'+
  '<label>Prise en charge du logement<select id="td5Housing">'+options+'</select></label></div>'+
  '<div class="td5-offer-estimate"><span>Coût de départ : <b id="td5StartCost"></b></span><span>Charge annuelle estimée : <b id="td5YearCost"></b></span></div>'+
  '<div class="td5-dialogue" id="td5Dialogue" role="status">À toi de faire la première proposition.</div>'+
  '<div class="td5-actions"><button class="ghost" data-modal="cancel">Abandonner</button><button data-modal="counter" id="td5AcceptCounter" hidden>Reprendre la contre-proposition</button><button data-modal="submit" id="td5Submit">Envoyer mon offre</button><button data-modal="sign" id="td5Sign" hidden>Signer le contrat</button></div>',
  act=>{
   if(act==='cancel'){close();return}
   if(act==='counter'){const m=neg.lastOffer;if(!m)return;q('#td5Wage').value=m.monthly;q('#td5Bonus').value=m.bonus;q('#td5Years').value=m.years;q('#td5Housing').value=m.housing;neg.status='draft';q('#td5AcceptCounter').hidden=true;drawOffer();return}
   if(act==='submit'){sendOffer();return}
   if(act==='sign'){signDeal();}
  });
 q('#td5Housing').value=person.housing==='boarding'?'boarding':'none';
 modal.addEventListener('input',drawOffer);modal.addEventListener('change',drawOffer);drawOffer();
}
function proposal(){return {monthly:Number(q('#td5Wage')?.value),bonus:Number(q('#td5Bonus')?.value),years:Number(q('#td5Years')?.value),housing:q('#td5Housing')?.value||'none'}}
function costs(p,person){const extra=p.housing==='apartment'?1500:0;return {start:p.bonus+extra+(person.kind==='player'?(person.fee||0):0),annual:12*(p.monthly+(p.housing==='apartment'?750:0)+(p.housing==='boarding'?110:0))}}
function validOffer(p){return Number.isFinite(p.monthly)&&p.monthly>=0&&p.monthly<=160000&&Number.isFinite(p.bonus)&&p.bonus>=0&&p.bonus<=900000&&Number.isInteger(p.years)&&p.years>=1&&p.years<=5}
function drawOffer(){
 if(!neg)return;
 const p=proposal(),score=validOffer(p)?satisfaction(neg.candidate,p):0;
 q('#td5ScoreText').textContent=score+' / 100';
 const meter=q('#td5Meter');meter.style.width=score+'%';meter.style.background=score>=neg.threshold?'#0F8F6B':score>=48?'#F28C28':'#D86E69';
 q('#td5Mood').textContent=score>=neg.threshold?'La proposition correspond aux attentes.':score>=48?'Des points restent à négocier.':'Ton interlocuteur juge l’offre insuffisante.';
 const spend=costs(p,neg.candidate);q('#td5StartCost').textContent=eur(spend.start);q('#td5YearCost').textContent=eur(spend.annual);
 if(neg.status==='agreed'){neg.status='draft';q('#td5Sign').hidden=true;q('#td5Submit').hidden=false;q('#td5Dialogue').textContent='Offre modifiée : elle doit de nouveau être soumise.'}
}
function sendOffer(){
 const p=proposal(),n=neg.candidate;if(!validOffer(p)){q('#td5Dialogue').textContent='Vérifie les montants, les années et les primes.';return}
 const score=satisfaction(n,p);neg.turn++;
 const req=neg.threshold;
 if(score>=req){
  neg.status='agreed';neg.lastOffer={...p};
  q('#td5Dialogue').textContent=(n.age<18?'Les parents':'Le représentant')+' acceptent cette proposition de principe. Vérifie les coûts puis signe si tu le souhaites.';
  q('#td5Sign').hidden=false;q('#td5Submit').hidden=true;q('#td5AcceptCounter').hidden=true;return;
 }
 if(neg.turn>=4){q('#td5Dialogue').textContent='Négociation rompue après quatre offres : le candidat se retire. Aucun coût engagé.';q('#td5Submit').disabled=true;return}
 let goal={monthly:Math.ceil(n.ask*(n.housing==='apartment'&&p.housing==='none'?1.07:.99)/50)*50,
 bonus:Math.max(n.bonusAsk,p.bonus),years:n.yearsAsk,housing:n.housing==='none'?'none':n.housing};
 neg.lastOffer=goal;
 q('#td5Dialogue').textContent=(n.age<18?'La famille':'Le candidat')+' fait une contre-proposition (tour '+neg.turn+'/4) : '+eur(goal.monthly)+'/mois, prime '+eur(goal.bonus)+', durée '+goal.years+' an(s)'+(goal.housing!=='none'?', logement demandé':'')+'. Tu peux l’adopter ou négocier autrement.';
 q('#td5AcceptCounter').hidden=false;
}
function signDeal(){
 if(!neg||neg.status!=='agreed')return;
 const cr=c(),n=neg.candidate,p=neg.lastOffer,spend=costs(p,n);
 if(!cr||cr.funds<spend.start){q('#td5Dialogue').textContent='Fonds disponibles insuffisants pour la prime, les frais et le dépôt de logement : '+eur(spend.start)+'.';return}
 if(n.kind==='staff'&&!neg.existing&&db.staff.some(x=>x.role===n.role)){q('#td5Dialogue').textContent='Ce poste est déjà pourvu.';return}
 if(n.kind==='player'&&n.age<18&&cr.academyV2.prospects.length>=Math.min(5,cr.courts*2,cr.staffLevel+1)){q('#td5Dialogue').textContent='Capacité juniors saturée. Développe terrains ou staff.';return}
 if(n.kind==='player'&&n.age>=18&&(db.pros.length>=10)){q('#td5Dialogue').textContent='Effectif senior complet : dix nouveaux contrats maximum.';return}
 if(n.kind==='player'&&db.juniors.concat(db.pros).some(x=>x.id===n.id)){q('#td5Dialogue').textContent='Joueur déjà sous contrat.';return}
 cr.funds-=spend.start;
 const elapsed=(cr.year-1)*52+cr.week;
 const contract={id:n.id,role:n.role||'athlete',name:n.name,monthly:p.monthly,years:p.years,bonus:p.bonus,housing:p.housing,
 rating:n.rating,ask:n.ask,satisfaction:satisfaction(n,p),startWeek:elapsed,expiresWeek:elapsed+p.years*52,age:n.age||null,fee:n.fee||0};
 if(n.kind==='staff'){
  if(neg.existing)db.staff=db.staff.filter(x=>x!==neg.existing);
  db.staff.push(contract);
 }else if(n.age<18){
  const junior={...contract,skill:n.rating,potential:n.potential,gender:n.gender};
  db.juniors.push(junior);
  cr.academyV2.prospects.push({id:n.id,name:n.name,age:n.age,skill:n.rating,potential:n.potential,style:'Polyvalent',fee:n.fee,weeks:0});
  db.students++;
 }else{
  db.pros.push({...contract,gender:n.gender,potential:n.potential});
  if(Array.isArray(cr.roster)&&cr.roster.length<12)cr.roster.push({id:n.id,name:n.name,age:n.age,style:'complet',points:0,fatigue:8,
    ratings:Object.fromEntries(Object.keys(cr.playerRatings).map(k=>[k,n.rating])),potential:n.potential,wins:0,losses:0});
 }
 if(p.housing==='apartment')db.houses.push({id:n.id,weekly:750/4.33});
 if(p.housing==='boarding')db.houses.push({id:n.id,weekly:110/4.33});
 log('Contrat signé avec '+n.name+' : '+eur(p.monthly)+'/mois · '+p.years+' an(s) · prime '+eur(p.bonus)+(p.housing!=='none'?' · logement '+p.housing:''));
 close();commit();
}
function meeting(role,choice){
 const s=db.staff.find(x=>x.role===role),cr=c();if(!s||!cr)return;
 const week=(cr.year-1)*52+cr.week;if(s.lastMeeting===week){notify('Tu as déjà travaillé avec '+s.name+' cette semaine.');return}
 const costs={sport:400,scout:450,medical:250,finance:180,commercial:300,wellbeing:100};
 const cost=costs[choice]??100;if(cr.funds<cost){notify('Trésorerie insuffisante : '+eur(cost));return}
 cr.funds-=cost;s.lastMeeting=week;
 if(choice==='sport'){
  const abilities=Object.keys(cr.playerRatings);const ability=abilities[(week+s.rating)%abilities.length];
  cr.playerRatings[ability]=clamp(cr.playerRatings[ability]+.35+s.rating/250,15,cr.potential);cr.fatigue=clamp(cr.fatigue+4,0,100);
  log('Séance ciblée avec '+s.name+' : aptitude '+ability+' améliorée.');
 }else if(choice==='scout'){db.reputation=clamp(db.reputation+2+s.rating/35,0,100);log('Mission de détection confiée à '+s.name+' : réputation +3.');}
 else if(choice==='medical'){cr.fatigue=clamp(cr.fatigue-(8+Math.round(s.rating/9)),0,100);log('Protocole médical de '+s.name+' : fatigue réduite.');}
 else if(choice==='finance'){db.discount+=25+Math.round(s.rating/10);log('Audit de '+s.name+' : économie récurrente '+eur(25+Math.round(s.rating/10))+'/semaine.');}
 else if(choice==='commercial'){db.sponsor+=85+Math.round(s.rating/5);log('Partenariat commercial de '+s.name+' : recette supplémentaire.');}
 else {db.morale=clamp(db.morale+4,0,100);s.satisfaction=clamp(s.satisfaction+6,0,100);log('Réunion avec '+s.name+' : confiance et cohésion renforcées.')}
 commit();
}
function staffOptions(role){
 const s=db.staff.find(x=>x.role===role);if(!s)return;
 const actions=[
 ['sport','Plan d’entraînement ciblé',jobs.find(x=>x[0]===role)?.[2]==='Sport'],
 ['scout','Mission de repérage',jobs.find(x=>x[0]===role)?.[2]==='Recrutement'],
 ['medical','Programme de récupération',jobs.find(x=>x[0]===role)?.[2]==='Santé'],
 ['finance','Audit des charges',role==='finance'],
 ['commercial','Rechercher un sponsor',role==='commercial'],
 ['wellbeing','Entretien individuel',true]
 ].filter(x=>x[2]);
 overlay('Entretien avec '+s.name,'<p>'+esc(jobs.find(x=>x[0]===role)?.[1]||'Personnel')+' · '+eur(s.monthly)+'/mois · satisfaction '+Math.round(s.satisfaction)+'/100.</p><div class="td5-action-list">'+actions.map(x=>'<button data-modal="'+x[0]+'">'+x[1]+' →</button>').join('')+'</div><div class="td5-actions"><button class="ghost" data-modal="cancel">Fermer</button><button data-modal="renew">Renégocier le contrat</button><button data-modal="dismiss">Résilier (indemnité '+eur(s.monthly*2)+')</button></div><p id="td5Error"></p>',act=>{
  if(act==='cancel'){close();return}
  if(act==='renew'){close();const candidate=staffPool(role).find(x=>x.id===s.id)||{...s,kind:'staff',ask:s.ask||s.monthly,bonusAsk:s.monthly*.25,yearsAsk:2,housing:s.housing||'none',attitude:s.satisfaction||55};contractView(candidate,{renew:true});return}
  if(act==='dismiss'){const fee=s.monthly*2;if(c().funds<fee){q('#td5Error').textContent='Fonds insuffisants pour la rupture.';return}c().funds-=fee;db.staff=db.staff.filter(x=>x!==s);db.houses=db.houses.filter(h=>h.id!==s.id);
   try{const ext=JSON.parse(localStorage.getItem('tennis_academy_recruit_v10')||'null');if(ext&&Array.isArray(ext.staff)){ext.staff=ext.staff.filter(x=>x.role!==role);localStorage.setItem('tennis_academy_recruit_v10',JSON.stringify(ext))}}catch(e){console.warn('Synchronisation résiliation',e)}
   log('Rupture du contrat de '+s.name+' · indemnité '+eur(fee));close();commit();return}
  close();meeting(role,act);
 });
}
function candidates(){
 const role=db.openRole;return role?staffPool(role):[];
}
function render(){
 if(!root)return;
 const cr=c(),tab=db.tab;
 const tabs=[['direction','Direction'],['staff','Personnel'],['facilities','Installations'],['scout','Recrutement'],['finance','Finances'],['health','Santé'],['tour','Compétitions']];
 const f=weekly();
 const kpi=(t,v,d='')=>'<div class="td5-kpi"><small>'+t+'</small><b>'+v+'</b><span>'+d+'</span></div>';
 const card=(title,body,cta)=>'<article class="td5-card"><div>'+title+'</div>'+body+'<div class="td5-card-footer">'+cta+'</div></article>';
 root.innerHTML='<div class="td5-hero"><div class="td5-hero-copy"><div class="td5-overline">JLG CREATIVE · ACADEMY MANAGER V5</div><h1>'+esc(db.location?.name||cr?.academyName||'Ton académie mondiale')+'</h1><p>'+esc([db.location?.city,db.location?.country,db.location?.continent].filter(Boolean).join(' · ')||'Choisis ton implantation, puis bâtis ton centre de tennis')+'</p></div><div class="td5-hero-budget"><span>TRÉSORERIE</span><strong>'+eur(cr?.funds||0)+'</strong><button data-action="location">Implantation <span>↗</span></button></div></div>'+
 '<nav class="td5-tabs" aria-label="Gestion des activités">'+tabs.map(t=>'<button data-tab="'+t[0]+'" aria-current="'+(tab===t[0]?'page':'false')+'">'+t[1]+'</button>').join('')+'</nav><div class="td5-page" id="td5Page"></div><p id="td5Message" role="status"></p>';
 const host=q('#td5Page');
 if(!cr){host.innerHTML='<div class="td5-zero"><h2>Une académie à construire. Des champions à former.</h2><p>Commence par choisir continent, pays et ville. Tu disposeras ensuite d’un budget de lancement de 280 000 € pour engager ton personnel, développer les infrastructures et recruter.</p><button data-action="location">Choisir le lieu de mon académie →</button></div>';return}
 const group=jobs.filter(x=>x[2]===db.group),buildGroup=facilities.filter(x=>x[2]===db.buildGroup);
 if(tab==='direction'){
 host.innerHTML='<div class="td5-kpis">'+kpi('Trésorerie',eur(cr.funds),'budget disponible')+kpi('Joueurs & juniors',(cr.roster?.length||1)+db.juniors.length+db.pros.length,'sportifs formés')+kpi('Personnel',db.staff.length,'spécialistes recrutés')+kpi('Exploitation hebdo.',(f.net>=0?'+':'')+eur(f.net),'prévision avant moteur')+'</div>'+
 '<div class="td5-grid2"><section class="td5-panel"><div class="td5-heading"><h2>Décisions de direction</h2><small>Choisis une priorité</small></div><div class="td5-action-list">'+tabs.slice(1).map(t=>'<button data-tab="'+t[0]+'">'+t[1]+' <span>→</span></button>').join('')+'</div></section>'+
 '<section class="td5-panel"><div class="td5-heading"><h2>Vie du centre</h2><small>Semaine '+cr.week+' · Année '+cr.year+'</small></div>'+
 '<div class="td5-datarow"><span>Localisation</span><b>'+esc(db.location?.city||'À définir')+'</b></div><div class="td5-datarow"><span>Nombre de courts</span><b>'+(['clay','hard','grass','covered','coveredClay'].reduce((a,k)=>a+(db.facilities[k]||0),0))+'</b></div>'+
 '<div class="td5-datarow"><span>Réputation</span><b>'+Math.round(db.reputation)+'/100</b></div><div class="td5-datarow"><span>Cohésion du staff</span><b>'+db.morale+'/100</b></div>'+
 '<div class="td5-datarow"><span>Contrats actifs</span><b>'+ (db.staff.length+db.juniors.length+db.pros.length)+'</b></div></section></div>';
 }else if(tab==='staff'){
 const categories=[...new Set(jobs.map(x=>x[2]))];
 host.innerHTML='<section class="td5-panel"><div class="td5-heading"><h2>Personnel & contrats</h2><small>'+db.staff.length+' poste(s) pourvu(s) · recrutement actif</small></div><div class="td5-subtabs">'+categories.map(g=>'<button data-group="'+g+'" class="'+(db.group===g?'active':'')+'">'+g+'</button>').join('')+'</div><div class="td5-cards">'+group.map(x=>{
 const hired=db.staff.find(s=>s.role===x[0]);return card('<small>'+esc(x[4])+'</small><strong>'+x[1]+'</strong>',hired?'<p>'+esc(hired.name)+' · niveau '+hired.rating+'/100</p><div class="td5-inline-meter"><i style="width:'+hired.satisfaction+'%"></i></div><p>'+eur(hired.monthly)+'/mois · '+hired.years+' an(s)</p>':'<p>Poste vacant · référence '+eur(x[3])+'/mois</p>',hired?'<button data-meet="'+x[0]+'">Entretiens et contrat →</button>':'<button data-job="'+x[0]+'">Voir les candidats →</button>');}).join('')+'</div><div id="td5Candidates"></div></section>';
 if(db.openRole&&jobs.find(x=>x[0]===db.openRole)?.[2]===db.group)renderCandidates();
 }else if(tab==='facilities'){
 const categories=[...new Set(facilities.map(x=>x[2]))];
 host.innerHTML='<section class="td5-panel"><div class="td5-heading"><h2>Infrastructures & travaux</h2><small>Coûts d’installation et entretien</small></div><div class="td5-subtabs">'+categories.map(g=>'<button data-buildgroup="'+g+'" class="'+(db.buildGroup===g?'active':'')+'">'+g+'</button>').join('')+'</div><div class="td5-cards">'+buildGroup.map(x=>card('<small>'+x[2]+' · '+(db.facilities[x[0]]||0)+' installé(s)</small><strong>'+x[1]+'</strong>','<p>Travaux '+eur(x[3])+' · '+eur(x[4])+'/semaine d’entretien</p>','<button data-build="'+x[0]+'" '+(cr.funds<x[3]?'disabled':'')+'>Construire →</button>')).join('')+'</div></section>';
 }else if(tab==='scout'){
 const list=playerPool().filter(x=>db.recruitGroup==='junior'?x.age<18:x.age>=18);
 const start=db.page*6,shown=list.slice(start,start+6);
 host.innerHTML='<section class="td5-panel"><div class="td5-heading"><h2>Marché mondial des joueurs</h2><small>Contrats et représentants familiaux</small></div><div class="td5-subtabs"><button data-age="junior" class="'+(db.recruitGroup==='junior'?'active':'')+'">Juniors / familles</button><button data-age="pro" class="'+(db.recruitGroup==='pro'?'active':'')+'">Seniors / agences</button></div>'+
 '<div class="td5-cards">'+shown.map(p=>card('<small>'+p.age+' ans · '+(p.gender==='F'?'Filles':'Garçons')+'</small><strong>'+esc(p.name)+'</strong>','<p>Évaluation '+p.rating+'/100 · potentiel '+p.potential+'/100<br>Frais d’intégration '+eur(p.fee)+(p.housing==='apartment'?'<br>Famille : logement souhaité':'')+'</p>','<button data-player="'+p.id+'">Ouvrir la négociation →</button>')).join('')+'</div>'+
 '<div class="td5-pager"><button data-page="previous" '+(db.page<=0?'disabled':'')+'>← Précédents</button><span>Page '+(db.page+1)+' / '+Math.ceil(list.length/6)+'</span><button data-page="next" '+(db.page+1>=Math.ceil(list.length/6)?'disabled':'')+'>Suivants →</button></div></section>';
 }else if(tab==='finance'){
 host.innerHTML='<div class="td5-kpis">'+kpi('Recettes / sem.',eur(f.income),'activités du centre')+kpi('Salaires / sem.',eur(f.wages),'staff et professionnels')+kpi('Entretien & logements',eur(f.upkeep+f.housing),'charges hebdomadaires')+kpi('Résultat / sem.',eur(f.net),'hors coûts du moteur sportif')+'</div>'+
 '<div class="td5-grid2"><section class="td5-panel"><h2>Développement commercial</h2><div class="td5-action-list"><button data-business="camp">Organiser un stage <span>1 800 € · +290 €/sem.</span></button><button data-business="student">Signer une inscription <span>600 € · +115 €/sem.</span></button><button data-business="sponsor">Négocier un sponsor <span>commercial requis · +250 €/sem.</span></button></div><p>Investissement nécessaire : tu ne peux pas générer de revenus sans trésorerie ou personnel adapté.</p></section>'+
 '<section class="td5-panel"><h2>Journal des décisions</h2><div class="td5-logs">'+db.ledger.slice(0,10).map(x=>'<div><small>A'+x.year+' · S'+x.week+'</small><span>'+esc(x.message)+'</span></div>').join('')+'</div></section></div>';
 }else if(tab==='health'){
 host.innerHTML='<div class="td5-grid2"><section class="td5-panel"><h2>Équipe médicale</h2>'+jobs.filter(x=>x[2]==='Santé').map(x=>'<div class="td5-datarow"><span>'+x[1]+'</span><b>'+ (db.staff.some(s=>s.role===x[0])?'Pourvu':'Vacant')+'</b></div>').join('')+'<button data-tab="staff">Gérer le personnel médical →</button></section>'+
 '<section class="td5-panel"><h2>Récupération & prévention</h2><p>Fatigue du joueur aligné : <strong>'+Math.round(cr.fatigue)+' %</strong></p><p>Cabinet médical : '+(db.facilities.clinic||0)+' · Espace kiné : '+(db.facilities.recovery||0)+'</p><button data-medical="rehab">Programme de récupération · 400 €</button></section></div>';
 }else if(tab==='tour'){
 host.innerHTML='<div class="td5-grid2"><section class="td5-panel"><h2>Compétitions de l’académie</h2><p>Calendrier réellement jouable : circuit fictif intégré au moteur, avec inscription du joueur sélectionné.</p><button data-tournament="open">Calendrier et inscriptions →</button><h3>Références internationales</h3><p>ATP / WTA · ATP Challenger · ITF juniors J30 à J500 · Grand Chelem. Ces catégories ne sont pas toutes simulées actuellement.</p></section>'+
 '<section class="td5-panel"><h2>Doubles hommes, femmes et mixtes</h2><p>La participation en double est prévue pour les futurs tournois. Les matchs 2D en double nécessitent un moteur à quatre joueurs, encore à développer.</p><div class="td5-datarow"><span>Exhibitions 2D</span><b>Simple disponible</b></div><div class="td5-datarow"><span>Doubles 2D</span><b>En développement</b></div></section></div>';
 }
}
function renderCandidates(){
 const holder=q('#td5Candidates');if(!holder)return;
 holder.innerHTML='<div class="td5-heading"><h3>Profils disponibles · '+esc(jobs.find(x=>x[0]===db.openRole)?.[1]||'')+'</h3><small>12 profils, attentes et compétences différentes</small></div><div class="td5-cards">'+staffPool(db.openRole).map(p=>card('<small>Niveau '+p.rating+'/100</small><strong>'+esc(p.name)+'</strong>','<p>Prétentions : '+eur(p.ask)+'/mois<br>Contrat souhaité : '+p.yearsAsk+' ans'+(p.housing==='apartment'?'<br>Demande un logement':'')+'</p>','<button data-candidate="'+p.id+'">Négocier →</button>')).join('')+'</div>';
}
function init(){
 if(root)return;
 const view=q('#tdAcademyView');if(!view||!window.__TennisDynastyCore)return;
 hiddenLegacy=document.createElement('div');hiddenLegacy.id='td5Legacy';hiddenLegacy.hidden=true;hiddenLegacy.style.display='none';
 Array.from(view.children).forEach(child=>hiddenLegacy.append(child));
 root=document.createElement('section');root.id='td5Director';view.append(root,hiddenLegacy);
 // Keep original engine DOM alive; remove duplicate visible UI and tabs.
 document.addEventListener('click',e=>{
  const btn=e.target.closest('[data-td21-go="newgame"],#startCareer');
  if(btn&&!bypass&&!c()&&!db.location){e.preventDefault();e.stopImmediatePropagation();beginAcademy(btn);}
 },true);
 root.addEventListener('click',e=>{
  syncRecruitmentStaff();
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.tab){db.tab=b.dataset.tab;if(db.tab==='staff')db.openRole=null;save();render();return}
  if(b.dataset.action==='location'){beginAcademy(null);return}
  const cr=c();if(!cr){notify('Fonde d’abord ton académie.');return}
  if(b.dataset.group){db.group=b.dataset.group;db.openRole=null;save();render();return}
  if(b.dataset.buildgroup){db.buildGroup=b.dataset.buildgroup;save();render();return}
  if(b.dataset.age){db.recruitGroup=b.dataset.age;db.page=0;save();render();return}
  if(b.dataset.page){db.page=clamp(db.page+(b.dataset.page==='next'?1:-1),0,4);save();render();return}
  if(b.dataset.job){db.openRole=b.dataset.job;save();renderCandidates();return}
  if(b.dataset.candidate){const p=findCandidate(b.dataset.candidate);if(p)contractView(p);return}
  if(b.dataset.player){const p=findCandidate(b.dataset.player);if(p)contractView(p);return}
  if(b.dataset.meet){staffOptions(b.dataset.meet);return}
  if(b.dataset.build){const item=facilities.find(x=>x[0]===b.dataset.build);if(!item)return;
   if(cr.funds<item[3]){notify('Budget insuffisant pour '+item[1]);return}
   cr.funds-=item[3];db.facilities[item[0]]=(db.facilities[item[0]]||0)+1;
   if(['clay','hard','grass','covered','coveredClay'].includes(item[0]))cr.courts=Math.min(4,cr.courts+1);
   log('Construction : '+item[1]+' · '+eur(item[3]));commit();return;
  }
  if(b.dataset.business){
   const typ=b.dataset.business,cost=typ==='camp'?1800:typ==='student'?600:900;
   if(typ==='sponsor'&&!db.staff.some(s=>s.role==='commercial')){notify('Il te faut un responsable commercial pour négocier ce contrat.');return}
   if(cr.funds<cost){notify('Trésorerie insuffisante : '+eur(cost));return}
   cr.funds-=cost;if(typ==='camp')db.camps++;else if(typ==='student')db.students++;else db.sponsor+=250;
   log('Nouvelle activité '+typ+' : investissement '+eur(cost));commit();return;
  }
  if(b.dataset.medical){if(cr.funds<400){notify('Budget insuffisant pour les soins.');return}cr.funds-=400;
   cr.fatigue=clamp(cr.fatigue-(db.staff.some(s=>s.role==='physio')?23:12),0,100);log('Programme de récupération : fatigue réduite.');commit();return;
  }
  if(b.dataset.tournament){document.querySelector('[data-td-nav="competition"]')?.click();return}
 });
 // Restore prior manager UI home label / ensure the new academy is selected after founding.
 const title=q('#tdHome .td21-start h1');if(title)title.textContent='Dirige une académie. Forme des champions.';
 const subtitle=q('#tdHome .td21-kicker');if(subtitle)subtitle.textContent='Une académie mondiale à développer : entraîneurs, joueurs, finances, infrastructures et compétitions.';
 q('#tdHome [data-td21-go="newgame"] b')?.replaceChildren(document.createTextNode('Fonder mon académie'));
 new MutationObserver(()=>{if(document.body.dataset.tdScreen==='academy'){sync();render()}}).observe(document.body,{attributes:true,attributeFilter:['data-td-screen']});
 window.addEventListener('pagehide',save);
 function save(){syncRecruitmentStaff();persistCareer();saveState()}
 function saveState(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch{}}
 setInterval(()=>{sync()},1800);
 sync();render();
}
init();
})();