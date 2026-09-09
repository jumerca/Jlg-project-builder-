
/* JLG Project Lab 360 — V5 enhancement layer */
const V5_VERSION='5.0.0';
const V5_VARIANTS={
  balanced:{label:'Équilibrée',note:'Répartition de référence : équilibre entre expérience, exploitation, sécurité et surfaces support.'},
  compact:{label:'Compacte',note:'Réduit les surfaces support et la circulation pour limiter l’emprise et le CAPEX. À challenger sur confort, PMR et sécurité.'},
  experience:{label:'Expérience',note:'Donne plus de place aux zones visibles par le public et au parcours client. Meilleure expérience, mais investissement souvent plus élevé.'},
  safety:{label:'Sécurité',note:'Renforce circulation, sanitaires et zones techniques. Variante prudente pour les sites sensibles, événements et ERP.'},
  profit:{label:'Rentabilité',note:'Maximise les surfaces directement productives ou commerciales. À utiliser sans sacrifier les obligations de sécurité et d’exploitation.'}
};
const V5_LAYERS={function:'Fonctions',cost:'Coûts',risk:'Risques',flow:'Flux'};

function ensureV5State(){
  state.visual=state.visual||{};
  state.visual.variant=state.visual.variant||'balanced';
  state.visual.layer=state.visual.layer||'function';
  state.visual.selectedZone=Number.isInteger(state.visual.selectedZone)?state.visual.selectedZone:0;
}

function projectReadyScore(){
  const c=controls();
  return Math.round(c.reduce((s,x)=>s+(x.status==='OK'?1:x.status==='ALERTE'?.4:0),0)/Math.max(1,c.length)*100);
}
function actionPage(name=''){
  if(/budget|CAPEX|Prix|Volume|Marge|Résultat|Point mort|Trésorerie|finance/i.test(name))return'finance';
  if(/preuve|marché|Juridique|Assurance/i.test(name))return'ai';
  if(/Accès|PMR|Plan B|Questionnaire|droit d’usage/i.test(name))return'questions';
  if(/site|territoire|Concept|échéance/i.test(name))return'project';
  return'control';
}
function renderDashboard(){
  const hero=$('#cockpitHero'),kp=$('#cockpitKpis'),actions=$('#nextActions'),sim=$('#quickSim'),mg=$('#miniGates'),mr=$('#miniRisks');
  if(!hero)return;
  ensureV5State();
  if(!state.analysis){
    hero.innerHTML=`<div class="decision-orb"><div class="big-verdict">À CADRER</div><div class="score-line">Commence par construire le dossier 360°</div></div>
      <div class="cockpit-summary"><span class="eyebrow">COCKPIT V5</span><h2>Le cockpit apparaîtra après la première analyse.</h2><p>Il rassemblera décision, rentabilité, stress-test, portes G0→G5, risques dominants et prochaines actions.</p><div class="row"><button class="btn primary" data-jump="project">Retour au cadrage</button></div></div>`;
    kp.innerHTML='';actions.innerHTML='<p class="muted">Analyse requise.</p>';sim.innerHTML='';mg.innerHTML='';mr.innerHTML='';
    bindJumpButtons();return;
  }
  const s=scoreProject(),f=calcFinance(),c=controls(),gs=gates(),rs=risks(),ready=projectReadyScore(),stress=state.finance.stress||{};
  const blocking=c.filter(x=>x.status==='BLOQUANT').length;
  hero.innerHTML=`<div class="decision-orb"><span class="eyebrow">DÉCISION ACTUELLE</span><div class="big-verdict">${esc(s.verdict)}</div><div class="score-line">Confiance ${s.confidence}/100 · préparation ${ready}/100</div></div>
    <div class="cockpit-summary"><span class="eyebrow">${esc(state.name||'PROJET')}</span><h2>${blocking?`${blocking} blocage${blocking>1?'s':''} à lever avant un vrai GO.`:'Le dossier n’a pas de bloquant majeur interne.'}</h2><p>${esc(challenge()[0]||'Aucune faille évidente détectée par le moteur interne.')}</p><div class="row"><button class="btn primary" data-jump="control">Voir les contrôles</button><button class="btn ghost" data-jump="visuals">Ouvrir le plan</button></div></div>`;
  kp.innerHTML=[
    ['Préparation',`${ready}/100`],['Résultat central',fmt(f.profit)+'/m'],['Stress positif',`${Number(stress.positive||0).toFixed(0)}%`],['Risque n°1',rs[0]?.name||'—']
  ].map(([n,v])=>`<div class="kpi"><span>${esc(n)}</span><strong style="font-size:${n==='Risque n°1'?'17':'23'}px">${esc(v)}</strong></div>`).join('');
  const todo=c.filter(x=>x.status!=='OK').slice(0,6);
  actions.innerHTML=todo.length?todo.map((x,i)=>`<div class="next-action"><div class="n">${i+1}</div><div><b>${esc(x.name)}</b><p>${esc(x.action)}</p></div><button class="btn small ghost" data-jump="${actionPage(x.name)}">Traiter</button></div>`).join(''):'<div class="callout">Aucune action critique interne. Passe maintenant à la validation terrain et aux preuves externes.</div>';
  const sims=[
    ['-20% volume',calcFinance({qty:.8,price:1,margin:1,opex:1})],
    ['Central',calcFinance()],
    ['+20% volume',calcFinance({qty:1.2,price:1,margin:1,opex:1})]
  ];
  sim.innerHTML=`<div class="sim-grid">${sims.map(([n,x])=>`<div class="sim-card"><span>${n}</span><strong>${fmt(x.profit)}/m</strong><small class="muted">${x.profit>=0?'modèle positif':'déficitaire'}</small></div>`).join('')}</div>
    <div class="callout ${sims[0][1].profit<0?'warn':''}" style="margin-top:10px">${sims[0][1].profit<0?'Une baisse de 20% du volume fait passer le modèle en déficit.':'Le modèle reste positif avec -20% de volume sur les hypothèses actuelles.'}</div>`;
  mg.innerHTML=gs.map(g=>`<div class="mini-gate"><code>${g.code}</code><div><b>${esc(g.name)}</b><div class="bar"><i style="width:${g.score}%"></i></div></div><strong>${g.score}</strong></div>`).join('');
  mr.innerHTML=rs.slice(0,4).map(r=>`<div class="mini-risk"><div><b>${esc(r.name)}</b><small>${esc(r.mit)}</small></div><span class="status ${r.score>=35?'block':r.score>=20?'alert':'ok'}">${r.score}</span></div>`).join('');
  bindJumpButtons();
}

