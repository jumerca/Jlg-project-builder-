/* JLG Project Lab 360 — V8 connected territory intelligence */
const V8_VERSION='8.0.0';
function ensureV8State(){
  state.territory=state.territory||{};
  state.territory.live=state.territory.live||null;
  state.territory.poi=state.territory.poi||[];
  state.territory.sources=state.territory.sources||[];
  state.territory.radius=state.territory.radius||5000;
  state.territory.updatedAt=state.territory.updatedAt||null;
}
function injectV8Shell(){
  document.title='JLG Project Lab 360 — V8';
  const vp=document.querySelector('.version-pill');if(vp)vp.textContent='V8';
  const bs=document.querySelector('.brand small');if(bs)bs.textContent='V8 · ingénierie connectée au territoire';
  if(!document.querySelector('link[href*="v8.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./v8.css?v=8.0.0';document.head.appendChild(l)}
  const tabs=document.querySelector('#tabs');
  if(tabs&&!tabs.querySelector('[data-page="territory"]')){
    const exec=tabs.querySelector('[data-page="execution"]');
    (exec||tabs.lastElementChild)?.insertAdjacentHTML(exec?'beforebegin':'afterend','<button class="tab" data-page="territory">Territoire live</button>');
  }
  const execPage=document.querySelector('#execution');
  if(execPage&&!document.querySelector('#territory'))execPage.insertAdjacentHTML('beforebegin',`<section id="territory" class="page">
    <div class="section-title"><div><span class="section-kicker">V8 · DONNÉES LIVE</span><h2>Intelligence territoriale</h2></div><p>Données publiques sourcées, datées et séparées des hypothèses.</p></div>
    <div class="territory-hero card">
      <div><span class="eyebrow">TERRITOIRE DU PROJET</span><h2 id="territoryTitle">${esc(state.location||'Ville à définir')}</h2><p id="territoryIntro">Lance une recherche pour récupérer les données officielles de la commune et les activités/équipements repérés autour.</p></div>
      <div class="territory-actions no-print"><label>Rayon<select id="territoryRadius" class="field"><option value="2000">2 km</option><option value="5000" selected>5 km</option><option value="10000">10 km</option><option value="20000">20 km</option></select></label><button id="researchTerritoryBtn" class="btn primary">Analyser le territoire</button><button id="clearTerritoryBtn" class="btn ghost">Effacer les données live</button></div>
    </div>
    <div id="territoryStatus" class="callout" style="margin-top:12px">Aucune donnée live chargée.</div>
    <div id="territoryKpis" class="grid g4" style="margin-top:14px"></div>
    <div class="territory-grid" style="margin-top:14px">
      <div class="card"><div class="card-head"><h3>Profil officiel de la commune</h3><span class="pill">geo.api.gouv.fr</span></div><div id="communeProfile"></div></div>
      <div class="card"><div class="card-head"><h3>Lecture projet</h3><span class="pill">moteur V8</span></div><div id="territoryReading"></div></div>
      <div class="card territory-wide"><div class="card-head"><h3>Écosystème autour du projet</h3><span class="pill" id="poiCount">0 éléments</span></div><div class="poi-toolbar no-print"><button class="seg active" data-poi-filter="all">Tous</button><button class="seg" data-poi-filter="competition">Concurrence / offre</button><button class="seg" data-poi-filter="access">Accès</button><button class="seg" data-poi-filter="tourism">Tourisme</button><button class="seg" data-poi-filter="services">Services</button></div><div id="poiList" class="poi-list"></div></div>
      <div class="card"><div class="card-head"><h3>Sources & fraîcheur</h3><span class="pill">traçabilité</span></div><div id="territorySources"></div></div>
      <div class="card"><div class="card-head"><h3>Ce que ces données changent</h3><span class="pill">décision</span></div><div id="territoryImpact"></div></div>
    </div>
  </section>`);
}
function frNumber(n){return new Intl.NumberFormat('fr-FR').format(Number(n||0))}
function territoryCacheKey(){return 'jlg360_territory_'+slug(state.location||'unknown')+'_'+(state.territory.radius||5000)}
function readTerritoryCache(){try{return JSON.parse(localStorage.getItem(territoryCacheKey())||'null')}catch{return null}}
function writeTerritoryCache(data){try{localStorage.setItem(territoryCacheKey(),JSON.stringify(data))}catch{}}
function sourceEntry(label,url){return{label,url,date:new Date().toLocaleString('fr-FR'),iso:new Date().toISOString()}}
async function fetchCommuneLive(){
  const q=(state.location||'').split(',')[0].trim();if(!q)throw new Error('Renseigne une ville dans le projet.');
  const url=`https://geo.api.gouv.fr/communes?nom=${encodeURIComponent(q)}&fields=nom,code,codesPostaux,population,surface,centre,departement,region,epci&boost=population`;
  const r=await fetch(url,{headers:{Accept:'application/json'}});if(!r.ok)throw new Error('API commune indisponible ('+r.status+').');
  const data=await r.json();if(!Array.isArray(data)||!data.length)throw new Error('Commune introuvable. Précise davantage la ville.');
  let best=data[0];
  const loc=(state.location||'').toLowerCase();const exact=data.find(x=>loc.includes(String(x.nom||'').toLowerCase()));if(exact)best=exact;
  return{data:best,source:sourceEntry('API Découpage administratif — communes',url)};
}
function overpassQuery(lat,lon,radius){
  const specific=state.type==='food'?`["amenity"~"restaurant|cafe|bar|fast_food"]["name"]`:state.type==='tourism'?`["tourism"~"hotel|guest_house|camp_site|attraction|museum"]["name"]`:state.type==='commerce'?`["shop"]["name"]`:state.type==='sport'?`["leisure"~"sports_centre|fitness_centre|pitch|swimming_pool"]["name"]`:state.type==='event'?`["amenity"~"theatre|arts_centre|community_centre|events_venue"]["name"]`:`["amenity"~"restaurant|cafe|community_centre"]["name"]`;
  return `[out:json][timeout:22];(nwr(around:${radius},${lat},${lon})${specific};nwr(around:${radius},${lat},${lon})["tourism"~"hotel|guest_house|camp_site|attraction|museum"]["name"];nwr(around:${radius},${lat},${lon})["amenity"="parking"];nwr(around:${radius},${lat},${lon})["railway"="station"]["name"];nwr(around:${radius},${lat},${lon})["public_transport"="station"]["name"];nwr(around:${radius},${lat},${lon})["amenity"~"hospital|pharmacy|bank|fuel"]["name"];);out center tags 100;`;
}
function poiCategory(tags={}){
  if(tags.amenity==='parking'||tags.railway==='station'||tags.public_transport==='station')return'access';
  if(tags.tourism)return'tourism';
  if(['hospital','pharmacy','bank','fuel'].includes(tags.amenity))return'services';
  return'competition';
}
function distanceKm(lat1,lon1,lat2,lon2){const R=6371,toRad=x=>x*Math.PI/180,dLat=toRad(lat2-lat1),dLon=toRad(lon2-lon1),a=Math.sin(dLat/2)**2+Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))}
async function fetchPoisLive(commune){
  const c=commune.centre?.coordinates;if(!Array.isArray(c)||c.length<2)return{items:[],source:null};const [lon,lat]=c,radius=Number(state.territory.radius||5000),query=overpassQuery(lat,lon,radius),url='https://overpass-api.de/api/interpreter';
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'},body:'data='+encodeURIComponent(query)});if(!r.ok)throw new Error('OpenStreetMap/Overpass indisponible ('+r.status+').');const j=await r.json();
  const seen=new Set(),items=(j.elements||[]).map(e=>{const t=e.tags||{},plat=e.lat??e.center?.lat,plon=e.lon??e.center?.lon,name=t.name||({parking:'Parking'}[t.amenity])||'Équipement sans nom';if(plat==null||plon==null)return null;const key=name+'|'+Math.round(plat*10000)+'|'+Math.round(plon*10000);if(seen.has(key))return null;seen.add(key);return{name,category:poiCategory(t),distance:distanceKm(lat,lon,plat,plon),lat:plat,lon:plon,tags:{amenity:t.amenity||'',tourism:t.tourism||'',shop:t.shop||'',leisure:t.leisure||'',railway:t.railway||'',public_transport:t.public_transport||''}}}).filter(Boolean).sort((a,b)=>a.distance-b.distance).slice(0,80);
  return{items,source:sourceEntry('© OpenStreetMap contributors — Overpass API',url)};
}
async function researchTerritory(){
  ensureV8State();readProject();state.territory.radius=Number($('#territoryRadius')?.value||state.territory.radius||5000);if(!state.location)return toast('Renseigne d’abord une ville dans le projet.');
  const st=$('#territoryStatus');if(st)st.innerHTML='<b>Recherche en cours…</b> Commune officielle puis écosystème autour du projet.';
  const cached=readTerritoryCache();if(cached&&cached.updatedAt&&Date.now()-new Date(cached.updatedAt).getTime()<24*3600*1000){state.territory={...state.territory,...cached};save(false);renderTerritory();toast('Données territoriales chargées depuis le cache');return}
  try{
    const c=await fetchCommuneLive();let poi={items:[],source:null},poiError='';try{poi=await fetchPoisLive(c.data)}catch(e){poiError=e.message}
    state.territory.live=c.data;state.territory.poi=poi.items;state.territory.sources=[c.source,...(poi.source?[poi.source]:[])];state.territory.updatedAt=new Date().toISOString();state.territory.poiError=poiError;writeTerritoryCache({live:state.territory.live,poi:state.territory.poi,sources:state.territory.sources,updatedAt:state.territory.updatedAt,poiError,radius:state.territory.radius});
    addTerritoryEvidence();save(false);renderTerritory();renderAll();toast('Territoire analysé');
  }catch(e){if(st)st.innerHTML=`<b>Échec de la recherche.</b> ${esc(e.message)}`;toast(e.message)}
}
function addTerritoryEvidence(){
  const c=state.territory.live;if(!c)return;const label=`Données officielles commune — ${c.nom}`;if(!state.evidence.some(e=>e.label===label))state.evidence.push({label,detail:`Population ${frNumber(c.population)} · surface ${c.surface?frNumber(Math.round(c.surface/100)): 'n.c.'} km² · code ${c.code}. Source geo.api.gouv.fr, récupérée le ${new Date().toLocaleDateString('fr-FR')}.`,date:new Date().toLocaleDateString('fr-FR')});
  const p=state.territory.poi||[];if(p.length){const pl=`Écosystème local OpenStreetMap — ${c.nom}`;if(!state.evidence.some(e=>e.label===pl))state.evidence.push({label:pl,detail:`${p.length} équipements/activités repérés dans un rayon de ${Math.round(state.territory.radius/1000)} km via Overpass/OpenStreetMap. À vérifier avant toute décision commerciale.`,date:new Date().toLocaleDateString('fr-FR')})}
}
