function renderVisualsV5(){
  ensureV5State();
  const zones=allZoneEngineering(),geo=layoutGeometry(zones),layer=state.visual.layer,variant=state.visual.variant;
  const v=V5_VARIANTS[variant]||V5_VARIANTS.balanced;
  $('#planVariantNote').innerHTML=`<b>${esc(v.label)}</b> — ${esc(v.note)}`;
  $('#planLayerLegend').textContent=V5_LAYERS[layer]||'Fonctions';
  $$('[data-variant]').forEach(b=>b.classList.toggle('active',b.dataset.variant===variant));
  $$('[data-layer]').forEach(b=>b.classList.toggle('active',b.dataset.layer===layer));
  const svgParts=geo.map((o,i)=>{
    const z=o.z,fill=zoneFill(z,i),label=z.name.length>21?z.name.slice(0,19)+'…':z.name;
    const metric=layer==='cost'?fmt(z.cost):layer==='risk'?`risque ${z.risk}/100`:`${z.p}% du programme`;
    return `<g class="zone-hit ${i===state.visual.selectedZone?'selected':''}" data-zone="${i}" tabindex="0" role="button" aria-label="${esc(z.name)}">
      <rect class="zone-rect" x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" rx="15" fill="${fill}" stroke="#41637e" stroke-width="2"/>
      <text class="zone-label" x="${o.x+16}" y="${o.y+31}" fill="#f1f7fb" font-size="15">${esc(label)}</text>
      <text class="zone-percent" x="${o.x+16}" y="${o.y+54}" font-size="12">${esc(metric)}</text>
    </g>`;
  }).join('');
  const arrows=layer==='flow'?`<path class="flow-line" d="M420 62 V418"/><path d="M413 400 L420 418 L427 400" fill="#57a9f6"/>
    <text x="384" y="235" transform="rotate(-90 384 235)" fill="#8bc5ee" font-size="12">FLUX PRINCIPAL</text>`:
    `<path d="M420 70 V412" stroke="#244c69" stroke-width="3" stroke-dasharray="7 8"/><text x="430" y="240" fill="#6f9ab7" font-size="11">liaison / flux</text>`;
  $('#layoutSvg').innerHTML=`<svg viewBox="0 0 840 480" role="img" aria-label="Plan fonctionnel interactif">${svgParts}${arrows}</svg>`;
  $('#surfaceTable').innerHTML=zones.map((z,i)=>`<button class="surface-chip ${i===state.visual.selectedZone?'active':''}" data-zone-chip="${i}">${esc(z.name)} · ${z.p}%</button>`).join('');
  $$('.zone-hit').forEach(g=>{
    const open=()=>renderZoneInspector(Number(g.dataset.zone));
    g.addEventListener('click',open);g.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open()}});
  });
  $$('[data-zone-chip]').forEach(b=>b.onclick=()=>renderZoneInspector(Number(b.dataset.zoneChip)));
  renderZoneInspector(state.visual.selectedZone);
  renderVisualBriefsV5();
}
function renderVisualBriefsV5(){
  const briefs=[
    ['▦','Plan 2D','Plan fonctionnel coté à produire à partir du programme de surfaces, avec entrées, sorties, secours, PMR, flux public et flux service.'],
    ['✎','Croquis concept','Croquis d’intention montrant l’expérience, les zones, les circulations et l’intégration au site.'],
    ['◇','Rendu 3D','Vue réaliste cohérente avec le lieu, les matériaux, la capacité et les contraintes déjà identifiées.'],
    ['⇄','Avant / après','Comparatif du site avant et après aménagement, en conservant les éléments réellement existants.'],
    ['▥','Infographie','Synthèse une page : concept, chiffres, planning, risques, décision et prochaines actions.'],
    ['▶','Storyboard vidéo','Séquence 8 plans : contexte, arrivée, entrée, parcours, activité, service, sécurité, conclusion.']
  ];
  $('#visualBriefs').innerHTML=briefs.map(([ic,n,t],i)=>`<button class="card visual-brief-card" data-visual-brief="${i}" style="text-align:left;color:inherit"><span class="brief-icon">${ic}</span><h3>${esc(n)}</h3><p class="muted">${esc(t)}</p><span class="pill">Préparer le brief →</span></button>`).join('');
  $$('[data-visual-brief]').forEach(b=>b.onclick=()=>openVisualBrief(Number(b.dataset.visualBrief),briefs));
}
function openVisualBrief(i,briefs){
  const [ic,name,desc]=briefs[i],zones=variantSurfaces(),detail=$('#visualActionDetail');if(!detail)return;
  const prompt=`${name.toUpperCase()} — ${state.name||'Projet'}\n\nContexte : ${labels[state.type]||state.type} · ${siteLabels[state.site]||state.site} · ${state.location||'lieu à définir'}.\nObjectif : ${state.goal||'à définir'}.\nConcept : ${state.idea||'à compléter'}.\nVariante d’implantation : ${V5_VARIANTS[state.visual.variant].label}.\nProgramme : ${zones.map(x=>`${x[0]} ${x[1]}%`).join(' ; ')}.\n\nLivrable demandé : ${desc}\nExigences : respecter les données connues, ne pas inventer les dimensions non fournies, distinguer hypothèses et faits, préserver sécurité/PMR/flux et rendre le résultat lisible professionnellement.`;
  detail.classList.remove('hidden');detail.innerHTML=`<div class="card-head"><div><span class="eyebrow">BRIEF VISUEL</span><h3>${ic} ${esc(name)}</h3></div><button class="btn small ghost" id="closeVisualBrief">Fermer</button></div><pre id="visualPrompt">${esc(prompt)}</pre><div class="row"><button class="btn primary" id="copyVisualPrompt">Copier le brief</button><button class="btn ghost" id="sendVisualToAi">Ajouter au brief IA</button></div>`;
  $('#closeVisualBrief').onclick=()=>detail.classList.add('hidden');
  $('#copyVisualPrompt').onclick=async()=>{try{await navigator.clipboard.writeText(prompt);toast('Brief visuel copié')}catch{toast('Copie non autorisée')}};
  $('#sendVisualToAi').onclick=()=>{const base=buildBrief();$('#aiBrief').value=base+`\n\n## Livrable visuel demandé\n${prompt}\n`;showPage('ai');toast('Brief visuel ajouté')};
}

