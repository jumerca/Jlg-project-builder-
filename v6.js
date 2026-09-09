/* JLG Project Lab 360 — V6 workflow layer */
const V6_VERSION='6.0.0';
function ensureV6State(){
  state.workflow=state.workflow||{};
  state.workflow.roadmap=state.workflow.roadmap||{};
  state.workflow.documents=state.workflow.documents||{};
  state.workflow.customDocs=state.workflow.customDocs||[];
  state.workflow.decisions=state.workflow.decisions||[];
}
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
function injectV6Shell(){
  document.title='JLG Project Lab 360 — V6';
  document.querySelector('.version-pill')&&(document.querySelector('.version-pill').textContent='V6');
  document.querySelector('.brand small')&&(document.querySelector('.brand small').textContent='V6 · bureau d’études de poche');
  document.querySelectorAll('img[src="icon-192.png"]').forEach(i=>i.src='project-lab-360-v6-192.png?v=6');
  document.querySelectorAll('img[src="icon-512.png"]').forEach(i=>i.src='project-lab-360-v6-512.png?v=6');
  const hero=document.querySelector('#project .hero-brand');
  if(hero&&!document.querySelector('.logo-stage')){
    hero.insertAdjacentHTML('beforebegin',`<div class="logo-stage">
      <div class="logo-stage-copy"><span class="eyebrow">JLG PROJECT LAB 360 · V6</span><h2>Le bureau d’études de ton projet.</h2><p>De l’idée brute au dossier exploitable : faisabilité, droit, sécurité, finance, risques, plan d’action, documents, conception et décision.</p><div class="row no-print" style="margin-top:14px"><button class="btn primary" data-jump="project">Créer / cadrer</button><button class="btn ghost" data-jump="roadmap">Voir la feuille de route</button></div></div>
      <div class="logo-stage-media"><img src="project-lab-360-v6-512.png?v=6" alt="Logo JLG Project Lab 360"></div>
    </div>`);
  }
  const tabs=document.querySelector('#tabs');
  if(tabs&&!tabs.querySelector('[data-page="roadmap"]')){
    const dossier=tabs.querySelector('[data-page="dossier"]');
    dossier?.insertAdjacentHTML('beforebegin','<button class="tab" data-page="roadmap">Feuille de route</button><button class="tab" data-page="documents">Documents</button>');
  }
  const dossierPage=document.querySelector('#dossier');
  if(dossierPage&&!document.querySelector('#roadmap')){
    dossierPage.insertAdjacentHTML('beforebegin',`<section id="roadmap" class="page">
      <div class="section-title"><div><span class="section-kicker">09 · EXÉCUTION</span><h2>Feuille de route 30 / 60 / 90 jours</h2></div><p>Des priorités concrètes, pas une liste décorative.</p></div>
      <div id="roadmapSummary" class="grid g4 roadmap-summary"></div>
      <div class="row no-print roadmap-page-actions" style="margin-bottom:14px"><button class="btn primary" id="roadmapRefresh">Recalculer les priorités</button><button class="btn ghost" id="roadmapExport">Exporter la checklist</button></div>
      <div id="roadmapGrid" class="roadmap-grid"></div>
      <div class="section-title"><h2>Blocages & décisions à prendre</h2><p>Ce qui empêche réellement le GO.</p></div>
      <div class="grid g2"><div class="card"><h3>Blocages actifs</h3><div id="v6Blockers" class="blocker-stack"></div></div><div class="card"><h3>Journal des décisions</h3><div class="grid g2"><label>Décision<input id="decisionText" class="field" placeholder="Ex. retenir la variante compacte"></label><label>Motif<input id="decisionWhy" class="field" placeholder="Pourquoi / sur quelle preuve ?"></label></div><button id="addDecision" class="btn" style="margin-top:10px">Enregistrer la décision</button><div id="decisionLog" style="margin-top:12px"></div></div></div>
    </section>
    <section id="documents" class="page">
      <div class="section-title"><div><span class="section-kicker">10 · DOSSIER</span><h2>Documents, autorisations & preuves</h2></div><p>Chaque pièce a un statut, une priorité et une raison d’être.</p></div>
      <div id="docsSummary" class="grid g4 docs-summary"></div>
      <div class="doc-toolbar no-print" id="docFilters"><button class="seg active" data-doc-filter="all">Tous</button><button class="seg" data-doc-filter="critical">Critiques</button><button class="seg" data-doc-filter="legal">Juridique</button><button class="seg" data-doc-filter="finance">Finance</button><button class="seg" data-doc-filter="technical">Technique</button><button class="seg" data-doc-filter="market">Marché</button></div>
      <div id="docList" class="doc-list"></div>
      <div class="card doc-custom no-print"><h3>Ajouter une pièce personnalisée</h3><div class="grid g3"><label>Document<input id="customDocName" class="field" placeholder="Ex. devis mobilier"></label><label>Catégorie<select id="customDocCat" class="field"><option value="technical">Technique</option><option value="legal">Juridique</option><option value="finance">Finance</option><option value="market">Marché</option><option value="other">Autre</option></select></label><label>Pourquoi<input id="customDocWhy" class="field" placeholder="Utilité / validation attendue"></label></div><button class="btn" id="addCustomDoc" style="margin-top:10px">Ajouter</button></div>
    </section>`);
  }
  const aiK=document.querySelector('#ai .section-kicker');if(aiK)aiK.textContent='12 · FIABILITÉ';
  const dossierK=document.querySelector('#dossier .section-kicker');if(dossierK)dossierK.textContent='11 · LIVRABLE';
  const link=document.createElement('link');link.rel='stylesheet';link.href='v6.css?v=6.0.0';document.head.appendChild(link);
  bindV6Tabs();
}
function bindV6Tabs(){
  document.querySelectorAll('.tab').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
  document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>showPage(b.dataset.jump));
}
function roadmapItems(){
  ensureV6State();
  const c=controls(),items=[];
  const add=(h,title,detail,category='Pilotage',critical=false,owner='Porteur')=>items.push({id:slug(h+'-'+title),h,title,detail,category,critical,owner});
  const notOk=c.filter(x=>x.status!=='OK');
  notOk.slice(0,6).forEach((x,i)=>add('30',x.name,x.action,/budget|CAPEX|Prix|Volume|Marge|Résultat|Point mort|Trésorerie/i.test(x.name)?'Finance':/Juridique|Assurance|droit|PMR|Accès/i.test(x.name)?'Juridique / sécurité':'Validation',x.status==='BLOQUANT',i<2?'Porteur':'Porteur + expert'));
  add('30','Figer le périmètre V1','Écrire ce qui est dans le projet, ce qui est hors périmètre et les critères de réussite.','Cadrage',true);
  add('30','Obtenir 3 références de coûts','Remplacer les gros postes supposés par devis, tarifs fournisseurs ou références comparables.','Finance',true);
  add('30','Tester la demande','Confronter offre, prix et fréquentation à des clients/usagers réels.','Marché',true);
  if(state.ownership==='public'||['square','publicsite','lake','river'].includes(state.site))add('30','Sécuriser l’accord du lieu','Identifier propriétaire/gestionnaire, procédure, durée, conditions et réversibilité.','Juridique / sécurité',true,'Porteur + gestionnaire');
  if(state.type==='food')add('60','Dossier hygiène & exploitation','Formaliser flux propres/sales, eau, froid, déchets, nettoyage et responsabilités.','Technique',true,'Exploitant');
  if(state.type==='event')add('60','Plan sécurité / jauge / secours','Valider jauge, évacuation, barriérage, secours, météo et responsabilités.','Sécurité',true,'Organisateur + autorités');
  if(state.type==='digital')add('60','Prototype testable + mesure','Mettre en ligne une version mesurable et suivre activation, usage, conversion et support.','Produit',false,'Porteur');
  add('60','Boucler le plan de financement','Apport, dette, aides, trésorerie de sécurité et reste à financer.','Finance',true,'Porteur + financeur');
  add('60','Valider le plan fonctionnel','Choisir une variante puis vérifier flux, PMR, exploitation, secours et maintenance.','Technique',true,'Porteur + technicien');
  add('60','Préparer fournisseurs & alternatives','Sécuriser les fournisseurs critiques et au moins un plan B.','Achats',false);
  add('90','Obtenir les validations écrites','Aucune dépense irréversible sans les accords, assurances et autorisations critiques.','Juridique / sécurité',true);
  add('90','Passer en budget d’exécution','Remplacer le prévisionnel par commandes/devis et une réserve d’aléas explicite.','Finance',true);
  add('90','Réaliser un test grandeur réelle','Pilote, journée test, soft opening ou simulation opérationnelle selon le projet.','Exploitation',true);
  add('90','GO final documenté','Réunir G0→G5, risques résiduels, financement, documents et responsables avant lancement.','Décision',true);
  return items.filter((x,i,a)=>a.findIndex(y=>y.id===x.id)===i);
}
function roadmapStatus(id){return state.workflow.roadmap[id]||'todo'};
function roadmapProgress(items){const score={todo:0,doing:.5,done:1};return Math.round(items.reduce((s,x)=>s+(score[roadmapStatus(x.id)]||0),0)/Math.max(1,items.length)*100)}
function renderRoadmap(){
  ensureV6State();const sum=$('#roadmapSummary'),grid=$('#roadmapGrid');if(!sum||!grid)return;
  const items=roadmapItems(),progress=roadmapProgress(items),done=items.filter(x=>roadmapStatus(x.id)==='done').length,crit=items.filter(x=>x.critical&&roadmapStatus(x.id)!=='done').length,blocks=controls().filter(x=>x.status==='BLOQUANT').length;
  sum.innerHTML=[['Avancement',progress+'%'],['Actions terminées',`${done}/${items.length}`],['Critiques ouvertes',crit],['Bloquants contrôle',blocks]].map(([n,v])=>`<div class="kpi"><span>${esc(n)}</span><strong>${esc(v)}</strong></div>`).join('');
  grid.innerHTML=['30','60','90'].map(h=>{const arr=items.filter(x=>x.h===h);return`<div class="horizon-card"><div class="horizon-head"><h3>${h} jours</h3><span class="pill">${arr.length} actions</span></div><div class="horizon-list">${arr.map(x=>{const st=roadmapStatus(x.id);return`<div class="road-item ${st==='done'?'done':''}"><div class="road-top"><b>${esc(x.title)}</b>${x.critical?'<span class="status block">CRITIQUE</span>':''}</div><p>${esc(x.detail)}</p><div class="road-meta"><span class="pill">${esc(x.category)}</span><span class="pill">${esc(x.owner)}</span></div><select class="status-select" data-road-status="${x.id}"><option value="todo" ${st==='todo'?'selected':''}>À faire</option><option value="doing" ${st==='doing'?'selected':''}>En cours</option><option value="done" ${st==='done'?'selected':''}>Fait</option></select></div>`}).join('')}</div></div>`}).join('');
  $$('[data-road-status]').forEach(s=>s.onchange=()=>{state.workflow.roadmap[s.dataset.roadStatus]=s.value;save(false);renderRoadmap()});
  renderV6Blockers();renderDecisions();
}
function renderV6Blockers(){const el=$('#v6Blockers');if(!el)return;const list=controls().filter(x=>x.status!=='OK').slice(0,8);el.innerHTML=list.length?list.map(x=>`<div class="blocker ${x.status==='ALERTE'?'alert-level':''}"><b>${esc(x.status)} · ${esc(x.name)}</b><p>${esc(x.action)}</p><button class="btn small ghost" data-jump="${actionPage(x.name)}" style="margin-top:8px">Traiter</button></div>`).join(''):'<div class="callout">Aucun blocage interne. Il reste à confirmer les preuves externes.</div>';bindV6Tabs()}
function addDecisionV6(){ensureV6State();const text=$('#decisionText')?.value.trim(),why=$('#decisionWhy')?.value.trim();if(!text)return toast('Ajoute une décision');state.workflow.decisions.unshift({text,why,date:new Date().toLocaleDateString('fr-FR')});$('#decisionText').value='';$('#decisionWhy').value='';save(false);renderDecisions();}
function renderDecisions(){const el=$('#decisionLog');if(!el)return;const d=state.workflow.decisions||[];el.innerHTML=d.length?d.map((x,i)=>`<div class="decision-card"><h4>${esc(x.text)}</h4><p>${esc(x.why||'Motif non documenté')}</p><div class="row" style="margin-top:8px"><span class="pill">${esc(x.date)}</span><button class="btn small bad" data-del-decision="${i}">Suppr.</button></div></div>`).join(''):'<p class="muted">Aucune décision enregistrée.</p>';$$('[data-del-decision]').forEach(b=>b.onclick=()=>{state.workflow.decisions.splice(+b.dataset.delDecision,1);save(false);renderDecisions()})}
function documentTemplates(){
  const d=[
    ['concept','Note de cadrage / concept','other','critical','Fixer périmètre, objectifs et critères de réussite.'],
    ['market','Preuve de demande / étude marché','market','critical','Valider que la demande n’est pas seulement supposée.'],
    ['quotes','Devis / références de coûts','finance','critical','Fiabiliser CAPEX, charges et marge.'],
    ['finance','Plan de financement & trésorerie','finance','critical','Vérifier que le projet peut survivre au lancement.'],
    ['insurance','Attestation / validation assurance','legal','critical','Couvrir activité, responsabilité et site.'],
    ['site-right','Titre, bail, convention ou autorisation du lieu','legal','critical','Prouver le droit d’utiliser le lieu.'],
    ['plan','Plan fonctionnel / implantation','technical','normal','Valider zones, flux, exploitation et sécurité.'],
    ['safety','Analyse sécurité / secours / évacuation','technical','critical','Réduire les risques pour usagers et exploitants.'],
    ['access','Validation accès / PMR / secours','technical','critical','Éviter un blocage d’ouverture ou d’exploitation.'],
    ['suppliers','Liste fournisseurs + alternatives','technical','normal','Réduire dépendance et rupture.'],
    ['planning','Planning d’exécution / dépendances','other','normal','Piloter les délais et tâches critiques.']
  ];
  if(state.ownership==='public'||['square','publicsite','lake','river'].includes(state.site))d.push(['aot','AOT / convention / accord gestionnaire','legal','critical','Sécuriser l’occupation du domaine ou du site public.']);
  if(state.type==='food')d.push(['haccp','Plan hygiène / HACCP / chaîne du froid','technical','critical','Sécuriser l’exploitation alimentaire.'],['licence','Licence / autorisations boissons si concerné','legal','critical','Éviter une exploitation non conforme.']);
  if(state.type==='event')d.push(['event-safety','Dossier sécurité événement / jauge','technical','critical','Valider public, secours et évacuation.'],['vendors','Contrats prestataires critiques','legal','normal','Clarifier responsabilités, horaires et obligations.']);
  if(state.type==='digital')d.push(['privacy','RGPD / politique confidentialité','legal','critical','Sécuriser les données et obligations utilisateurs.'],['metrics','Plan de mesure produit / acquisition','market','normal','Mesurer usage, conversion et viabilité.']);
  if(state.site==='castle')d.push(['heritage','Validation patrimoine / travaux','legal','critical','Vérifier les contraintes spécifiques au site patrimonial.']);
  return d.map(x=>({id:x[0],name:x[1],cat:x[2],priority:x[3],why:x[4]}));
}
let v6DocFilter='all';
function allDocuments(){ensureV6State();return [...documentTemplates(),...state.workflow.customDocs.map((x,i)=>({...x,id:x.id||'custom-'+i,priority:x.priority||'normal'}))]}
function renderDocuments(){
  ensureV6State();const list=$('#docList'),sum=$('#docsSummary');if(!list||!sum)return;const all=allDocuments(),status=id=>state.workflow.documents[id]||'missing';const obtained=all.filter(x=>status(x.id)==='obtained').length,critical=all.filter(x=>x.priority==='critical'&&status(x.id)!=='obtained'&&status(x.id)!=='na').length,progress=Math.round(obtained/Math.max(1,all.filter(x=>status(x.id)!=='na').length)*100),missing=all.filter(x=>status(x.id)==='missing').length;
  sum.innerHTML=[['Complétude',progress+'%'],['Obtenus',`${obtained}/${all.length}`],['Critiques manquants',critical],['À obtenir',missing]].map(([n,v])=>`<div class="kpi"><span>${esc(n)}</span><strong>${esc(v)}</strong></div>`).join('');
  const filtered=all.filter(x=>v6DocFilter==='all'||v6DocFilter==='critical'&&x.priority==='critical'||x.cat===v6DocFilter);
  list.innerHTML=filtered.map(x=>{const st=status(x.id);return`<div class="doc-card"><div><h4>${esc(x.name)}</h4><p>${esc(x.why)}</p><div class="doc-badges"><span class="pill">${esc(x.cat)}</span>${x.priority==='critical'?'<span class="status block">CRITIQUE</span>':''}</div></div><select class="status-select" data-doc-status="${esc(x.id)}"><option value="missing" ${st==='missing'?'selected':''}>À obtenir</option><option value="doing" ${st==='doing'?'selected':''}>En cours</option><option value="obtained" ${st==='obtained'?'selected':''}>Obtenu</option><option value="na" ${st==='na'?'selected':''}>Non concerné</option></select></div>`}).join('')||'<div class="callout">Aucun document dans ce filtre.</div>';
  $$('[data-doc-status]').forEach(s=>s.onchange=()=>{state.workflow.documents[s.dataset.docStatus]=s.value;save(false);renderDocuments()});
  $$('[data-doc-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.docFilter===v6DocFilter);b.onclick=()=>{v6DocFilter=b.dataset.docFilter;renderDocuments()}});
}
function addCustomDocument(){ensureV6State();const name=$('#customDocName')?.value.trim(),cat=$('#customDocCat')?.value||'other',why=$('#customDocWhy')?.value.trim();if(!name)return toast('Ajoute le nom du document');state.workflow.customDocs.push({id:'custom-'+Date.now(),name,cat,why:why||'Pièce ajoutée au dossier.',priority:'normal'});$('#customDocName').value='';$('#customDocWhy').value='';save(false);renderDocuments()}
function exportRoadmap(){const items=roadmapItems(),rows=[['Horizon','Action','Détail','Catégorie','Responsable','Critique','Statut'],...items.map(x=>[x.h+' jours',x.title,x.detail,x.category,x.owner,x.critical?'Oui':'Non',roadmapStatus(x.id)])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(';')).join('\n'),blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=(state.name||'projet')+'-roadmap-v6.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}
function renderBrandRibbon(){const d=$('#dossierContent');if(!d||!state.analysis)return;const old=d.querySelector('.dossier-brand');if(old)old.remove();if(!d.querySelector('.brand-ribbon'))d.insertAdjacentHTML('afterbegin',`<div class="brand-ribbon"><img src="project-lab-360-v6-192.png?v=6" alt=""><div><strong>JLG Project Lab 360</strong><span>Dossier d’ingénierie · V6</span></div></div>`)}
function bindV6Actions(){
  $('#roadmapRefresh')&&($('#roadmapRefresh').onclick=()=>{renderRoadmap();toast('Priorités recalculées')});
  $('#roadmapExport')&&($('#roadmapExport').onclick=exportRoadmap);
  $('#addDecision')&&($('#addDecision').onclick=addDecisionV6);
  $('#addCustomDoc')&&($('#addCustomDoc').onclick=addCustomDocument);
  bindV6Tabs();
}
const V6_oldShowPage=showPage;
showPage=function(id){V6_oldShowPage(id);if(id==='roadmap')renderRoadmap();if(id==='documents')renderDocuments();};
const V6_oldRenderAll=renderAll;
renderAll=function(){ensureV6State();V6_oldRenderAll();renderRoadmap();renderDocuments();renderBrandRibbon();};
const V6_oldRenderDossier=renderDossier;
renderDossier=function(){V6_oldRenderDossier();renderBrandRibbon();};
const V6_oldLoadTest=loadTest;
loadTest=function(){V6_oldLoadTest();ensureV6State();renderRoadmap();renderDocuments();};
const V6_oldAutoTests=window.autoTestsV5;
window.autoTestsV5=function(){V6_oldAutoTests&&V6_oldAutoTests();setTimeout(()=>{const extra=[['Logo V6 visible',!!document.querySelector('.logo-stage img')],['Roadmap 30/60/90',roadmapItems().some(x=>x.h==='30')&&roadmapItems().some(x=>x.h==='60')&&roadmapItems().some(x=>x.h==='90')],['Documents adaptatifs',documentTemplates().length>=11],['État workflow sérialisable',!!JSON.parse(JSON.stringify(state)).workflow]];const target=$('#testResults');if(target)target.insertAdjacentHTML('beforeend',extra.map(([n,ok])=>`<div class="qa-item"><header><b>${esc(n)}</b><span class="status ${ok?'ok':'block'}">${ok?'OK':'ÉCHEC'}</span></header></div>`).join(''))},50)};
function initV6(){ensureV6State();injectV6Shell();bindV6Actions();renderAll();setTimeout(()=>{$('#splash')?.classList.remove('hide');setTimeout(()=>$('#splash')?.classList.add('hide'),1150)},20);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js?v=6.0.0').then(r=>r.update()).catch(()=>{});}
initV6();
