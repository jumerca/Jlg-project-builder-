/* JLG Project Lab 360 — V10.9 interaction, location, PDF and Android delivery layer */
(()=>{
  const VERSION='10.9.0';
  const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
  const nativeAndroid=/JLGProjectLabAndroid/i.test(navigator.userAgent||'')||new URLSearchParams(location.search).get('source')==='android-app';
  const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
  const txt=s=>String(s??'').replace(/\s+/g,' ').trim();

  function ensureV109State(){
    state.profile=state.profile||{};
    state.profile.kind=state.profile.kind||'Entreprise / organisation';
    state.profile.organization=state.profile.organization||'';
    state.profile.contact=state.profile.contact||'';
    state.profile.email=state.profile.email||'';
    state.profile.phone=state.profile.phone||'';
    state.profile.address=state.profile.address||'';
    state.profile.logoData=state.profile.logoData||'';
    state.place=state.place||{};
    state.place.name=state.place.name||'';
    state.place.address=state.place.address||'';
    state.place.postcode=state.place.postcode||'';
    state.place.detail=state.place.detail||'';
  }

  function isDemo(){return !!state.demo||/guinguette du lac|test v[0-9]|projet test/i.test(state.name||'')}
  function setDemoFlag(){if(isDemo())state.demo=true}

  function injectStyle(){
    if(document.querySelector('link[data-v109-css]'))return;
    const l=document.createElement('link');l.rel='stylesheet';l.href='./v10-9.css?v='+VERSION;l.dataset.v109Css='1';document.head.appendChild(l);
  }

  function injectProjectMeta(){
    ensureV109State();
    const project=$('#project');if(!project||$('#v109ProjectMeta'))return;
    const cadrage=project.querySelector('.card.grid.g2');if(!cadrage)return;
    cadrage.insertAdjacentHTML('afterend',`<div id="v109ProjectMeta" class="card v109-meta-card">
      <div class="card-head"><div><span class="eyebrow">LIEU & IDENTITÉ DU DOSSIER</span><h3>Choisir précisément le projet</h3></div><span class="pill">V10.9</span></div>
      <p class="muted">La ville du champ « Ville / territoire » pilote Territoire live. Ici tu peux préciser le site exact et l’identité qui apparaîtra sur les PDF.</p>
      <div class="grid g2">
        <label>Nom du lieu / site<input id="v109PlaceName" class="field" placeholder="Ex. Ancienne halle, parc municipal, local rue..." /></label>
        <label>Code postal<input id="v109Postcode" class="field" inputmode="numeric" placeholder="19140" /></label>
        <label style="grid-column:1/-1">Adresse exacte ou repère<input id="v109Address" class="field" placeholder="Adresse, parcelle, bâtiment, lieu-dit..." /></label>
        <label style="grid-column:1/-1">Précisions sur le lieu<textarea id="v109PlaceDetail" class="field" placeholder="Surface, étage, accès, propriétaire, références cadastrales si connues..."></textarea></label>
      </div>
      <div class="separator"></div>
      <div class="grid g2">
        <label>Type d’émetteur<select id="v109ProfileKind" class="field"><option>Entreprise / organisation</option><option>Particulier</option><option>Association</option><option>Collectivité</option></select></label>
        <label>Entreprise / structure<input id="v109Organization" class="field" placeholder="Nom de l’entreprise ou structure" /></label>
        <label>Nom du contact<input id="v109Contact" class="field" placeholder="Nom et prénom" /></label>
        <label>Téléphone<input id="v109Phone" class="field" inputmode="tel" /></label>
        <label>E-mail<input id="v109Email" class="field" inputmode="email" /></label>
        <label>Adresse de l’émetteur<input id="v109ProfileAddress" class="field" /></label>
        <label style="grid-column:1/-1">Logo pour les documents<input id="v109LogoFile" type="file" class="field" accept="image/png,image/jpeg,image/webp" /><span class="muted mini">Optionnel. Le logo reste uniquement sur cet appareil.</span></label>
      </div>
      <div id="v109LogoPreview" class="v109-logo-preview"></div>
    </div>`);
    fillV109Meta();bindMeta();renderDemoBanner();
  }

  function fillV109Meta(){
    ensureV109State();
    const set=(id,v)=>{const e=$(id);if(e&&document.activeElement!==e)e.value=v||''};
    set('#v109PlaceName',state.place.name);set('#v109Postcode',state.place.postcode);set('#v109Address',state.place.address);set('#v109PlaceDetail',state.place.detail);
    set('#v109ProfileKind',state.profile.kind);set('#v109Organization',state.profile.organization);set('#v109Contact',state.profile.contact);set('#v109Phone',state.profile.phone);set('#v109Email',state.profile.email);set('#v109ProfileAddress',state.profile.address);
    const p=$('#v109LogoPreview');if(p)p.innerHTML=state.profile.logoData?`<img src="${state.profile.logoData}" alt="Logo du dossier"><button class="btn small ghost" id="v109RemoveLogo" type="button">Retirer le logo</button>`:'<span class="muted mini">Aucun logo personnalisé.</span>';
    $('#v109RemoveLogo')&&($('#v109RemoveLogo').onclick=()=>{state.profile.logoData='';save(false);fillV109Meta()});
  }

  function readV109Meta(){
    ensureV109State();
    const val=id=>$(id)?.value?.trim()||'';
    if($('#v109PlaceName'))state.place.name=val('#v109PlaceName');
    if($('#v109Postcode'))state.place.postcode=val('#v109Postcode');
    if($('#v109Address'))state.place.address=val('#v109Address');
    if($('#v109PlaceDetail'))state.place.detail=val('#v109PlaceDetail');
    if($('#v109ProfileKind'))state.profile.kind=val('#v109ProfileKind')||state.profile.kind;
    if($('#v109Organization'))state.profile.organization=val('#v109Organization');
    if($('#v109Contact'))state.profile.contact=val('#v109Contact');
    if($('#v109Phone'))state.profile.phone=val('#v109Phone');
    if($('#v109Email'))state.profile.email=val('#v109Email');
    if($('#v109ProfileAddress'))state.profile.address=val('#v109ProfileAddress');
  }

  function bindMeta(){
    ['v109PlaceName','v109Postcode','v109Address','v109PlaceDetail','v109ProfileKind','v109Organization','v109Contact','v109Phone','v109Email','v109ProfileAddress'].forEach(id=>{
      const e=$('#'+id);if(!e)return;e.onchange=()=>{readV109Meta();save(false);renderDemoBanner()};
    });
    const logo=$('#v109LogoFile');if(logo)logo.onchange=e=>{
      const f=e.target.files?.[0];if(!f)return;if(f.size>1800000){toast('Logo trop lourd : choisis une image de moins de 1,8 Mo.');e.target.value='';return}
      const r=new FileReader();r.onload=()=>{state.profile.logoData=String(r.result||'');save(false);fillV109Meta();toast('Logo ajouté aux futurs PDF')};r.readAsDataURL(f);
    };
  }

  const oldReadProject=window.readProject;
  if(typeof oldReadProject==='function')window.readProject=function(){oldReadProject();readV109Meta();setDemoFlag()};
  const oldFillProject=window.fillProject;
  if(typeof oldFillProject==='function')window.fillProject=function(){oldFillProject();ensureV109State();fillV109Meta();renderDemoBanner()};

  function renderDemoBanner(){
    const project=$('#project'),hero=project?.querySelector('.hero-brand');if(!project||!hero)return;
    let b=$('#v109DemoBanner');
    if(!isDemo()){b?.remove();return}
    if(!b){b=document.createElement('div');b.id='v109DemoBanner';b.className='callout warn v109-demo';hero.insertAdjacentElement('beforebegin',b)}
    b.innerHTML='<b>Mode exemple - Guinguette.</b> Ce lieu et ces chiffres servent uniquement de démonstration. <button class="btn small primary" id="v109BlankProject" type="button">Créer mon projet vierge</button>';
    $('#v109BlankProject').onclick=()=>{newProject();state.demo=false;ensureV109State();fillV109Meta();renderDemoBanner();setTimeout(goCadrage,80)};
  }

  function goCadrage(){
    showPage('project');
    const t=$('#project .section-title');(t||$('#name'))?.scrollIntoView({behavior:'smooth',block:'start'});
    setTimeout(()=>$('#name')?.focus({preventScroll:true}),320);
    toast('Cadrage ouvert : renseigne ton projet et son lieu.');
  }

  function routeFor(name=''){
    if(/budget|capex|prix|volume|marge|résultat|point mort|trésorerie|finance/i.test(name))return'finance';
    if(/marché|preuve|juridique|assurance/i.test(name))return /marché/i.test(name)?'documents':'ai';
    if(/accès|pmr|plan b|questionnaire|droit d.usage|site/i.test(name))return'questions';
    if(/territoire|lieu|échéance|concept/i.test(name))return'project';
    if(/humain|charge/i.test(name))return'execution';
    return'control';
  }
  function expectedDoc(name=''){
    const n=name.toLowerCase();
    if(/concept/.test(n))return'Note de cadrage / concept';if(/territoire/.test(n))return'Fiche territoire et localisation';if(/type de site/.test(n))return'Fiche descriptive du site';
    if(/droit d.usage|preuve du droit/.test(n))return'Titre, bail, convention, AOT ou accord écrit';if(/budget|capex/.test(n))return'Budget d’investissement + devis';
    if(/prix|volume|marge|marché/.test(n))return'Étude marché / test clients / justificatifs de prix';if(/résultat|point mort|trésorerie|financer/.test(n))return'Prévisionnel financier et plan de financement';
    if(/juridique/.test(n))return'Validation juridique / autorisation compétente';if(/assurance/.test(n))return'Attestation ou validation écrite de l’assureur';
    if(/accès|pmr/.test(n))return'Plan d’accès / diagnostic PMR / avis technique';if(/plan b|continuité/.test(n))return'Plan de continuité / plan météo';if(/humain|charge/.test(n))return'Plan de charge et organisation humaine';
    if(/échéance/.test(n))return'Planning d’exécution';return'Fiche de validation / preuve associée';
  }
  function controlReason(x){
    if(x.status==='OK')return 'Le moteur considère ce point couvert avec les informations actuellement saisies. Ouvre cette fiche pour vérifier la donnée qui justifie le vert et conserver une trace PDF.';
    if(x.status==='ALERTE')return 'Le projet peut continuer, mais ce point reste insuffisamment prouvé. Il doit être sécurisé avant de considérer le dossier comme complet.';
    return 'Ce point peut empêcher un vrai GO. Tant que la preuve ou l’action demandée n’est pas obtenue, Project Lab le garde comme bloquant.';
  }
  function statusClass(st){return st==='OK'?'ok':st==='ALERTE'?'alert':'block'}
  function detailHost(pageId){
    const page=$('#'+pageId);if(!page)return null;let p=page.querySelector('.v109-detail');if(!p){p=document.createElement('div');p.className='card v109-detail hidden';const title=page.querySelector('.section-title');title?.insertAdjacentElement('afterend',p)}return p;
  }
  function showDetail(pageId,html){const p=detailHost(pageId);if(!p)return;p.innerHTML=html;p.classList.remove('hidden');setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'center'}),30);p.querySelector('[data-v109-close]')?.addEventListener('click',()=>p.classList.add('hidden'))}

  function showControlDetail(index,pageId='control'){
    const c=controls(),x=c[index];if(!x)return;const route=routeFor(x.name),doc=expectedDoc(x.name);
    showDetail(pageId,`<div class="card-head"><div><span class="eyebrow">CONTRÔLE ${String(index+1).padStart(2,'0')}</span><h3>${safe(x.name)}</h3></div><span class="status ${statusClass(x.status)}">${x.status}</span></div>
      <p>${safe(controlReason(x))}</p><div class="v109-detail-grid"><div><span>Ce que Project Lab demande</span><b>${safe(x.action)}</b></div><div><span>Preuve / document attendu</span><b>${safe(doc)}</b></div></div>
      <div class="callout ${x.status==='OK'?'':'warn'}"><b>${x.status==='OK'?'Point validé actuellement':'À faire maintenant'}</b><br>${safe(x.status==='OK'?'Conserver la preuve et vérifier qu’elle reste valable jusqu’au lancement.':x.action)}</div>
      <div class="row no-print"><button class="btn primary" data-v109-route="${route}">Aller au bon onglet</button><button class="btn" data-v109-pdf-control="${index}">Télécharger la fiche PDF</button>${x.status!=='OK'?'<button class="btn ghost" data-v109-proof>Ajouter une preuve</button>':''}<button class="btn ghost" data-v109-close>Fermer</button></div>`);
    const host=detailHost(pageId);host.querySelector('[data-v109-route]')?.addEventListener('click',e=>showPage(e.currentTarget.dataset.v109Route));
    host.querySelector('[data-v109-pdf-control]')?.addEventListener('click',()=>downloadControlPdf(index));
    host.querySelector('[data-v109-proof]')?.addEventListener('click',()=>{showPage('ai');setTimeout(()=>$('#evidenceLabel')?.focus(),150)});
  }

  const baseRenderControl=window.renderControl;
  if(typeof baseRenderControl==='function')window.renderControl=function(){
    if(!state.analysis){baseRenderControl();return}
    const c=controls(),blocks=c.filter(x=>x.status==='BLOQUANT').length,alerts=c.filter(x=>x.status==='ALERTE').length,score=Math.round(c.reduce((s,x)=>s+(x.status==='OK'?1:x.status==='ALERTE'?.4:0),0)/Math.max(1,c.length)*100);
    $('#readyScore').textContent=score+'/100';$('#readyBar').style.width=score+'%';$('#blockCount').textContent=blocks;$('#alertCount').textContent=alerts;
    $('#controlList').innerHTML=c.map((x,i)=>`<button class="qa-item v109-click-card" data-v109-control="${i}" type="button"><header><b>${String(i+1).padStart(2,'0')} · ${safe(x.name)}</b><span class="status ${statusClass(x.status)}">${x.status}</span></header><p>${safe(x.action)}</p><span class="v109-open">Voir pourquoi, quoi faire et le document attendu →</span></button>`).join('');
    $$('[data-v109-control]').forEach(b=>b.onclick=()=>showControlDetail(Number(b.dataset.v109Control),'control'));
  };

  function showRiskDetail(index,pageId='risks'){
    const r=risks()[index];if(!r)return;const score=r.score>=35?'Élevé':r.score>=20?'À surveiller':'Maîtrisé';
    showDetail(pageId,`<div class="card-head"><div><span class="eyebrow">RISQUE ${String(index+1).padStart(2,'0')}</span><h3>${safe(r.name)}</h3></div><span class="status ${r.score>=35?'block':r.score>=20?'alert':'ok'}">${score}</span></div><div class="v109-detail-grid"><div><span>Probabilité</span><b>${r.p}%</b></div><div><span>Gravité</span><b>${r.s}%</b></div><div><span>Maîtrise actuelle</span><b>${r.m}%</b></div><div><span>Score</span><b>${r.score}</b></div></div><div class="callout warn"><b>Mesure recommandée</b><br>${safe(r.mit)}</div><div class="row no-print"><button class="btn primary" data-v109-risk-pdf="${index}">Télécharger la fiche PDF</button><button class="btn ghost" data-v109-risk-pilot>Pilotage</button><button class="btn ghost" data-v109-close>Fermer</button></div>`);
    const h=detailHost(pageId);h.querySelector('[data-v109-risk-pdf]')?.addEventListener('click',()=>downloadRiskPdf(index));h.querySelector('[data-v109-risk-pilot]')?.addEventListener('click',()=>showPage('pilot'));
  }
  function gateExplanation(g){
    const m={G0:'Vérifie que l’intention, la cible et la proposition de valeur sont suffisamment définies.',G1:'Vérifie que le lieu peut réellement accueillir le projet et que le droit d’usage est sécurisé.',G2:'Vérifie que la demande, le prix et le volume sont soutenus par des preuves de marché.',G3:'Vérifie les autorisations, assurances, accès, PMR et sécurité.',G4:'Vérifie la rentabilité, le scénario prudent, la trésorerie et le financement.',G5:'Synthèse finale : confiance, viabilité et risques résiduels avant lancement.'};return m[g.code]||'Porte de décision du projet.'
  }
  function showGateDetail(index,pageId='pilot'){
    const g=gates()[index];if(!g)return;const missing=controls().filter(x=>x.status!=='OK').slice(0,5);
    showDetail(pageId,`<div class="card-head"><div><span class="eyebrow">PORTE ${g.code}</span><h3>${safe(g.name)}</h3></div><span class="status ${g.status==='GO'?'ok':g.status==='CONDITIONNEL'?'alert':'block'}">${g.status}</span></div><p>${safe(gateExplanation(g))}</p><div class="v109-score-big">${g.score}/100</div><div class="callout ${g.status==='GO'?'':'warn'}"><b>${g.status==='GO'?'Ce qui est bon':'Pour progresser'}</b><br>${safe(g.status==='GO'?'Les critères calculés sont suffisamment couverts. Conserve les preuves et vérifie leur validité.':missing.map(x=>x.name+' : '+x.action).join(' · '))}</div><div class="row no-print"><button class="btn primary" data-v109-gate-control>Voir les contrôles</button><button class="btn" data-v109-gate-pdf="${index}">Télécharger la fiche PDF</button><button class="btn ghost" data-v109-close>Fermer</button></div>`);
    const h=detailHost(pageId);h.querySelector('[data-v109-gate-control]')?.addEventListener('click',()=>showPage('control'));h.querySelector('[data-v109-gate-pdf]')?.addEventListener('click',()=>downloadGatePdf(index));
  }

  function decorateDashboard(){
    $$('#miniRisks .mini-risk').forEach((e,i)=>{e.classList.add('v109-click-card');e.tabIndex=0;e.onclick=()=>showRiskDetail(i,'dashboard')});
    $$('#miniGates .mini-gate').forEach((e,i)=>{e.classList.add('v109-click-card');e.tabIndex=0;e.onclick=()=>showGateDetail(i,'dashboard')});
    $$('#cockpitKpis .kpi').forEach((e,i)=>{if(i===3){e.classList.add('v109-click-card');e.onclick=()=>showRiskDetail(0,'dashboard')}});
  }
  const baseDashboard=window.renderDashboard;if(typeof baseDashboard==='function')window.renderDashboard=function(){baseDashboard();decorateDashboard()};
  const baseRisks=window.renderRisks;if(typeof baseRisks==='function')window.renderRisks=function(){baseRisks();if(!state.analysis)return;$$('#riskList .risk').slice(1).forEach((e,i)=>{e.classList.add('v109-click-card');e.tabIndex=0;e.onclick=()=>showRiskDetail(i,'risks')})};
  const basePilot=window.renderPilot;if(typeof basePilot==='function')window.renderPilot=function(){basePilot();if(!state.analysis)return;$$('#gateList .gate').forEach((e,i)=>{e.classList.add('v109-click-card');e.tabIndex=0;e.onclick=()=>showGateDetail(i,'pilot')});if(!$('#v109PilotHelp'))$('#gateList')?.insertAdjacentHTML('beforebegin','<div id="v109PilotHelp" class="callout"><b>Comment lire le pilotage ?</b> Chaque porte G0→G5 est cliquable. Elle explique son rôle, son score et ce qu’il faut faire pour passer au niveau suivant. Les barres du planning sont un séquencement indicatif, pas des dates contractuelles.</div>')};

  const V109_VISUALS=[
    ['Plan 2D','Schéma fonctionnel exploitable : zones, flux, accès, secours et surfaces.'],['Croquis concept','Cahier d’intention pour organiser expérience, ambiance et implantation.'],['Rendu 3D','Cahier de rendu réaliste. Sans moteur IA externe, Project Lab prépare le brief et les contraintes mais ne fabrique pas une image photoréaliste.'],['Avant / après','Cahier comparatif de transformation du site, en distinguant existant et projeté.'],['Infographie','Synthèse une page du projet : décision, chiffres, risques et actions.'],['Storyboard vidéo','Séquence de 8 plans pour présenter le projet de manière claire et cohérente.']
  ];
  function visualPrompt(i){const [name,desc]=V109_VISUALS[i],zones=typeof variantSurfaces==='function'?variantSurfaces():[];return `${name.toUpperCase()} - ${state.name||'Projet'}\nLieu : ${state.place?.name||state.location||'à définir'} ${state.place?.address?'- '+state.place.address:''}\nConcept : ${state.idea||'à compléter'}\nObjectif : ${state.goal||'à définir'}\nProgramme : ${zones.map(x=>x[0]+' '+x[1]+'%').join(' ; ')}\nLivrable : ${desc}\nContraintes : distinguer faits et hypothèses, ne pas inventer de dimensions, conserver PMR, sécurité, flux public/service et intégration réelle au site.`}
  function openVisual109(i){
    const d=$('#visualActionDetail');if(!d)return;const [name,desc]=V109_VISUALS[i],p=visualPrompt(i);d.classList.remove('hidden');d.innerHTML=`<div class="card-head"><div><span class="eyebrow">LIVRABLE VISUEL</span><h3>${safe(name)}</h3></div><button class="btn small ghost" data-v109-visual-close>Fermer</button></div><p>${safe(desc)}</p>${i===0?'<div class="v109-plan-preview" id="v109PlanPreview"></div>':''}<pre class="v109-brief">${safe(p)}</pre><div class="row no-print"><button class="btn primary" data-v109-visual-pdf="${i}">Télécharger PDF</button>${i===0?'<button class="btn" data-v109-plan-svg>Télécharger SVG</button>':''}<button class="btn ghost" data-v109-visual-ai>Préparer le brief IA</button></div>`;
    if(i===0){const svg=$('#layoutSvg svg');if(svg)$('#v109PlanPreview').innerHTML=svg.outerHTML}
    d.querySelector('[data-v109-visual-close]').onclick=()=>d.classList.add('hidden');
    d.querySelector('[data-v109-visual-pdf]').onclick=()=>downloadVisualPdf(i);
    d.querySelector('[data-v109-plan-svg]')&&(d.querySelector('[data-v109-plan-svg]').onclick=()=>{const svg=$('#layoutSvg svg');if(svg)downloadText((slug(state.name)||'projet')+'-plan.svg',svg.outerHTML,'image/svg+xml')});
    d.querySelector('[data-v109-visual-ai]').onclick=()=>{showPage('syncfinal');setTimeout(()=>{const t=$('#v10AiPrompt');if(t)t.value=p},150)};
    d.scrollIntoView({behavior:'smooth',block:'center'});
  }
  function bindVisuals(){
    $$('[data-visual-brief]').forEach((b,i)=>{b.onclick=()=>openVisual109(Number(b.dataset.visualBrief??i));b.classList.add('v109-click-card')});
  }
  const baseVisuals=window.renderVisualsV5;if(typeof baseVisuals==='function')window.renderVisualsV5=function(){baseVisuals();bindVisuals()};

  function decorateDocuments(){
    if(typeof allDocuments!=='function')return;const all=allDocuments(),filtered=all.filter(x=>typeof v6DocFilter==='undefined'||v6DocFilter==='all'||v6DocFilter==='critical'&&x.priority==='critical'||x.cat===v6DocFilter);
    $$('#docList .doc-card').forEach((card,i)=>{const doc=filtered[i];if(!doc||card.querySelector('[data-v109-doc-pdf]'))return;const b=document.createElement('button');b.className='btn small ghost';b.type='button';b.dataset.v109DocPdf=doc.id;b.textContent='PDF / modèle';b.onclick=()=>downloadDocumentPdf(doc.id);card.appendChild(b)});
  }
  const baseDocuments=window.renderDocuments;if(typeof baseDocuments==='function')window.renderDocuments=function(){baseDocuments();decorateDocuments()};

  function renameDeliverables(){
    const map={downloadDecisionSvg:'Télécharger PDF',downloadRiskSvg:'Télécharger PDF',downloadPlanSvg:'Télécharger PDF',downloadRoadmapV8:'Télécharger PDF',printDossierV8:'Télécharger le dossier PDF'};
    Object.entries(map).forEach(([id,label])=>{const b=$('#'+id);if(b)b.textContent=label});
    $('#downloadDecisionSvg')&&($('#downloadDecisionSvg').onclick=()=>downloadPdfType('decision'));
    $('#downloadRiskSvg')&&($('#downloadRiskSvg').onclick=()=>downloadPdfType('risks'));
    $('#downloadPlanSvg')&&($('#downloadPlanSvg').onclick=()=>downloadPdfType('plan'));
    $('#downloadRoadmapV8')&&($('#downloadRoadmapV8').onclick=()=>downloadPdfType('roadmap'));
    $('#printDossierV8')&&($('#printDossierV8').onclick=()=>downloadPdfType('dossier'));
    const printBtn=$('#dossier .section-title .row .btn');if(printBtn){printBtn.textContent='Télécharger PDF';printBtn.onclick=()=>downloadPdfType('dossier')}
  }

  function splitLines(ctx,text,maxWidth){
    const words=String(text||'').split(/\s+/),lines=[];let line='';for(const w of words){const n=(line+' '+w).trim();if(line&&ctx.measureText(n).width>maxWidth){lines.push(line);line=w}else line=n}if(line)lines.push(line);return lines;
  }
  async function loadImage(src){return new Promise(resolve=>{if(!src)return resolve(null);const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>resolve(null);i.src=src})}
  class CanvasReport{
    constructor(title,subtitle=''){this.title=title;this.subtitle=subtitle;this.pages=[];this.c=null;this.ctx=null;this.y=0;this.brandLogo=null;this.customLogo=null}
    async init(){ensureV109State();this.brandLogo=await loadImage('./project-lab-logo-v10-512.png?v='+VERSION);this.customLogo=await loadImage(state.profile.logoData);this.newPage();return this}
    newPage(){const c=document.createElement('canvas');c.width=1240;c.height=1754;const x=c.getContext('2d');x.fillStyle='#ffffff';x.fillRect(0,0,c.width,c.height);x.fillStyle='#071321';x.fillRect(0,0,c.width,170);x.fillStyle='#d7af55';x.fillRect(0,165,c.width,5);x.fillStyle='#ffffff';x.font='700 34px Arial';x.fillText('JLG PROJECT LAB 360',72,70);x.font='700 25px Arial';x.fillText(this.title,72,116);x.font='18px Arial';x.fillStyle='#c9d6e1';x.fillText(this.subtitle||state.name||'Projet',72,148);if(this.brandLogo)x.drawImage(this.brandLogo,1080,24,100,100);if(this.customLogo)x.drawImage(this.customLogo,950,28,100,100);this.pages.push(c);this.c=c;this.ctx=x;this.y=220;this.footer();}
    footer(){const x=this.ctx;x.fillStyle='#eef2f5';x.fillRect(60,1682,1120,1);x.fillStyle='#6f7f8c';x.font='15px Arial';x.fillText('Généré par JLG Project Lab 360 · '+new Date().toLocaleDateString('fr-FR'),65,1718);const id=[state.profile.organization,state.profile.contact].filter(Boolean).join(' · ');if(id)x.fillText(id,650,1718)}
    ensure(h=80){if(this.y+h>1640)this.newPage()}
    h(text){this.ensure(90);const x=this.ctx;x.fillStyle='#0d334d';x.font='700 30px Arial';x.fillText(String(text),70,this.y);this.y+=48}
    p(text,opt={}){const x=this.ctx;x.font=(opt.bold?'700 ':'')+(opt.size||20)+'px Arial';x.fillStyle=opt.color||'#263847';const lines=splitLines(x,text,1090);this.ensure(lines.length*(opt.line||30)+18);for(const l of lines){x.fillText(l,78,this.y);this.y+=(opt.line||30)}this.y+=12}
    bullet(text){const x=this.ctx;x.font='20px Arial';x.fillStyle='#263847';const lines=splitLines(x,text,1035);this.ensure(lines.length*30+12);x.fillStyle='#d7af55';x.beginPath();x.arc(83,this.y-7,5,0,Math.PI*2);x.fill();x.fillStyle='#263847';for(const l of lines){x.fillText(l,102,this.y);this.y+=30}this.y+=8}
    kv(label,value){this.ensure(70);const x=this.ctx;x.fillStyle='#f2f5f7';x.fillRect(70,this.y-28,1100,60);x.fillStyle='#62788a';x.font='700 16px Arial';x.fillText(label.toUpperCase(),88,this.y-4);x.fillStyle='#152838';x.font='700 22px Arial';const lines=splitLines(x,String(value??'—'),760);x.fillText(lines[0]||'—',390,this.y);this.y+=74}
    notice(title,text,kind='warn'){const x=this.ctx;const bg=kind==='ok'?'#eaf7f0':kind==='bad'?'#fdecec':'#fff7df';const fg=kind==='ok'?'#17643b':kind==='bad'?'#8c2020':'#70530b';x.font='19px Arial';const lines=splitLines(x,text,1020);this.ensure(75+lines.length*28);x.fillStyle=bg;x.fillRect(70,this.y-28,1100,58+lines.length*28);x.fillStyle=fg;x.font='700 20px Arial';x.fillText(title,92,this.y);this.y+=32;x.font='18px Arial';for(const l of lines){x.fillText(l,92,this.y);this.y+=27}this.y+=25}
  }

  function jpegBytes(dataUrl){const b=atob(dataUrl.split(',')[1]),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
  function ascii(s){return new TextEncoder().encode(s)}
  function concat(parts){const n=parts.reduce((s,a)=>s+a.length,0),o=new Uint8Array(n);let p=0;for(const a of parts){o.set(a,p);p+=a.length}return o}
  function canvasesToPdf(canvases){
    const images=canvases.map(c=>jpegBytes(c.toDataURL('image/jpeg',.88))),objects=[null],pageRefs=[];objects[1]=ascii('<< /Type /Catalog /Pages 2 0 R >>');objects[2]=null;let next=3;
    images.forEach((img,i)=>{const page=next++,content=next++,image=next++;pageRefs.push(page);objects[image]=concat([ascii(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.length} >>\nstream\n`),img,ascii('\nendstream')]);const cs=ascii(`q\n595 0 0 842 0 0 cm\n/Im${i+1} Do\nQ`);objects[content]=concat([ascii(`<< /Length ${cs.length} >>\nstream\n`),cs,ascii('\nendstream')]);objects[page]=ascii(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im${i+1} ${image} 0 R >> >> /Contents ${content} 0 R >>`)});
    objects[2]=ascii(`<< /Type /Pages /Kids [${pageRefs.map(x=>x+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`);
    const parts=[ascii('%PDF-1.4\n%JLG\n')],offsets=[0];let pos=parts[0].length;for(let i=1;i<objects.length;i++){offsets[i]=pos;const obj=concat([ascii(`${i} 0 obj\n`),objects[i],ascii('\nendobj\n')]);parts.push(obj);pos+=obj.length}const xrefPos=pos;let x=`xref\n0 ${objects.length}\n0000000000 65535 f \n`;for(let i=1;i<objects.length;i++)x+=String(offsets[i]).padStart(10,'0')+' 00000 n \n';x+=`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;parts.push(ascii(x));return concat(parts)
  }
  function bytesToB64(bytes){let out='';const chunk=0x8000;for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,i+chunk));return btoa(out)}
  function saveBytes(name,bytes,mime){
    if(nativeAndroid&&window.JLGAndroid?.saveBase64File){try{window.JLGAndroid.saveBase64File(name,mime,bytesToB64(bytes));toast('Fichier enregistré dans Téléchargements');return}catch(e){console.warn(e)}}
    const b=new Blob([bytes],{type:mime}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1800)
  }
  function downloadText(name,content,mime='text/plain;charset=utf-8'){saveBytes(name,new TextEncoder().encode(content),mime)}
  async function finishReport(report,name){const bytes=canvasesToPdf(report.pages);saveBytes(name,bytes,'application/pdf')}
  function fileBase(suffix){return (typeof slug==='function'?slug(state.name||'projet'):'projet')+'-'+suffix+'.pdf'}

  async function baseReport(title){readProject();financeInputs();ensureV109State();const r=await new CanvasReport(title,state.name||'Projet').init();r.h('Projet');r.kv('Nom',state.name||'Sans nom');r.kv('Lieu',[state.place.name,state.place.address,state.place.postcode,state.location].filter(Boolean).join(' · ')||'À définir');r.kv('Objectif',state.goal||'À définir');if(state.profile.organization||state.profile.contact){r.h('Émetteur');r.kv('Structure',state.profile.organization||state.profile.kind);r.kv('Contact',state.profile.contact||'—');r.kv('Coordonnées',[state.profile.email,state.profile.phone,state.profile.address].filter(Boolean).join(' · ')||'—')}return r}
  async function downloadControlPdf(i){const x=controls()[i];if(!x)return;const r=await baseReport('Fiche contrôle - '+x.name);r.h('État du contrôle');r.kv('Statut',x.status);r.p(controlReason(x));r.h('Action demandée');r.p(x.action,{bold:true});r.h('Preuve / document attendu');r.p(expectedDoc(x.name));r.notice(x.status==='OK'?'À conserver':'Condition avant validation',x.status==='OK'?'Conserve la preuve qui justifie ce statut et vérifie qu’elle reste valable.':x.action,x.status==='OK'?'ok':x.status==='BLOQUANT'?'bad':'warn');await finishReport(r,fileBase('controle-'+(i+1)))}
  async function downloadRiskPdf(i){const x=risks()[i];if(!x)return;const r=await baseReport('Fiche risque - '+x.name);r.h('Évaluation');r.kv('Probabilité',x.p+'%');r.kv('Gravité',x.s+'%');r.kv('Maîtrise',x.m+'%');r.kv('Score',x.score);r.h('Mesure de réduction');r.p(x.mit,{bold:true});r.notice('À documenter','Ajoute une preuve, un responsable et une échéance de traitement pour que ce risque ne reste pas seulement théorique.','warn');await finishReport(r,fileBase('risque-'+(i+1)))}
  async function downloadGatePdf(i){const g=gates()[i];if(!g)return;const r=await baseReport('Porte de décision '+g.code+' - '+g.name);r.h('Lecture');r.kv('Score',g.score+'/100');r.kv('Statut',g.status);r.p(gateExplanation(g));r.h('Contrôles encore ouverts');controls().filter(x=>x.status!=='OK').slice(0,10).forEach(x=>r.bullet(x.status+' - '+x.name+' : '+x.action));await finishReport(r,fileBase('porte-'+g.code.toLowerCase()))}
  async function downloadVisualPdf(i){const [name,desc]=V109_VISUALS[i];const r=await baseReport(name);r.h('Objectif du livrable');r.p(desc);r.h('Cahier de conception');visualPrompt(i).split('\n').filter(Boolean).forEach(x=>r.bullet(x));if(i===0&&typeof allZoneEngineering==='function'){r.h('Programme fonctionnel');allZoneEngineering().forEach(z=>r.kv(z.name,z.p+'% · risque '+z.risk+'/100 · '+fmt(z.cost)))}await finishReport(r,fileBase((typeof slug==='function'?slug(name):'visuel')))}
  async function downloadDocumentPdf(id){const d=typeof allDocuments==='function'?allDocuments().find(x=>x.id===id):null;if(!d)return;const st=state.workflow?.documents?.[id]||'missing',r=await baseReport((st==='obtained'?'Fiche document':'Modèle / fiche de préparation')+' - '+d.name);r.h('Rôle du document');r.p(d.why);r.kv('Catégorie',d.cat);r.kv('Priorité',d.priority==='critical'?'Critique':'Normale');r.kv('Statut',st);if(id==='concept'){r.h('Contenu de cadrage');r.p(state.idea||'Concept à compléter');r.kv('Cible',state.target||'À définir');r.kv('Objectif',state.goal||'À définir')}else if(id==='finance'){const f=calcFinance();r.h('Synthèse financière');r.kv('CA mensuel',fmt(f.revenue));r.kv('Résultat mensuel',fmt(f.profit));r.kv('CAPEX',fmt(f.capex));r.kv('Reste à financer',fmt(f.remaining))}else if(id==='quotes'){r.h('Devis enregistrés');const q=state.execution?.quotes||[];(q.length?q:[{supplier:'Aucun devis enregistré',amount:0,note:'Ajouter au moins deux références réelles.'}]).forEach(x=>r.bullet(`${x.supplier} - ${x.amount?fmt(x.amount):''} ${x.note||''}`))}else{r.h('Ce que la pièce doit contenir');r.bullet(d.why);r.bullet('Référence, date, auteur/organisme et périmètre clairement identifiés.');r.bullet('Conserver la version qui correspond réellement au lieu et au projet analysés.');if(d.cat==='legal')r.notice('Attention','Project Lab peut préparer une fiche ou un modèle, mais ne remplace jamais l’accord, l’attestation ou la validation émis par l’autorité ou le professionnel compétent.','warn')}await finishReport(r,fileBase('document-'+(typeof slug==='function'?slug(d.name):id)))}

  async function downloadPdfType(type){
    let r;if(type==='decision'){const s=scoreProject(),f=calcFinance();r=await baseReport('Fiche décision');r.h('Décision actuelle');r.kv('Verdict',s.verdict);r.kv('Confiance',s.confidence+'/100');r.kv('Viabilité',s.vi+'/100');r.kv('Risque',s.risk+'/100');r.h('Économie');r.kv('CA / mois',fmt(f.revenue));r.kv('Résultat / mois',fmt(f.profit));r.kv('CAPEX',fmt(f.capex));r.h('Actions prioritaires');controls().filter(x=>x.status!=='OK').slice(0,8).forEach(x=>r.bullet(x.status+' - '+x.name+' : '+x.action));return finishReport(r,fileBase('fiche-decision'))}
    if(type==='risks'){r=await baseReport('Matrice et registre des risques');r.h('Risques prioritaires');risks().forEach((x,i)=>{r.p((i+1)+'. '+x.name,{bold:true});r.kv('Score',x.score+' · prob. '+x.p+'% · grav. '+x.s+'%');r.p(x.mit)});return finishReport(r,fileBase('matrice-risques'))}
    if(type==='plan'){r=await baseReport('Plan fonctionnel');r.h('Variante étudiée');r.p(typeof V5_VARIANTS!=='undefined'&&state.visual?.variant?V5_VARIANTS[state.visual.variant]?.label||state.visual.variant:'Équilibrée');if(typeof allZoneEngineering==='function')allZoneEngineering().forEach(z=>{r.kv(z.name,z.p+'% · '+fmt(z.cost)+' · risque '+z.risk+'/100');z.constraints.slice(0,2).forEach(c=>r.bullet(c))});r.notice('Limite','Ce plan est un schéma fonctionnel de décision, pas un plan d’exécution coté par un architecte ou un bureau d’études.','warn');return finishReport(r,fileBase('plan-fonctionnel'))}
    if(type==='roadmap'){r=await baseReport('Feuille de route 30 / 60 / 90 jours');r.h('Actions');(typeof roadmapItems==='function'?roadmapItems():[]).forEach(x=>{r.p(x.h+' jours - '+x.title,{bold:true});r.p(x.detail);r.kv('Responsable / statut',x.owner+' · '+(typeof roadmapStatus==='function'?roadmapStatus(x.id):'todo'))});return finishReport(r,fileBase('feuille-de-route'))}
    r=await baseReport('Dossier complet 360°');const s=scoreProject(),f=calcFinance();r.h('Résumé exécutif');r.p(state.idea||'Concept à compléter');r.kv('Décision',s.verdict+' · confiance '+s.confidence+'/100');r.h('Finances');r.kv('CA mensuel',fmt(f.revenue));r.kv('Résultat mensuel',fmt(f.profit));r.kv('Point mort',f.breakeven+' ventes/mois');r.kv('CAPEX',fmt(f.capex));r.kv('Reste à financer',fmt(f.remaining));r.h('Risques');risks().slice(0,8).forEach(x=>r.bullet(x.name+' - score '+x.score+' - '+x.mit));r.h('Tour de contrôle');controls().forEach(x=>r.bullet(x.status+' - '+x.name+' : '+x.action));if(state.territory?.live){r.h('Territoire');r.kv('Commune',state.territory.live.nom+' ('+state.territory.live.code+')');r.kv('Population',new Intl.NumberFormat('fr-FR').format(state.territory.live.population||0));r.p('Données territoriales contextuelles à compléter par vérification du site exact et des sources réglementaires applicables.')}r.h('Feuille de route');(typeof roadmapItems==='function'?roadmapItems():[]).slice(0,20).forEach(x=>r.bullet(x.h+' jours - '+x.title+' - '+x.owner));r.notice('Limites d’usage','Le dossier structure la décision. Il ne remplace pas les validations de la mairie, du propriétaire, de l’assureur, du comptable, du juriste, du bureau de contrôle ou de tout professionnel compétent.','warn');return finishReport(r,fileBase('dossier-complet'))
  }

  function improveTerritory(){
    const b=$('#researchTerritoryBtn');if(!b||b.dataset.v109Bound)return;b.dataset.v109Bound='1';const old=b.onclick;b.onclick=async()=>{if(!($('#location')?.value||'').trim()){showPage('project');$('#location')?.focus();toast('Choisis d’abord la ville / territoire du projet.');return}b.disabled=true;const oldText=b.textContent;b.textContent='Analyse en cours…';try{if(typeof old==='function')await old.call(b);else if(typeof researchTerritory==='function')await researchTerritory()}finally{setTimeout(()=>{b.disabled=false;b.textContent=oldText},500)}}
  }

  function bindCore(){
    injectStyle();injectProjectMeta();setDemoFlag();renderDemoBanner();
    $$('.logo-stage [data-jump="project"]').forEach(b=>b.onclick=goCadrage);
    $('#homeBrand')&&($('#homeBrand').onclick=goCadrage);
    if($('#newBtn')){const old=$('#newBtn').onclick;$('#newBtn').onclick=()=>{old?.();state.demo=false;ensureV109State();fillV109Meta();renderDemoBanner()}}
    bindVisuals();decorateDashboard();decorateDocuments();renameDeliverables();improveTerritory();
    if(typeof renderControl==='function')renderControl();if(typeof renderRisks==='function')renderRisks();if(typeof renderPilot==='function')renderPilot();
    document.querySelector('.version-pill')&&(document.querySelector('.version-pill').textContent='V10.9');const sm=document.querySelector('.brand small');if(sm)sm.textContent=nativeAndroid?'V10.9 Android · PDF natifs':'V10.9 Autonome · interactions & PDF';
  }

  const prevShow=window.showPage;if(typeof prevShow==='function')window.showPage=function(id){prevShow(id);setTimeout(()=>{if(id==='project'){injectProjectMeta();renderDemoBanner()}if(id==='dashboard')decorateDashboard();if(id==='control')renderControl();if(id==='risks')renderRisks();if(id==='pilot')renderPilot();if(id==='visuals')bindVisuals();if(id==='documents')decorateDocuments();if(id==='deliverables')renameDeliverables();if(id==='territory')improveTerritory()},10)};
  const prevAll=window.renderAll;if(typeof prevAll==='function')window.renderAll=function(){prevAll();setTimeout(()=>{injectProjectMeta();renderDemoBanner();decorateDashboard();decorateDocuments();renameDeliverables();bindVisuals();improveTerritory()},0)};

  window.JLGV109={downloadPdfType,downloadDocumentPdf,downloadControlPdf,downloadRiskPdf,downloadGatePdf,openVisual109,goCadrage};
  bindCore();
})();