const V5_oldRenderDossier=renderDossier;
renderDossier=function(){
  V5_oldRenderDossier();
  if(!state.analysis)return;
  const d=$('#dossierContent');if(!d)return;
  if(!d.querySelector('.dossier-brand'))d.insertAdjacentHTML('afterbegin',`<div class="dossier-brand"><img src="icon-192.png" alt=""><div><strong>JLG Project Lab 360</strong><span>Dossier d’ingénierie · V5</span></div></div>`);
  if(!d.querySelector('[data-v5-plan-summary]')){
    const zones=variantSurfaces();
    d.insertAdjacentHTML('beforeend',`<div data-v5-plan-summary><h2>Conception fonctionnelle V5</h2><p><b>Variante étudiée :</b> ${esc(V5_VARIANTS[state.visual.variant].label)}. Ce programme reste conceptuel et doit être validé techniquement.</p><table><thead><tr><th>Zone</th><th>Part</th><th>Risque indicatif</th></tr></thead><tbody>${allZoneEngineering().map(z=>`<tr><td>${esc(z.name)}</td><td>${z.p}%</td><td>${z.risk}/100 · ${esc(z.status)}</td></tr>`).join('')}</tbody></table></div>`);
  }
};

const V5_oldShowPage=showPage;
showPage=function(id){
  V5_oldShowPage(id);
  if(id==='dashboard')renderDashboard();
  if(id==='visuals')renderVisualsV5();
};
const V5_oldRenderAll=renderAll;
renderAll=function(){
  ensureV5State();
  V5_oldRenderAll();
  renderDashboard();
  renderVisualsV5();
};
const V5_oldLoadProject=loadProject;
loadProject=function(id){V5_oldLoadProject(id);ensureV5State();renderAll();};
const V5_oldNewProject=newProject;
newProject=function(){V5_oldNewProject();ensureV5State();renderAll();};
loadTest=function(){
  state={id:'test_v5_'+Date.now(),name:'Guinguette du Lac — Test V5',mode:'business',type:'food',site:'lake',ownership:'public',location:'Uzerche, Corrèze',budget:42000,deadline:'2027-05-01',target:'Familles, habitants et touristes',goal:'Créer une activité saisonnière rentable, sûre et attractive',idea:'Créer une guinguette saisonnière au bord d’un lac sur un site public, avec petite restauration, boissons, animations familiales, soirées ponctuelles et privatisations. Ouverture cinq mois par an. Le projet doit rester réversible, léger, accessible et exploitable avec une équipe réduite. Le montage doit sécuriser l’autorisation d’occupation, les accès secours, la sécurité liée à l’eau, le plan météo, les réseaux et la rentabilité.',answers:{capacity:'80 à 120 personnes selon configuration',access:'Accès voiture existant mais accès secours à confirmer',parking:'Parking existant à proximité',networks:'Électricité à proximité, eau et assainissement à confirmer',neighbors:'Habitations à distance moyenne',season:'5 mois actifs',weather:'Plan B encore incomplet',pmr:'Cheminement à vérifier',insurance:'Premier échange assureur à faire'},evidence:[],analysis:null,finance:{avgPrice:19,qty:1150,margin:66,extraRevenue:1800,variableExtra:850,activeMonths:5,rent:650,staff:6200,marketing:900,utilities:750,debt:680,otherOpex:900,capexWorks:18000,capexEquip:27000,capexOther:8500,equity:15000,loan:25000,grants:5000},pitchIndex:0,visual:{variant:'balanced',layer:'function',selectedZone:0}};
  fillProject();fillFinance();analyze();showPage('dashboard');toast('Projet test V5 chargé : plusieurs alertes sont volontaires');
};

