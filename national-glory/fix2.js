/* National Glory V0.99 FIX2 — post-audit corrective layer
   Loaded after the V0.99 RC standalone build. */
(function(){
  if(typeof state==='undefined' || typeof GameConfig==='undefined' || typeof Engine==='undefined') return;

  const FIX_VERSION='0.99-fix2';
  const FIRST_BY_SEX={
    france:{
      M:['Lucas','Noah','Jules','Tom','Antoine','Hugo','Mathis','Louis','Nathan','Ethan','Enzo','Maël','Théo','Gabriel','Arthur','Maxime','Rayan','Axel','Bastien','Martin','Sacha','Yanis'],
      F:['Léa','Emma','Clara','Manon','Camille','Sarah','Inès','Zoé','Lou','Jade','Chloé','Nina','Alice','Lina','Romane','Eva','Mila','Juliette','Ambre','Agathe','Maëlys','Pauline']
    },
    usa:{M:['Liam','Noah','Ethan','Mason','Logan','Aiden','Jackson','Caleb'],F:['Emma','Olivia','Ava','Mia','Sophia','Chloe','Grace','Harper']},
    japan:{M:['Haruto','Ren','Yuto','Sota','Kaito','Riku','Takumi'],F:['Hina','Yui','Aoi','Mio','Sakura','Rin','Mei','Akari','Nana']},
    kenya:{M:['Brian','David','Eliud','Joseph','Samuel','Dennis','Peter'],F:['Faith','Mary','Vivian','Agnes','Joyce','Mercy','Ruth','Irene','Caroline']},
    brazil:{M:['Lucas','Gabriel','Matheus','Rafael','Thiago','Bruno','Pedro','João'],F:['Ana','Beatriz','Camila','Larissa','Mariana','Julia','Leticia','Isabela']},
    canada:{M:['Liam','Noah','Owen','William','Ethan','Lucas','Nathan','Alex'],F:['Emma','Olivia','Charlotte','Amelia','Sophie','Chloe','Élodie','Camille']}
  };
  const ROLE_CYCLES={
    handball:['Gardien','Ailier','Ailier','Arrière','Arrière','Arrière','Pivot'],
    basketball:['Meneur','Arrière','Arrière','Ailier','Ailier','Intérieur','Intérieur'],
    volleyball:['Passeur','Central','Central','Réceptionneur','Réceptionneur','Libéro']
  };

  function firstPool(countryId,sex){
    const set=FIRST_BY_SEX[countryId]||FIRST_BY_SEX.france;
    return set[sex]||set.M;
  }
  function countryNames(countryId){ return COUNTRY_NAMES[countryId]||COUNTRY_NAMES.france; }
  function surnameFix(s){ return String(s||'').replace(/\bFrancois\b/g,'François'); }
  function deterministicIndex(key,len){ return len?hashSeed(String(key))%len:0; }

  function repairAthleteIdentity(a,index,used){
    if(!a) return;
    if(!a.countryId) a.countryId=state.save?.countryId||'france';
    if(!a.sex) a.sex=index%2===0?'M':'F';
    const pool=firstPool(a.countryId,a.sex);
    const parts=String(a.name||'').trim().split(/\s+/).filter(Boolean);
    let last=surnameFix(parts.slice(1).join(' '));
    if(!last){
      const lasts=countryNames(a.countryId).last;
      last=surnameFix(lasts[deterministicIndex(`${a.id||index}-last`,lasts.length)]);
    }
    let first=parts[0]||'';
    if(!pool.includes(first)) first=pool[deterministicIndex(`${a.id||index}-${a.sex}-first`,pool.length)];
    let candidate=`${first} ${last}`;
    if(used){
      let k=0;
      while(used.has(candidate)&&k<pool.length){
        k++;
        candidate=`${pool[(deterministicIndex(a.id||index,pool.length)+k)%pool.length]} ${last}`;
      }
      if(used.has(candidate)) candidate=`${candidate} ${index+1}`;
      used.add(candidate);
    }
    a.name=candidate;
  }

  function normalizeAthleteDefaults(athletes,countryId){
    const used=new Set();
    (athletes||[]).forEach((a,i)=>{
      if(!a.countryId)a.countryId=countryId||'france';
      if(!a.sex)a.sex=i%2===0?'M':'F';
      if(typeof a.selected!=='boolean')a.selected=false;
      if(typeof a.scoutingReviews!=='number')a.scoutingReviews=0;
      if(!a.developmentPlan)a.developmentPlan='balanced';
      a.potentialMin=Math.round(+a.potentialMin||+a.ability||50);
      a.potentialMax=Math.round(+a.potentialMax||+a.truePotential||+a.ability||50);
      repairAthleteIdentity(a,i,used);
    });
  }

  function makeCareerAthlete(save,sportId,sex,role,index,usedNames){
    const country=COUNTRIES[save.countryId]||COUNTRIES.france;
    const sp=save.sports.find(x=>x.id===sportId);
    const seed=hashSeed(`${save.id||save.countryId}-${sportId}-${sex}-${index}-depth`);
    const rng=rngObj(seed);
    const fp=firstPool(save.countryId,sex), lasts=countryNames(save.countryId).last;
    let name,guard=0;
    do{
      name=`${fp[Math.floor(rng()*fp.length)]} ${surnameFix(lasts[Math.floor(rng()*lasts.length)])}`;
      guard++;
    }while((usedNames.has(name)||RESERVED_REAL_NAMES.has(name))&&guard<100);
    if(usedNames.has(name))name=`${name} ${index+1}`;
    usedNames.add(name);
    const baseStrength=sp?.strengthIndex||countrySportStrength(country,sportById(sportId));
    const age=18+Math.floor(rng()*15);
    const ability=clamp(Math.round(42+baseStrength*.43+randomNormal(rng)*5),48,91);
    const pot=clamp(Math.round(ability+5+rng()*10-Math.max(0,age-24)*.35),ability,98);
    const regionPool=regionsForCountry(save.countryId);
    return {
      id:`ath_fix_${sportId}_${sex}_${seed.toString(36)}`,name,countryId:save.countryId,sportId,discipline:role,sex,age,
      region:regionPool[Math.floor(rng()*regionPool.length)],ability,truePotential:pot,
      potentialMin:clamp(Math.round(pot-4),ability,99),potentialMax:clamp(Math.round(pot+2),ability,99),
      form:Math.round(70+rng()*22),fatigue:Math.round(6+rng()*18),confidence:Math.round(60+rng()*30),professionalism:Math.round(55+rng()*35),
      injuryRisk:Math.round(8+rng()*20),experience:clamp(Math.round((age-16)*4+rng()*15),2,92),
      physical:clamp(Math.round(ability+randomNormal(rng)*5),40,99),technical:clamp(Math.round(ability+randomNormal(rng)*5),40,99),mental:clamp(Math.round(ability+randomNormal(rng)*5),40,99),
      coach:sp?.strengthIndex||70,infrastructure:sp?.infrastructure||70,injuredDays:0,pb:null,trend:'→',history:[],selected:false,scoutingReviews:0,developmentPlan:'balanced'
    };
  }

  function ensureTeamRosterDepth(save){
    if(!save?.athletes)return;
    const used=new Set(save.athletes.map(a=>a.name));
    for(const sportId of GameConfig.TEAM_SPORTS){
      const target=GameConfig.TEAM_RULES[sportId].preferred;
      const roles=ROLE_CYCLES[sportId]||GameConfig.DISCIPLINES[sportId];
      for(const sex of ['M','F']){
        let group=save.athletes.filter(a=>a.sportId===sportId&&a.sex===sex);
        for(let i=group.length;i<target;i++){
          const role=roles[i%roles.length];
          const a=makeCareerAthlete(save,sportId,sex,role,i,used);
          save.athletes.push(a);group.push(a);
        }
      }
    }
  }

  function fillInitialSelections(save){
    if(!save?.athletes)return;
    ensureTeamRosterDepth(save);
    normalizeAthleteDefaults(save.athletes,save.countryId);
    SPORTS.forEach(s=>{
      if(Engine.isTeamSport(s.id)){
        GameConfig.SEXES.forEach(sex=>{
          const target=GameConfig.TEAM_RULES[s.id].preferred;
          const selected=save.athletes.filter(a=>a.sportId===s.id&&a.sex===sex.id&&a.selected&&!a.injuredDays);
          save.athletes.filter(a=>a.sportId===s.id&&a.sex===sex.id&&!a.selected&&!a.injuredDays)
            .sort((a,b)=>b.ability-a.ability)
            .slice(0,Math.max(0,target-selected.length)).forEach(a=>a.selected=true);
        });
      }else{
        Engine.eventsForSport(s.id).forEach(ev=>{
          if(save.athletes.some(a=>a.selected&&!a.injuredDays&&Engine.eligibleForEvent(a,ev)))return;
          const best=save.athletes.filter(a=>!a.injuredDays&&Engine.eligibleForEvent(a,ev)).sort((a,b)=>b.ability-a.ability)[0];
          if(best)best.selected=true;
        });
      }
    });
  }

  // Stop normalization from silently undoing the player's selection choices.
  initializeSelections=function(athletes){ normalizeAthleteDefaults(athletes,state.save?.countryId||'france'); };

  const baseNormalizeSave=normalizeSave;
  normalizeSave=function(save){
    if(!save||typeof save!=='object')return save;
    const wasFix2=save.version===FIX_VERSION;
    if(wasFix2)save.version='0.99-rc'; // keep RC migration guards stable in the legacy normalizer
    baseNormalizeSave(save);
    ensureTeamRosterDepth(save);
    normalizeAthleteDefaults(save.athletes,save.countryId);
    if(!save.selectionInitialized){fillInitialSelections(save);save.selectionInitialized=true;}
    if(!Number.isFinite(+save.rankingMomentum))save.rankingMomentum=0;
    if(!save.medals||!['g','s','b'].every(k=>Number.isFinite(+save.medals[k])))save.medals={g:0,s:0,b:0};
    fixFederationObjectives(save);
    save.version=FIX_VERSION;
    return save;
  };

  const baseFreshSave=freshSave;
  freshSave=function(opts={}){
    const save=baseFreshSave(opts);
    ensureTeamRosterDepth(save);
    fillInitialSelections(save);
    save.selectionInitialized=true;
    save.version=FIX_VERSION;
    save.rankingMomentum=0;
    normalizeAthleteDefaults(save.athletes,save.countryId);
    return save;
  };

  // Newly generated youth are immediately repaired to the right gendered name pool.
  const baseGenerateYouthProspects=generateYouthProspects;
  generateYouthProspects=function(){
    const result=baseGenerateYouthProspects.apply(this,arguments);
    if(state.save)normalizeAthleteDefaults(state.save.athletes,state.save.countryId);
    return result;
  };

  // Selection is now authoritative. Falling below a legal roster gives a clear warning instead of being silently reverted.
  toggleSelection=function(athleteId){
    const a=state.save.athletes.find(x=>x.id===athleteId);if(!a)return;
    const limit=Engine.selectionLimitForSport(a.sportId);
    const scoped=Engine.isTeamSport(a.sportId)?state.save.athletes.filter(x=>x.sportId===a.sportId&&x.sex===a.sex&&x.selected):selectedForSport(a.sportId);
    if(!a.selected&&scoped.length>=limit){toast(`Maximum ${limit} athlètes sélectionnés ${Engine.isTeamSport(a.sportId)?'par catégorie ':''}pour ce sport.`);return;}
    a.selected=!a.selected;
    if(!a.selected&&Engine.isTeamSport(a.sportId)){
      const remaining=state.save.athletes.filter(x=>x.sportId===a.sportId&&x.sex===a.sex&&x.selected&&!x.injuredDays).length;
      const min=GameConfig.TEAM_RULES[a.sportId].minimum,preferred=GameConfig.TEAM_RULES[a.sportId].preferred;
      if(remaining<min)toast(`Sélection incomplète : ${remaining}/${min}. Les matchs seront bloqués.`);
      else if(remaining<preferred)toast(`Effectif réduit : ${remaining}/${preferred}. Complète la sélection pour utiliser le coaching live sans joueur de complément.`);
    }
    state.selectedAthlete=a;state.modal={type:'athlete'};persist();render();
  };

  function selectedAvailableFor(sportId,sex){
    return state.save.athletes.filter(a=>a.sportId===sportId&&a.sex===sex&&a.selected&&!a.injuredDays);
  }
  function fullLiveRosterReady(sportId,sex){
    const count=selectedAvailableFor(sportId,sex).length,need=GameConfig.TEAM_RULES[sportId].preferred;
    if(count<need){toast(`Coaching live : ${count}/${need} joueurs réels sélectionnés. Complète la sélection ${sexLabel(sex)} avant le match.`);return false;}
    return true;
  }
  const baseStartLiveFriendly=startLiveFriendly;
  startLiveFriendly=function(sportId,sex='M'){
    if(!fullLiveRosterReady(sportId,sex))return;
    return baseStartLiveFriendly(sportId,sex);
  };
  const baseLaunchOfficialLiveMatch=launchOfficialLiveMatch;
  launchOfficialLiveMatch=function(c,event,tournament,pending){
    const real=tournament?._userTeam?.roster?.length||0,need=GameConfig.TEAM_RULES[c.sportId]?.preferred||0;
    if(real<need){
      saveOfficialProgress(c);state.screen='competitions';state.modal=null;render();
      toast(`Match officiel en pause : ${real}/${need} joueurs réels dans la sélection ${sexLabel(event.sex)}. Complète-la puis reprends le tournoi.`);
      return;
    }
    return baseLaunchOfficialLiveMatch(c,event,tournament,pending);
  };

  // Input search stays focused after each live filtering render.
  bindAthleteFilters=function(){
    ['fltQ','fltSport','fltRegion','fltSex','fltAge','fltPotential','fltStatus'].forEach(id=>{
      const el=$('#'+id);if(!el)return;
      el.addEventListener(id==='fltQ'?'input':'change',e=>{
        const cursor=id==='fltQ'?(e.target.selectionStart??e.target.value.length):null;
        state.filters={q:$('#fltQ')?.value||'',sport:$('#fltSport')?.value||'',region:$('#fltRegion')?.value||'',sex:$('#fltSex')?.value||'',age:$('#fltAge')?.value||'',potential:$('#fltPotential')?.value||'',status:$('#fltStatus')?.value||''};
        state.athletePage=1;state.screen='athletes';render();
        if(id==='fltQ'){const q=$('#fltQ');if(q){q.focus();q.setSelectionRange(cursor,cursor);}}
      });
    });
  };

  filteredAthletes=function(){
    return state.save.athletes.filter(a=>{
      const q=(state.filters.q||'').toLowerCase();
      if(q&&!(`${a.name} ${a.discipline}`.toLowerCase().includes(q)))return false;
      if(state.filters.sport&&a.sportId!==state.filters.sport)return false;
      if(state.filters.region&&a.region!==state.filters.region)return false;
      if(state.filters.sex&&a.sex!==state.filters.sex)return false;
      if(state.filters.age==='young'&&!(a.age<=20))return false;
      if(state.filters.age==='prime'&&!(a.age>=21&&a.age<=27))return false;
      if(state.filters.age==='veteran'&&!(a.age>=28))return false;
      if(state.filters.potential==='elite'&&!(a.potentialMin>=92))return false;
      if(state.filters.potential==='high'&&!(a.potentialMin>=85))return false;
      if(state.filters.status==='injured'&&!(a.injuredDays>0))return false;
      if(state.filters.status==='hot'&&!(a.form>=86))return false;
      if(state.filters.status==='rising'&&!(a.trend==='↗'))return false;
      return true;
    }).sort((a,b)=>b.ability-a.ability);
  };

  // Pagination prevents 200+ athlete cards from being dumped into a single mobile view.
  const PAGE_SIZE=48;
  athletesScreen=function(){
    const all=filteredAthletes(),pages=Math.max(1,Math.ceil(all.length/PAGE_SIZE));
    state.athletePage=clamp(state.athletePage||1,1,pages);
    const page=state.athletePage,start=(page-1)*PAGE_SIZE,athletes=all.slice(start,start+PAGE_SIZE);
    const pager=pages>1?`<div class="pillbar" style="justify-content:center;margin:18px 0"><button class="btn" data-ath-page="${Math.max(1,page-1)}" ${page===1?'disabled':''}>← Précédent</button><span class="badge gold">Page ${page}/${pages} · ${all.length} athlètes</span><button class="btn" data-ath-page="${Math.min(pages,page+1)}" ${page===pages?'disabled':''}>Suivant →</button></div>`:`<div class="row-sub" style="margin:10px 0">${all.length} athlète(s)</div>`;
    return `<div class="section-title"><div><h2>Base athlètes</h2><p>Filtre les profils, suis la progression et entre dans le détail individuel.</p></div></div>${athleteFiltersHtml()}${pager}<div class="grid athlete-grid">${athletes.map(a=>athleteCard(a)).join('')||'<div class="empty">Aucun athlète ne correspond aux filtres.</div>'}</div>${pages>1?pager:''}`;
  };
  const baseBindShell=bindShell;
  bindShell=function(){
    baseBindShell();
    $$('[data-ath-page]').forEach(el=>el.addEventListener('click',()=>{state.athletePage=+el.dataset.athPage||1;render();window.scrollTo?.({top:0,behavior:'smooth'});}));
  };

  // Import validation: reject partial JSON before migration and never expose raw parser errors.
  function validateImportedSave(raw){
    return !!(raw&&typeof raw==='object'&&COUNTRIES[raw.countryId]&&Number.isFinite(+raw.year)&&Number.isFinite(+raw.month)&&Number.isFinite(+raw.day)&&Number.isFinite(+raw.budget)&&Array.isArray(raw.athletes)&&raw.athletes.length>=10&&Array.isArray(raw.sports)&&raw.sports.length>=5&&Array.isArray(raw.competitions)&&raw.medals&&['g','s','b'].every(k=>Number.isFinite(+raw.medals[k])));
  }
  importSaveFile=function(file){
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      let parsed;
      try{parsed=JSON.parse(String(reader.result||''));}
      catch{toast('Import impossible : le fichier JSON est invalide.');return;}
      try{
        const incoming=Array.isArray(parsed?.saves)?parsed.saves:[parsed];
        if(!incoming.length||incoming.some(x=>!validateImportedSave(x)))throw new Error('invalid');
        let imported=0,lastId=null;
        for(const raw of incoming){
          const save=structuredClone(raw);normalizeSave(save);
          if(!save.id||localStorage.getItem(saveKey(save.id)))save.id='save_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
          save.updatedAt=Date.now();save.version=FIX_VERSION;save.tutorialSeen=true;
          try{localStorage.setItem(saveKey(save.id),JSON.stringify(save));}catch{throw new Error('quota');}
          imported++;lastId=save.id;
        }
        if(lastId)localStorage.setItem(LAST_SAVE_KEY,lastId);
        toast(`${imported} sauvegarde(s) importée(s).`);render();
      }catch(err){toast(err.message==='quota'?'Import impossible : stockage local saturé. Exporte puis supprime une ancienne partie.':'Import impossible : sauvegarde incomplète ou incompatible.');}
    };
    reader.readAsText(file);
  };

  // Storage is guarded and users get a useful recovery action instead of a silent quota error.
  function storageUsageBytes(){
    let chars=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);chars+=(k?.length||0)+(localStorage.getItem(k)?.length||0);}}catch{}
    return chars*2;
  }
  state.storageWarned=!!state.storageWarned;
  persist=function(){
    if(!state.save)return false;
    state.save.updatedAt=Date.now();state.save.version=FIX_VERSION;
    try{
      localStorage.setItem(saveKey(state.save.id),JSON.stringify(state.save));
      localStorage.setItem(LAST_SAVE_KEY,state.save.id);
      if(storageUsageBytes()>3.5*1024*1024&&!state.storageWarned){state.storageWarned=true;setTimeout(()=>toast('Stockage local presque plein : exporte tes sauvegardes et supprime les anciennes parties.'),0);}
      return true;
    }catch{
      setTimeout(()=>toast('Sauvegarde impossible : stockage local plein. Exporte une partie puis supprime une ancienne sauvegarde.'),0);return false;
    }
  };

  // Always provide an exit to save management.
  const baseHandleAction=handleAction;
  handleAction=function(action){
    if(action==='back'){persist();state.screen='landing';state.save=null;state.modal=null;render();return;}
    return baseHandleAction(action);
  };
  const baseShellHtml=shellHtml;
  shellHtml=function(){
    let html=baseShellHtml();
    const needle=`<div>${state.save.name}</div>\n      </div>`;
    if(html.includes(needle))html=html.replace(needle,`<div>${state.save.name}</div><button class="btn ghost" data-action="back" style="width:100%;margin-top:10px">💾 Sauvegarder & menu</button>\n      </div>`);
    return html;
  };
  moreModal=function(){
    const extra=[['management','🧭','Direction'],['olympics','🔥','Grands Jeux'],['nation','🌍','Nation'],['history','🏛️','Histoire'],['finances','💰','Finances']];
    return `<div class="modal-backdrop" id="modal" role="dialog" aria-modal="true" aria-label="Fenêtre de jeu"><div class="modal"><div class="modal-top"><h2>Plus</h2><button class="btn ghost" id="closeModal">Fermer</button></div><div class="option-grid">${extra.map(([id,icon,label])=>`<div class="option active" data-more-nav="${id}"><b>${icon} ${label}</b><span>Ouvrir ${label}.</span></div>`).join('')}<div class="option active" id="moreReturnMenu"><b>💾 Sauvegarder & menu</b><span>Enregistrer la carrière et revenir au menu principal.</span></div></div></div></div>`;
  };
  const baseBindModal=bindModal;
  bindModal=function(){
    baseBindModal();
    $('#moreReturnMenu')?.addEventListener('click',()=>{persist();state.save=null;state.screen='landing';state.modal=null;render();});
  };

  // Finished matches are read-only.
  const baseLivePlayerLine=livePlayerLine,baseLiveBenchLine=liveBenchLine;
  livePlayerLine=function(p){
    let html=baseLivePlayerLine(p);if(state.liveMatchSession?.finished)html=html.replace(/<button[^>]*data-live-sub-out[^>]*>[\s\S]*?<\/button>/,'');return html;
  };
  liveBenchLine=function(p){
    let html=baseLiveBenchLine(p);if(state.liveMatchSession?.finished)html=html.replace(/<button[^>]*data-live-sub-in[^>]*>[\s\S]*?<\/button>/,'');return html;
  };

  // Season objectives correctly recognize a nation/sport already ranked #1.
  const baseGenerateObjectives=Management.generateFederationObjectives.bind(Management);
  Management.generateFederationObjectives=function(sport,year,opts){
    return baseGenerateObjectives(sport,year,opts).map(o=>o.type==='ranking'&&+o.baseline<=1?{...o,label:'Conserver la place de n°1',target:1}:o);
  };
  const baseEvaluateObjectives=Management.evaluateFederationObjectives.bind(Management);
  Management.evaluateFederationObjectives=function(sport,qualification,objectives=[]){
    const out=baseEvaluateObjectives(sport,qualification,objectives);
    let changed=false;
    out.details=out.details.map(d=>{
      if(d.type==='ranking'&&+d.baseline<=+d.target&&sport.ranking<=d.target){changed=true;return {...d,label:d.target===1?'Conserver la place de n°1':d.label,achieved:true,progress:1,value:sport.ranking};}
      return d;
    });
    if(changed){
      const weight=out.details.reduce((s,o)=>s+(o.weight||1),0)||1;
      out.score=Math.round(out.details.reduce((s,o)=>s+o.progress*(o.weight||1),0)/weight*100);out.achieved=out.details.filter(o=>o.achieved).length;
      out.moraleDelta=out.score>=80?4:out.score>=55?1:out.score>=35?-2:-5;out.efficiencyDelta=out.score>=80?2:out.score>=55?1:out.score>=35?0:-2;
    }
    return out;
  };
  function fixFederationObjectives(save){
    for(const f of Object.values(save?.federations||{}))for(const o of (f.seasonObjectives||[]))if(o.type==='ranking'&&+o.baseline<=1){o.label='Conserver la place de n°1';o.target=1;}
  }

  // World ranking now reacts to international results between the Grands Jeux.
  function applyCompetitionRanking(c){
    if(!c||c._fix2RankingApplied||['national','friendly','olympics'].includes(c.type)||c.status!=='done')return;
    c._fix2RankingApplied=true;
    const user=(c.results||[]).filter(p=>p.nationId===state.save.countryId);
    const wins=user.filter(p=>p.rank===1).length,podiums=user.length;
    let delta=wins*.85+Math.max(0,podiums-wins)*.32;
    if(!podiums)delta=-.18;
    state.save.rankingMomentum=clamp((state.save.rankingMomentum||0)+delta,-5,5);
    while(state.save.rankingMomentum>=1.5&&state.save.worldRank>1){state.save.worldRank--;state.save.rankingMomentum-=1.5;}
    while(state.save.rankingMomentum<=-1.5&&state.save.worldRank<30){state.save.worldRank++;state.save.rankingMomentum+=1.5;}
    const sp=state.save.sports.find(s=>s.id===c.sportId);
    if(sp){if(wins>0)sp.ranking=Math.max(1,sp.ranking-1);else if(!podiums)sp.ranking=Math.min(35,sp.ranking+(Math.random()<.18?1:0));}
    const worldSelf=state.save.world?.nations?.[state.save.countryId];if(worldSelf)worldSelf.worldRank=state.save.worldRank;
    const h=[...state.save.history].reverse().find(x=>x.name===c.name);
    if(h&&podiums)h.summary=`Bilan ${currentCountry().name} : ${wins} victoire(s), ${podiums} podium(s). Classement mondial #${state.save.worldRank}.`;
  }
  const baseSimCompetitionAuto=simulateCompetitionAuto;
  simulateCompetitionAuto=function(c,rng){const r=baseSimCompetitionAuto(c,rng);applyCompetitionRanking(c);return r;};
  const baseFinalizeOfficialCompetition=finalizeOfficialCompetition;
  finalizeOfficialCompetition=function(c){const isGames=state.officialCompetition?.olympics;const r=baseFinalizeOfficialCompetition(c);if(!isGames)applyCompetitionRanking(c);return r;};

  // Up to three management decisions may coexist; one ignored item no longer freezes the system for years.
  const baseAdvanceOneDay=advanceOneDay;
  advanceOneDay=function(){
    const result=baseAdvanceOneDay();
    if(result?.advanced&&state.save&&state.save.tick%60===0){
      const pending=state.save.notifications.filter(n=>n.decision&&!n.resolved).length;
      if(pending<3)createManagementDecision(rngObj((state.save.seed+state.save.tick*104729)>>>0));
    }
    return result;
  };

  // Clarify that the medal counter only belongs to the Grands Jeux.
  const baseDashboardScreen=dashboardScreen;
  dashboardScreen=function(){return baseDashboardScreen().replace('<div class="metric-label">Médailles</div>','<div class="metric-label">Médailles Grands Jeux</div>');};

  // Explain mode-adjusted budgets in career creation instead of appearing inconsistent.
  const baseNewCareerModal=newCareerModal;
  newCareerModal=function(){
    let html=baseNewCareerModal();
    if(state.modal?.step===3){
      const d=state.modal.data,c=COUNTRIES[d.countryId],adapted=Math.round(c.budget*Engine.careerModifiers(d.mode,d.difficulty).budgetMultiplier);
      html=html.replace('</div></div><div class="modal-actions">',`<div class="row-sub" style="margin-top:8px">Budget public de base ${fmtMoney(c.budget)} · enveloppe adaptée au mode ~${fmtMoney(adapted)} avant sponsors.</div></div></div><div class="modal-actions">`);
    }
    return html;
  };

  // Existing active save (if any) receives the migration immediately.
  if(state.save){normalizeSave(state.save);persist();render();}
})();
