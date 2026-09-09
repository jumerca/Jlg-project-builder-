/* JLG Project Lab 360 — V7 execution cockpit */
const V7_VERSION='7.0.0';
function ensureV7State(){
  state.execution=state.execution||{};
  state.execution.actors=state.execution.actors||{};
  state.execution.customActors=state.execution.customActors||[];
  state.execution.permits=state.execution.permits||{};
  state.execution.quotes=state.execution.quotes||[];
  state.execution.hypotheses=state.execution.hypotheses||{};
  state.execution.hypEvidence=state.execution.hypEvidence||{};
  state.execution.milestones=state.execution.milestones||{};
}
function injectV7Shell(){
  document.title='JLG Project Lab 360 — V7';
  const vp=document.querySelector('.version-pill');if(vp)vp.textContent='V7';
  const bs=document.querySelector('.brand small');if(bs)bs.textContent='V7 · ingénierie & montage opérationnel';
  if(!document.querySelector('link[href*="v7.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./v7.css?v=7.0.0';document.head.appendChild(l)}
  const tabs=document.querySelector('#tabs');
  if(tabs&&!tabs.querySelector('[data-page="execution"]')){
    const road=tabs.querySelector('[data-page="roadmap"]');
    (road||tabs.lastElementChild)?.insertAdjacentHTML(road?'beforebegin':'afterend','<button class="tab" data-page="execution">Montage V7</button>');
  }
  const roadPage=document.querySelector('#roadmap');
  if(roadPage&&!document.querySelector('#execution'))roadPage.insertAdjacentHTML('beforebegin',`<section id="execution" class="page">
    <div class="section-title"><div><span class="section-kicker">V7 · EXÉCUTION</span><h2>Centre de montage opérationnel</h2></div><p>Qui agit, quelle autorisation manque, quoi acheter et quelle hypothèse doit encore être prouvée.</p></div>
    <div id="execHero" class="exec-hero"></div>
    <div id="execSummary" class="exec-summary"></div>
    <div class="exec-grid">
      <div class="exec-card"><div class="card-head"><h3>Parties prenantes</h3><span class="pill">influence × implication</span></div><div id="stakeMap" class="stake-map"></div><div class="separator"></div><div id="actorList"></div><div class="grid g2" style="margin-top:10px"><input id="actorName" class="field" placeholder="Ajouter un acteur"><input id="actorRole" class="field" placeholder="Rôle"></div><button id="addActorV7" class="btn small" style="margin-top:8px">Ajouter</button></div>
      <div class="exec-card"><div class="card-head"><h3>Autorisations & validations</h3><span class="pill">adaptatif</span></div><div id="permitList"></div></div>
      <div class="exec-card"><div class="card-head"><h3>Fournisseurs & devis</h3><span class="pill">comparaison</span></div><div id="quoteList"></div><div class="grid g2" style="margin-top:10px"><input id="quoteSupplier" class="field" placeholder="Fournisseur"><select id="quoteCat" class="field"><option>Travaux</option><option>Matériel</option><option>Études</option><option>Communication</option><option>Prestataire</option><option>Autre</option></select><input id="quoteAmount" type="number" class="field" placeholder="Montant €"><input id="quoteNote" class="field" placeholder="Note / périmètre"></div><button id="addQuoteV7" class="btn small" style="margin-top:8px">Ajouter le devis</button></div>
      <div class="exec-card"><div class="card-head"><h3>Validation terrain des hypothèses</h3><span class="pill">preuve avant investissement</span></div><div id="hypothesisList"></div></div>
    </div>
    <div class="section-title"><div><span class="section-kicker">CHEMIN CRITIQUE</span><h2>Jalons à franchir</h2></div><p>Le lancement n’est solide que si les dépendances critiques sont levées.</p></div>
    <div id="criticalPath" class="critical-path"></div>
    <div class="exec-card"><div id="milestoneList"></div></div>
  </section>`);
}
function defaultActors(){
  const a=[
    {id:'owner',name:'Porteur du projet',role:'Décideur / pilote',influence:'high',interest:'high'},
    {id:'accountant',name:'Comptable / conseil financier',role:'Prévisionnel / structure',influence:'med',interest:'med'},
    {id:'insurance',name:'Assureur',role:'Risques / couverture',influence:'high',interest:'med'},
    {id:'technical',name:'Technicien / bureau de contrôle',role:'Technique / conformité',influence:'high',interest:'med'},
    {id:'customers',name:'Clients / usagers tests',role:'Validation de la demande',influence:'med',interest:'high'}
  ];
  if(state.ownership==='public'||['square','publicsite','lake','river'].includes(state.site))a.push({id:'public-owner',name:'Mairie / gestionnaire public',role:'Autorisation / occupation',influence:'high',interest:'high'});
  if(state.ownership==='rent')a.push({id:'landlord',name:'Bailleur / propriétaire',role:'Bail / travaux / destination',influence:'high',interest:'high'});
  if(['lake','river'].includes(state.site))a.push({id:'rescue',name:'Secours / sécurité locale',role:'Accès / sécurité eau',influence:'high',interest:'med'});
  if(state.type==='food')a.push({id:'food',name:'Référent hygiène / services compétents',role:'Hygiène alimentaire',influence:'high',interest:'med'});
  return [...a,...state.execution.customActors];
}
function actorStatus(id){return state.execution.actors[id]||'unknown'}
function renderActors(){
  const all=defaultActors(),list=$('#actorList'),map=$('#stakeMap');if(!list||!map)return;
  const qs={hh:[],hm:[],mh:[],mm:[]};all.forEach(a=>{const k=(a.influence==='high'?'h':'m')+(a.interest==='high'?'h':'m');qs[k].push(a)});
  const quad=(title,arr)=>`<div class="stake-quadrant"><h4>${title}</h4>${arr.map(a=>`<div class="stake-person">${esc(a.name)}<div class="exec-small">${esc(a.role)}</div></div>`).join('')||'<span class="exec-small">—</span>'}</div>`;
  map.innerHTML=quad('Piloter de près',qs.hh)+quad('Sécuriser / convaincre',qs.hm)+quad('Impliquer / tester',qs.mh)+quad('Informer',qs.mm);
  list.innerHTML=all.map(a=>`<div class="actor-row"><div><b>${esc(a.name)}</b><div class="exec-small">${esc(a.role)}</div></div><span class="exec-chip">Influence ${a.influence==='high'?'forte':'moyenne'}</span><span class="exec-chip">Intérêt ${a.interest==='high'?'fort':'moyen'}</span><select class="status-select" data-actor-status="${esc(a.id)}"><option value="unknown" ${actorStatus(a.id)==='unknown'?'selected':''}>À contacter</option><option value="contacted" ${actorStatus(a.id)==='contacted'?'selected':''}>Contacté</option><option value="engaged" ${actorStatus(a.id)==='engaged'?'selected':''}>Engagé</option><option value="blocked" ${actorStatus(a.id)==='blocked'?'selected':''}>Bloquant</option></select></div>`).join('');
  $$('[data-actor-status]').forEach(s=>s.onchange=()=>{state.execution.actors[s.dataset.actorStatus]=s.value;save(false);renderExecution()});
}
function addActorV7(){const name=$('#actorName')?.value.trim(),role=$('#actorRole')?.value.trim();if(!name)return toast('Ajoute un acteur');state.execution.customActors.push({id:'custom-actor-'+Date.now(),name,role:role||'Rôle à définir',influence:'med',interest:'med'});$('#actorName').value='';$('#actorRole').value='';save(false);renderActors();renderExecution()}
function permitTemplates(){
  const p=[
    ['site-right','Droit d’utiliser le lieu','critical','Propriétaire / gestionnaire','À sécuriser avant dépense irréversible'],
    ['insurance-v7','Validation assurance activité + site','critical','Assureur','Couverture responsabilité et exploitation'],
    ['access-v7','Accès, PMR et secours','critical','Technicien / gestionnaire','Conditionne sécurité et ouverture'],
    ['finance-v7','Plan de financement validé','critical','Financeur / comptable','Éviter une impasse de trésorerie']
  ];
  if(state.ownership==='public'||['square','publicsite','lake','river'].includes(state.site))p.push(['aot-v7','Autorisation / convention d’occupation','critical','Mairie / gestionnaire','Occupation publique ou site géré']);
  if(['lake','river'].includes(state.site))p.push(['water-v7','Sécurité eau / crue / repli','critical','Gestionnaire / secours','Risque spécifique au site']);
  if(state.type==='food')p.push(['food-v7','Hygiène alimentaire / exploitation','critical','Référent hygiène','Procédures, eau, froid, déchets'],['alcohol-v7','Licence / boissons si concerné','normal','Administration compétente','À vérifier selon offre réelle']);
  if(state.type==='event')p.push(['event-v7','Sécurité événement / jauge / évacuation','critical','Mairie / secours / technicien','Validation avant accueil du public']);
  if(state.site==='castle')p.push(['heritage-v7','Validation patrimoine / travaux','critical','Gestionnaire / services patrimoine','Contraintes du bâti protégé']);
  if(state.type==='digital')p.push(['rgpd-v7','RGPD / confidentialité / données','critical','Référent données / conseil','À traiter avant collecte de données']);
  if(state.site==='shop')p.push(['lease-v7','Bail / destination / travaux autorisés','critical','Bailleur / conseil','Vérifier l’usage commercial réel']);
  return p.map(x=>({id:x[0],name:x[1],priority:x[2],owner:x[3],why:x[4]}));
}
function permitStatus(id){return state.execution.permits[id]||'todo'}
function renderPermits(){const el=$('#permitList');if(!el)return;const p=permitTemplates();el.innerHTML=p.map(x=>`<div class="permit-row"><div><b>${esc(x.name)}</b><div class="exec-small">${esc(x.why)}</div></div><span class="exec-chip">${esc(x.owner)}</span>${x.priority==='critical'?'<span class="status block">CRITIQUE</span>':'<span class="status alert">À VÉRIFIER</span>'}<select class="status-select" data-permit-status="${x.id}"><option value="todo" ${permitStatus(x.id)==='todo'?'selected':''}>À traiter</option><option value="doing" ${permitStatus(x.id)==='doing'?'selected':''}>En cours</option><option value="done" ${permitStatus(x.id)==='done'?'selected':''}>Validé</option><option value="na" ${permitStatus(x.id)==='na'?'selected':''}>Non concerné</option></select></div>`).join('');$$('[data-permit-status]').forEach(s=>s.onchange=()=>{state.execution.permits[s.dataset.permitStatus]=s.value;save(false);renderExecution()})}
function addQuoteV7(){const supplier=$('#quoteSupplier')?.value.trim(),cat=$('#quoteCat')?.value,amount=Number($('#quoteAmount')?.value||0),note=$('#quoteNote')?.value.trim();if(!supplier||!amount)return toast('Fournisseur et montant requis');state.execution.quotes.push({id:'q-'+Date.now(),supplier,cat,amount,note,date:new Date().toLocaleDateString('fr-FR')});['quoteSupplier','quoteAmount','quoteNote'].forEach(id=>$('#'+id).value='');save(false);renderQuotes();renderExecution()}
function renderQuotes(){const el=$('#quoteList');if(!el)return;const q=state.execution.quotes||[],budget=calcFinance().capex;el.innerHTML=q.length?q.map((x,i)=>`<div class="quote-row"><div><b>${esc(x.supplier)}</b><div class="exec-small">${esc(x.cat)} · ${esc(x.note||'sans note')}</div></div><span class="exec-chip">${fmt(x.amount)}</span><span class="exec-small">${budget?Math.round(x.amount/budget*100):0}% CAPEX</span><button class="btn small bad" data-del-quote="${i}">Suppr.</button></div>`).join(''):'<p class="muted">Aucun devis enregistré. Un budget sans devis reste une hypothèse.</p>';$$('[data-del-quote]').forEach(b=>b.onclick=()=>{state.execution.quotes.splice(+b.dataset.delQuote,1);save(false);renderQuotes();renderExecution()})}
function hypothesisTemplates(){
  const h=[
    ['demand','La demande existe au niveau attendu','critical','Test clients, préventes, sondage terrain ou fréquentation observée.'],
    ['price','Le prix / panier moyen est acceptable','critical','Tester un prix réel, pas seulement demander un avis.'],
    ['volume','Le volume mensuel est atteignable','critical','Comparer capacité, fréquentation locale et conversion réaliste.'],
    ['margin','La marge réelle tient après coûts complets','critical','Remplacer estimations par devis et coûts unitaires.'],
    ['operations','Le projet est exploitable humainement','critical','Simuler une journée type, pics, pauses, nettoyage et remplacement.']
  ];
  if((state.finance?.activeMonths||12)<9)h.push(['seasonality','La saison courte suffit à absorber les coûts annuels','critical','Tester le scénario prudent avec météo et basse fréquentation.']);
  if(state.ownership==='public')h.push(['public-dependence','L’autorisation publique sera suffisamment stable','critical','Obtenir conditions, durée, révocabilité et contraintes écrites.']);
  if(['lake','river','square'].includes(state.site))h.push(['weather','Le projet résiste à un mauvais scénario météo','critical','Définir seuil de fermeture, plan B et impact financier.']);
  return h.map(x=>({id:x[0],name:x[1],priority:x[2],test:x[3]}));
}
function hypStatus(id){return state.execution.hypotheses[id]||'unknown'}
function renderHypotheses(){const el=$('#hypothesisList');if(!el)return;el.innerHTML=hypothesisTemplates().map(h=>`<div class="hyp-row"><div><b>${esc(h.name)}</b><div class="hyp-detail">Test conseillé : ${esc(h.test)}</div><input class="field" style="margin-top:7px;padding:7px 9px" data-hyp-evidence="${h.id}" value="${esc(state.execution.hypEvidence[h.id]||'')}" placeholder="Preuve / résultat du test"></div><span class="status ${hypStatus(h.id)==='validated'?'ok':hypStatus(h.id)==='invalid'?'block':'alert'}">${hypStatus(h.id)==='validated'?'VALIDÉE':hypStatus(h.id)==='invalid'?'INVALIDÉE':'À PROUVER'}</span><select class="status-select" data-hyp-status="${h.id}"><option value="unknown" ${hypStatus(h.id)==='unknown'?'selected':''}>À prouver</option><option value="testing" ${hypStatus(h.id)==='testing'?'selected':''}>Test en cours</option><option value="validated" ${hypStatus(h.id)==='validated'?'selected':''}>Validée</option><option value="invalid" ${hypStatus(h.id)==='invalid'?'selected':''}>Invalidée</option></select></div>`).join('');$$('[data-hyp-status]').forEach(s=>s.onchange=()=>{state.execution.hypotheses[s.dataset.hypStatus]=s.value;save(false);renderExecution()});$$('[data-hyp-evidence]').forEach(i=>i.onchange=()=>{state.execution.hypEvidence[i.dataset.hypEvidence]=i.value;save(false)})}
function milestoneTemplates(){return [
  ['M0','Concept cadré','G0',()=>gates()[0]?.score>=70],
  ['M1','Lieu juridiquement sécurisable','G1',()=>permitStatus('site-right')==='done'],
  ['M2','Marché testé','G2',()=>hypStatus('demand')==='validated'&&hypStatus('price')==='validated'],
  ['M3','Autorisations critiques lancées','G3',()=>permitTemplates().filter(p=>p.priority==='critical').every(p=>['doing','done','na'].includes(permitStatus(p.id)))],
  ['M4','Financement et coûts fiabilisés','G4',()=>state.execution.quotes.length>=2&&permitStatus('finance-v7')==='done'],
  ['M5','GO final documenté','G5',()=>gates()[5]?.score>=70&&permitTemplates().filter(p=>p.priority==='critical').every(p=>['done','na'].includes(permitStatus(p.id)))]
].map(x=>({id:x[0],name:x[1],gate:x[2],auto:x[3]}))}
function renderMilestones(){const el=$('#milestoneList'),cp=$('#criticalPath');if(!el||!cp)return;const ms=milestoneTemplates();cp.innerHTML=ms.map((m,i)=>`<div class="critical-node"><span class="exec-small">${m.id} · ${m.gate}</span><b>${esc(m.name)}</b><span class="status ${(state.execution.milestones[m.id]==='done'||m.auto())?'ok':'alert'}">${(state.execution.milestones[m.id]==='done'||m.auto())?'FRANCHI':'OUVERT'}</span></div>${i<ms.length-1?'<span class="critical-arrow">→</span>':''}`).join('');el.innerHTML=ms.map(m=>{const auto=m.auto(),st=state.execution.milestones[m.id]||(auto?'done':'todo');return`<div class="milestone-row"><code>${m.id}</code><div><b>${esc(m.name)}</b><div class="exec-small">Lié à ${m.gate} · ${auto?'critères automatiques couverts':'conditions encore incomplètes'}</div></div><select class="status-select" data-ms-status="${m.id}"><option value="todo" ${st==='todo'?'selected':''}>Ouvert</option><option value="doing" ${st==='doing'?'selected':''}>En cours</option><option value="done" ${st==='done'?'selected':''}>Franchi</option></select></div>`}).join('');$$('[data-ms-status]').forEach(s=>s.onchange=()=>{state.execution.milestones[s.dataset.msStatus]=s.value;save(false);renderExecution()})}
function executionScore(){const actors=defaultActors(),perm=permitTemplates(),hyps=hypothesisTemplates(),ms=milestoneTemplates();const a=actors.filter(x=>['contacted','engaged'].includes(actorStatus(x.id))).length/Math.max(1,actors.length),p=perm.filter(x=>['done','na'].includes(permitStatus(x.id))).length/Math.max(1,perm.length),q=Math.min(1,state.execution.quotes.length/2),h=hyps.filter(x=>hypStatus(x.id)==='validated').length/Math.max(1,hyps.length),m=ms.filter(x=>state.execution.milestones[x.id]==='done'||x.auto()).length/Math.max(1,ms.length);return Math.round((a*.18+p*.28+q*.16+h*.22+m*.16)*100)}
function renderExecution(){
  ensureV7State();renderActors();renderPermits();renderQuotes();renderHypotheses();renderMilestones();const hero=$('#execHero'),sum=$('#execSummary');if(!hero||!sum)return;const score=executionScore(),perm=permitTemplates(),critical=perm.filter(x=>x.priority==='critical'&&!['done','na'].includes(permitStatus(x.id))).length,invalid=hypothesisTemplates().filter(x=>hypStatus(x.id)==='invalid').length,engaged=defaultActors().filter(x=>actorStatus(x.id)==='engaged').length;
  hero.innerHTML=`<div><span class="eyebrow">READINESS EXÉCUTION</span><h2>${score>=75?'Projet proche d’un montage exécutable.':score>=50?'Le montage progresse, mais des validations restent ouvertes.':'Le dossier est encore trop hypothétique pour engager lourdement.'}</h2><p>${critical?`${critical} autorisation${critical>1?'s':''} critique${critical>1?'s':''} reste${critical>1?'nt':''} à sécuriser.`:'Les validations critiques internes sont couvertes.'} ${invalid?`${invalid} hypothèse clé a été invalidée : il faut pivoter avant d’investir.`:'Aucune hypothèse clé n’est marquée comme invalidée.'}</p></div><div class="exec-score"><strong>${score}</strong><span>/100 · préparation exécution</span></div>`;
  sum.innerHTML=[['Autorisations critiques',critical?critical+' ouvertes':'OK'],['Acteurs engagés',`${engaged}/${defaultActors().length}`],['Devis enregistrés',state.execution.quotes.length],['Hypothèses validées',`${hypothesisTemplates().filter(x=>hypStatus(x.id)==='validated').length}/${hypothesisTemplates().length}`]].map(([n,v])=>`<div class="kpi"><span>${esc(n)}</span><strong>${esc(v)}</strong></div>`).join('');
}
function addV7Dossier(){const d=$('#dossierContent');if(!d||!state.analysis||d.querySelector('.v7-dossier'))return;const p=permitTemplates(),hy=hypothesisTemplates();d.insertAdjacentHTML('beforeend',`<div class="v7-dossier"><h2>Montage opérationnel V7</h2><p><b>Préparation exécution : ${executionScore()}/100.</b> Ce score reflète le niveau de sécurisation des acteurs, autorisations, devis, hypothèses et jalons enregistrés.</p><h3>Autorisations / validations critiques</h3><table><thead><tr><th>Point</th><th>Responsable</th><th>Statut</th></tr></thead><tbody>${p.filter(x=>x.priority==='critical').map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(x.owner)}</td><td>${esc(permitStatus(x.id))}</td></tr>`).join('')}</tbody></table><h3>Hypothèses clés</h3><table><thead><tr><th>Hypothèse</th><th>Statut</th><th>Preuve / test</th></tr></thead><tbody>${hy.map(x=>`<tr><td>${esc(x.name)}</td><td>${esc(hypStatus(x.id))}</td><td>${esc(state.execution.hypEvidence[x.id]||'À documenter')}</td></tr>`).join('')}</tbody></table></div>`)}
function bindV7(){
  $$('.tab').forEach(b=>{if(!b.dataset.v7bound){b.dataset.v7bound='1';b.addEventListener('click',()=>{if(b.dataset.page==='execution')setTimeout(renderExecution,0)})}});
  $('#addActorV7')&&($('#addActorV7').onclick=addActorV7);$('#addQuoteV7')&&($('#addQuoteV7').onclick=addQuoteV7);
}
const V7_oldShowPage=showPage;showPage=function(id){V7_oldShowPage(id);if(id==='execution')renderExecution()};
const V7_oldRenderAll=renderAll;renderAll=function(){ensureV7State();V7_oldRenderAll();renderExecution();addV7Dossier()};
const V7_oldRenderDossier=renderDossier;renderDossier=function(){V7_oldRenderDossier();addV7Dossier()};
const V7_oldLoadTest=loadTest;loadTest=function(){V7_oldLoadTest();ensureV7State();state.execution.actors['public-owner']='contacted';state.execution.actors.insurance='contacted';state.execution.permits['site-right']='doing';state.execution.permits['aot-v7']='doing';state.execution.hypotheses.demand='testing';state.execution.hypEvidence.demand='Premier test terrain à organiser';renderExecution();save(false)};
function extendAutoTestsV7(){const old=window.autoTestsV5;if(!old)return;window.autoTestsV5=function(){old();setTimeout(()=>{const checks=[['V7 centre de montage',!!$('#execution')],['Matrice parties prenantes',defaultActors().length>=5],['Autorisations adaptatives',permitTemplates().length>=4],['Hypothèses terrain',hypothesisTemplates().length>=5],['Chemin critique M0→M5',milestoneTemplates().length===6]];$('#testResults')?.insertAdjacentHTML('beforeend',checks.map(([n,ok])=>`<div class="qa-item"><header><b>${esc(n)}</b><span class="status ${ok?'ok':'block'}">${ok?'OK':'ÉCHEC'}</span></header></div>`).join(''))},100)};$('#autoTestBtn')&&($('#autoTestBtn').onclick=window.autoTestsV5)}
function initV7(){ensureV7State();injectV7Shell();bindV7();extendAutoTestsV7();renderAll();if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=7.0.0').then(r=>r.update()).catch(()=>{});}
initV7();