function bindJumpButtons(){
  $$('[data-jump]').forEach(b=>b.onclick=()=>showPage(b.dataset.jump));
}
function setVariant(v){
  ensureV5State();if(!V5_VARIANTS[v])return;state.visual.variant=v;state.visual.selectedZone=0;save(false);renderVisualsV5();renderDashboard();renderDossier();
}
function setLayer(v){
  ensureV5State();if(!V5_LAYERS[v])return;state.visual.layer=v;save(false);renderVisualsV5();
}
function bindV5Controls(){
  $$('[data-variant]').forEach(b=>b.onclick=()=>setVariant(b.dataset.variant));
  $$('[data-layer]').forEach(b=>b.onclick=()=>setLayer(b.dataset.layer));
  $('#heroAnalyzeBtn').onclick=()=>{analyze();showPage('dashboard')};
  $('#heroTestBtn').onclick=loadTest;
  $('#testBtn').onclick=loadTest;
  $('#homeBrand').onclick=()=>showPage('project');
  $('#dossierType').onchange=renderDossier;
  bindJumpButtons();
}
function autoTestsV5(){
  const results=[],test=(n,fn)=>{try{results.push([n,!!fn(),null])}catch(e){results.push([n,false,e.message])}},backup=JSON.parse(JSON.stringify(state));
  ensureV5State();
  test('Calcul central sans NaN',()=>Object.values(calcFinance()).every(x=>Number.isFinite(x)));
  test('Scénario prudent calculable',()=>Number.isFinite(calcFinance({qty:.7,price:.95,margin:.92,opex:1.08}).profit));
  test('Stress-test 2 000 itérations',()=>{runStressTest();return Number.isFinite(state.finance.stress.median)});
  test('Projection 12 mois',()=>{renderCash();return state.finance.cashRows.length===12});
  test('Au moins 25 contrôles',()=>controls().length>=25);
  test('6 portes G0-G5',()=>gates().length===6&&gates()[5].code==='G5');
  test('Risques tous scorés',()=>risks().every(r=>Number.isFinite(r.score)));
  test('5 variantes de plan',()=>Object.keys(V5_VARIANTS).length===5);
  test('4 couches interactives',()=>Object.keys(V5_LAYERS).length===4);
  test('Programme de surfaces = 100%',()=>variantSurfaces().reduce((a,x)=>a+x[1],0)===100);
  test('Fiches ingénierie pour chaque zone',()=>allZoneEngineering().length===variantSurfaces().length&&allZoneEngineering().every(z=>z.actions.length&&z.constraints.length));
  test('Plan SVG interactif rendu',()=>{renderVisualsV5();return $$('.zone-hit').length===variantSurfaces().length});
  test('Cockpit V5 rendu',()=>{renderDashboard();return !!$('#cockpitHero').textContent.trim()});
  test('Brief IA généré',()=>buildBrief().includes('# Mission IA'));
  test('Dossier V5 avec identité',()=>{renderDossier();return !!$('#dossierContent .dossier-brand')});
  test('Sérialisation état V5',()=>JSON.parse(JSON.stringify(state)).visual.variant===state.visual.variant);
  state=backup;ensureV5State();fillProject();fillFinance();renderAll();
  $('#testResults').innerHTML=`<div class="callout ${results.every(x=>x[1])?'':'bad'}"><b>${results.filter(x=>x[1]).length}/${results.length} tests réussis</b></div>`+results.map(([n,ok,e])=>`<div class="qa-item"><header><b>${esc(n)}</b><span class="status ${ok?'ok':'block'}">${ok?'OK':'ÉCHEC'}</span></header>${e?`<p>${esc(e)}</p>`:''}</div>`).join('');
  toast(`${results.filter(x=>x[1]).length}/${results.length} tests réussis`);
}

function initInstallPrompt(){
  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();deferred=e;
    if($('#installAppBtn'))return;
    const b=document.createElement('button');b.id='installAppBtn';b.className='btn small primary';b.textContent='Installer';
    $('.top-actions').prepend(b);
    b.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;b.remove()};
  });
}
function refreshSW(){
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js?v=5').then(reg=>reg.update()).catch(()=>{});
  }
}

ensureV5State();
bindV5Controls();
$('#autoTestBtn').onclick=autoTestsV5;
renderAll();
renderDossier();
initInstallPrompt();
refreshSW();
setTimeout(()=>$('#splash')?.classList.add('hide'),850);