function variantSurfaces(){
  ensureV5State();
  const base=surfaces().map(([n,p])=>[n,Number(p)]);
  const variant=state.visual.variant;
  const weighted=base.map(([n,p])=>{
    const name=n.toLowerCase();
    const revenue=/vente|salle|terrasse|public|activité|scène|restauration|production/.test(name);
    const circulation=/circulation|secours/.test(name);
    const sanitary=/sanitaire/.test(name);
    const technical=/technique|déchet|réserve|stock|personnel|backstage/.test(name);
    const welcome=/accueil|caisse/.test(name);
    let m=1;
    if(variant==='compact'){if(circulation)m=.76;else if(technical)m=.84;else if(revenue)m=1.13;}
    if(variant==='experience'){if(revenue)m=1.18;else if(welcome)m=1.12;else if(technical)m=.83;}
    if(variant==='safety'){if(circulation)m=1.34;else if(sanitary)m=1.22;else if(technical)m=1.10;else if(revenue)m=.91;}
    if(variant==='profit'){if(revenue)m=1.24;else if(technical||circulation)m=.78;else if(welcome)m=.93;}
    return[n,p*m];
  });
  const total=weighted.reduce((a,x)=>a+x[1],0)||1;
  const out=weighted.map(([n,p])=>[n,Math.max(2,Math.round(p/total*100))]);
  let diff=100-out.reduce((a,x)=>a+x[1],0);
  if(out.length)out[out.length-1][1]+=diff;
  return out;
}
function zoneFactor(name){
  const n=name.toLowerCase();
  if(/production|cuisine|technique/.test(n))return 1.55;
  if(/sanitaire/.test(n))return 1.30;
  if(/vente|salle|terrasse|public|activité|scène/.test(n))return 1.15;
  if(/accueil|caisse/.test(n))return .9;
  if(/réserve|stock|backstage/.test(n))return .8;
  if(/circulation/.test(n))return .62;
  return 1;
}
function zoneRisk(name){
  const n=name.toLowerCase();let r=30;
  if(/production|cuisine/.test(n))r+=22;
  if(/technique/.test(n))r+=18;
  if(/public|salle|terrasse|scène|activité/.test(n))r+=16;
  if(/circulation|secours/.test(n))r+=10;
  if(/sanitaire/.test(n))r+=8;
  if(['lake','river'].includes(state.site))r+=10;
  if(['square','publicsite'].includes(state.site)||state.ownership==='public')r+=7;
  if(state.type==='event')r+=7;
  return clamp(r,10,92);
}
function zoneEngineering(name,p,all){
  const f=calcFinance(),weights=all.map(([n,pc])=>pc*zoneFactor(n)),sum=weights.reduce((a,b)=>a+b,0)||1;
  const idx=all.findIndex(x=>x[0]===name),share=weights[idx]/sum,cost=Math.round(f.capex*share),risk=zoneRisk(name),n=name.toLowerCase();
  const constraints=[],actions=[];
  if(/production|cuisine/.test(n)){constraints.push('Hygiène, ventilation, eau, chaîne du froid, nettoyage.');actions.push('Valider équipements, marche en avant et puissance électrique.');}
  if(/sanitaire/.test(n)){constraints.push('Accessibilité, eau, assainissement, entretien.');actions.push('Vérifier capacité et conformité PMR.');}
  if(/circulation|secours/.test(n)){constraints.push('Largeurs, évacuation, croisements public/service.');actions.push('Valider flux clients, livraisons et secours.');}
  if(/technique|déchet/.test(n)){constraints.push('Incendie, puissance, stockage, déchets et accès maintenance.');actions.push('Lister réseaux et contrôles réglementaires nécessaires.');}
  if(/réserve|stock|backstage/.test(n)){constraints.push('Sécurité, accès personnel, stockage et livraisons.');actions.push('Dimensionner le stock et séparer flux public/service.');}
  if(/vente|caisse|accueil/.test(n)){constraints.push('Visibilité, attente, encaissement et contrôle des flux.');actions.push('Tester le parcours d’entrée et le temps de service.');}
  if(/public|salle|terrasse|activité|scène/.test(n)){constraints.push('Jauge, confort, PMR, évacuation et nuisance selon l’activité.');actions.push('Fixer une jauge réaliste et simuler le pic de fréquentation.');}
  if(['lake','river'].includes(state.site)){constraints.push('Site lié à l’eau : météo, chute/noyade, accès secours et repli.');actions.push('Définir limites d’usage, fermeture météo et plan de secours.');}
  if(state.ownership==='public'){constraints.push('Occupation publique : l’aménagement doit rester compatible avec l’autorisation.');actions.push('Faire valider cette zone dans le dossier d’occupation.');}
  if(!constraints.length)constraints.push('Fonction, capacité, accessibilité et maintenance à confirmer.');
  if(!actions.length)actions.push('Valider dimensions, usage réel et interaction avec les zones voisines.');
  const status=risk>=65?'À sécuriser':risk>=48?'À confirmer':'Sous contrôle';
  return{name,p,cost,share,risk,status,constraints:[...new Set(constraints)],actions:[...new Set(actions)]};
}
function allZoneEngineering(){
  const all=variantSurfaces();return all.map(([n,p])=>zoneEngineering(n,p,all));
}
function zoneFill(z,i){
  ensureV5State();
  if(state.visual.layer==='risk')return z.risk>=65?'#6d2e35':z.risk>=48?'#66501f':'#17483c';
  if(state.visual.layer==='cost'){
    const pct=z.share*100;return pct>=20?'#75522a':pct>=14?'#3d5270':'#173a4b';
  }
  if(state.visual.layer==='flow')return i%2?'#15314a':'#123d45';
  return ['#16423b','#153b56','#263e63','#3b3d58','#4c4029','#183c4d','#23465b'][i%7];
}
function layoutGeometry(zones){
  const left=zones.filter((_,i)=>i%2===0),right=zones.filter((_,i)=>i%2===1),H=390,Y=45,gap=12;
  const make=(arr,x,w,side)=>{
    const available=H-gap*Math.max(0,arr.length-1),sum=arr.reduce((a,z)=>a+z.p,0)||1;let y=Y;
    return arr.map(z=>{const h=Math.max(58,available*z.p/sum);const o={z,x,y,w,h,side};y+=h+gap;return o});
  };
  const L=make(left,35,310,'left'),R=make(right,495,310,'right');
  const map=new Map([...L,...R].map(o=>[o.z.name,o]));
  return zones.map(z=>map.get(z.name));
}
function renderZoneInspector(index){
  ensureV5State();const zones=allZoneEngineering();index=clamp(Number(index)||0,0,Math.max(0,zones.length-1));state.visual.selectedZone=index;
  const z=zones[index],ins=$('#zoneInspector');if(!ins||!z)return;
  ins.innerHTML=`<div class="zone-title"><div><span class="eyebrow">ZONE ${String(index+1).padStart(2,'0')}</span><h3>${esc(z.name)}</h3></div><span class="status ${z.risk>=65?'block':z.risk>=48?'alert':'ok'}">${esc(z.status)}</span></div>
    <div class="zone-metrics"><div class="zone-metric"><span>Part du programme</span><strong>${z.p}%</strong></div><div class="zone-metric"><span>CAPEX indicatif affecté</span><strong>${fmt(z.cost)}</strong></div><div class="zone-metric"><span>Risque zone</span><strong>${z.risk}/100</strong></div><div class="zone-metric"><span>Part CAPEX</span><strong>${(z.share*100).toFixed(0)}%</strong></div></div>
    <div class="inspector-block"><h4>Contraintes à contrôler</h4><ul class="zone-list">${z.constraints.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="inspector-block"><h4>Actions recommandées</h4><ul class="zone-list">${z.actions.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>
    <div class="inspector-block"><button class="btn primary" data-jump="${z.risk>=60?'control':'questions'}">Traiter les points de cette zone</button></div>`;
  $$('.zone-hit').forEach((g,i)=>g.classList.toggle('selected',i===index));$$('.surface-chip').forEach((b,i)=>b.classList.toggle('active',i===index));
  bindJumpButtons();
}
