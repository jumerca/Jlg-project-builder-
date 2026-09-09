/* JLG Project Lab 360 — V10 Final: encrypted multi-device sync client */
const V10_VERSION='10.0.0';
function ensureV10State(){
  state.final=state.final||{};
  state.final.sync=state.final.sync||{};
  state.final.sync.deviceId=state.final.sync.deviceId||localStorage.getItem('jlg360_device_id')||('dev_'+cryptoRandomId(18));
  state.final.sync.deviceName=state.final.sync.deviceName||localStorage.getItem('jlg360_device_name')||defaultDeviceName();
  state.final.sync.endpoint=state.final.sync.endpoint||localStorage.getItem('jlg360_sync_endpoint')||'';
  state.final.sync.channelCode=state.final.sync.channelCode||localStorage.getItem('jlg360_sync_code')||'';
  state.final.sync.remoteRevision=state.final.sync.remoteRevision||'';
  state.final.sync.lastSyncAt=state.final.sync.lastSyncAt||'';
  state.final.sync.lastSyncProjectAt=state.final.sync.lastSyncProjectAt||'';
  state.final.sync.queue=Array.isArray(state.final.sync.queue)?state.final.sync.queue:[];
  state.final.sync.auto=state.final.sync.auto!==false;
  localStorage.setItem('jlg360_device_id',state.final.sync.deviceId);
  localStorage.setItem('jlg360_device_name',state.final.sync.deviceName);
}
function cryptoRandomId(len=20){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',a=new Uint8Array(len);crypto.getRandomValues(a);return Array.from(a,b=>chars[b%chars.length]).join('')}
function defaultDeviceName(){const ua=navigator.userAgent||'';if(/Android/i.test(ua))return'Android';if(/iPhone|iPad/i.test(ua))return'iPhone / iPad';if(/Windows/i.test(ua))return'PC Windows';if(/Mac/i.test(ua))return'Mac';return'Appareil'}
function generateSyncCode(){return Array.from({length:5},()=>cryptoRandomId(4)).join('-')}
function normalizeSyncCode(x){return String(x||'').toUpperCase().replace(/[^A-Z2-9]/g,'').match(/.{1,4}/g)?.join('-')||''}
function injectV10Shell(){
  document.title='JLG Project Lab 360 — V10 Final';
  const vp=document.querySelector('.version-pill');if(vp)vp.textContent='V10';
  const bs=document.querySelector('.brand small');if(bs)bs.textContent='V10 Final · projet, terrain, exécution & sync';
  if(!document.querySelector('link[href*="v10.css"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='./v10.css?v=10.0.0';document.head.appendChild(l)}
  const tabs=$('#tabs');if(tabs&&!tabs.querySelector('[data-page="syncfinal"]')){const ai=tabs.querySelector('[data-page="ai"]');(ai||tabs.lastElementChild)?.insertAdjacentHTML(ai?'beforebegin':'afterend','<button class="tab" data-page="syncfinal">Sync & IA</button>')}
  const aiPage=$('#ai');if(aiPage&&!$('#syncfinal'))aiPage.insertAdjacentHTML('beforebegin',`<section id="syncfinal" class="page">
    <div class="section-title"><div><span class="section-kicker">V10 · FINAL</span><h2>Synchronisation & Studio IA</h2></div><p>Le projet reste utilisable hors ligne. Les services externes sont optionnels.</p></div>
    <div id="finalStatus" class="final-status"></div>
    <div class="final-grid">
      <div class="final-card sync-card">
        <div class="card-head"><div><span class="eyebrow">MULTI-APPAREILS</span><h3>Synchronisation chiffrée</h3></div><span id="syncHealth" class="status alert">LOCAL</span></div>
        <p class="muted">Le navigateur chiffre le projet avant l’envoi. Le serveur de sync ne reçoit que du contenu chiffré et un identifiant de canal dérivé du code.</p>
        <div class="grid g2">
          <label>Nom de cet appareil<input id="v10DeviceName" class="field" placeholder="Mon téléphone"></label>
          <label>Endpoint de synchronisation<input id="v10SyncEndpoint" class="field" placeholder="https://...workers.dev/sync"></label>
          <label style="grid-column:1/-1">Code de synchronisation<input id="v10SyncCode" class="field sync-code" autocomplete="off" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"></label>
        </div>
        <div class="row" style="margin-top:10px"><button id="v10GenerateCode" class="btn ghost">Générer un code</button><button id="v10SaveSync" class="btn">Enregistrer</button><button id="v10Push" class="btn primary">Envoyer</button><button id="v10Pull" class="btn">Récupérer</button></div>
        <div id="v10SyncMeta" class="sync-meta"></div>
        <div id="v10Conflict" class="conflict-box hidden"></div>
        <div class="separator"></div>
        <label class="toggle-line"><input id="v10AutoSync" type="checkbox" checked><span>Synchronisation automatique après sauvegarde quand la connexion est disponible</span></label>
        <div id="v10Queue" class="queue-box"></div>
      </div>
      <div class="final-card">
        <div class="card-head"><div><span class="eyebrow">STUDIO IA</span><h3>Analyse & visuels</h3></div><span id="aiGatewayHealth" class="status alert">OPTIONNEL</span></div>
        <p class="muted">Aucune clé API n’est enregistrée dans l’application. Le Studio utilise uniquement une passerelle serveur que tu choisis.</p>
        <label>Passerelle IA<input id="v10AiEndpoint" class="field" placeholder="https://.../ai"></label>
        <div class="ai-mode-row"><button class="seg active" data-v10-ai-mode="analysis">Analyse</button><button class="seg" data-v10-ai-mode="visual">Visuel</button><button class="seg" data-v10-ai-mode="pitch">Pitch</button></div>
        <label>Mission<textarea id="v10AiPrompt" class="field ai-prompt" placeholder="Construis d’abord une mission"></textarea></label>
        <div class="row"><button id="v10BuildAi" class="btn">Construire la mission</button><button id="v10SendAi" class="btn primary">Envoyer</button><button id="v10DownloadAi" class="btn ghost">Télécharger le brief</button></div>
        <div id="v10AiResult" class="ai-result"><p class="muted">Aucun résultat.</p></div>
      </div>
    </div>
    <div class="section-title"><div><span class="section-kicker">ÉTAT FINAL</span><h2>Contrôle de livraison</h2></div><p>Tests fonctionnels de la couche finale.</p></div>
    <div id="v10FinalQa" class="qa-final"></div>
    <div class="row no-print"><button id="v10RunQa" class="btn primary">Lancer le contrôle final</button><button id="v10Backup" class="btn ghost">Sauvegarde complète JSON</button><button id="v10ResetQueue" class="btn bad">Vider la file sync</button></div>
  </section>`)
}
async function sha256Hex(text){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('')}
async function deriveSyncKey(code){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(code),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:new TextEncoder().encode('JLG-PROJECT-LAB-360-V10'),iterations:150000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
function b64bytes(a){let s='';a.forEach(x=>s+=String.fromCharCode(x));return btoa(s)}
function unb64(s){const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);return a}
async function encryptProjectV10(project,code){const key=await deriveSyncKey(code),iv=crypto.getRandomValues(new Uint8Array(12)),plain=new TextEncoder().encode(JSON.stringify(project)),buf=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,plain);return{alg:'AES-GCM/PBKDF2-SHA256',iv:b64bytes(iv),ciphertext:b64bytes(new Uint8Array(buf)),updatedAt:new Date().toISOString(),deviceId:state.final.sync.deviceId,deviceName:state.final.sync.deviceName,projectId:state.id||''}}
async function decryptProjectV10(payload,code){const key=await deriveSyncKey(code),plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(payload.iv)},key,unb64(payload.ciphertext));return JSON.parse(new TextDecoder().decode(plain))}
async function syncConfigV10(){ensureV10State();const endpoint=String($('#v10SyncEndpoint')?.value||state.final.sync.endpoint||'').trim().replace(/\/$/,''),code=normalizeSyncCode($('#v10SyncCode')?.value||state.final.sync.channelCode||'');if(!endpoint)throw new Error('Endpoint de synchronisation requis.');if(code.replace(/-/g,'').length<16)throw new Error('Code de synchronisation trop court.');const channel=await sha256Hex('channel:'+code);return{endpoint,code,channel,url:endpoint+'/'+channel}}
function projectEditedAtV10(){const all=JSON.parse(localStorage.getItem('jlg360_projects')||'{}');return all[state.id||'']?.savedAt||new Date().toISOString()}
function persistSyncConfigV10(){ensureV10State();state.final.sync.deviceName=($('#v10DeviceName')?.value||state.final.sync.deviceName||defaultDeviceName()).trim();state.final.sync.endpoint=($('#v10SyncEndpoint')?.value||'').trim().replace(/\/$/,'');state.final.sync.channelCode=normalizeSyncCode($('#v10SyncCode')?.value||'');state.final.sync.auto=!!$('#v10AutoSync')?.checked;localStorage.setItem('jlg360_device_name',state.final.sync.deviceName);localStorage.setItem('jlg360_sync_endpoint',state.final.sync.endpoint);localStorage.setItem('jlg360_sync_code',state.final.sync.channelCode);save(false);renderSyncV10();toast('Configuration enregistrée')}
function queueSyncV10(type){ensureV10State();state.final.sync.queue.push({id:'sq_'+Date.now()+'_'+cryptoRandomId(5),type,queuedAt:new Date().toISOString()});state.final.sync.queue=state.final.sync.queue.slice(-20);try{localStorage.setItem('jlg360_sync_queue',JSON.stringify(state.final.sync.queue))}catch{}renderSyncV10()}
function restoreQueueV10(){try{const q=JSON.parse(localStorage.getItem('jlg360_sync_queue')||'[]');if(Array.isArray(q)&&q.length)state.final.sync.queue=q}catch{}}
async function pushSyncV10({silent=false,force=false}={}){try{readProject();financeInputs();const cfg=await syncConfigV10();state.final.sync.endpoint=cfg.endpoint;state.final.sync.channelCode=cfg.code;if(!navigator.onLine){queueSyncV10('push');throw new Error('Hors ligne : envoi ajouté à la file.')}const encrypted=await encryptProjectV10(state,cfg.code),headers={'Content-Type':'application/json'};if(state.final.sync.remoteRevision&&!force)headers['If-Match']=state.final.sync.remoteRevision;const r=await fetch(cfg.url,{method:'PUT',headers,body:JSON.stringify(encrypted)});if(r.status===409){const remote=await r.json().catch(()=>({}));showConflictV10(remote.revision||'');throw new Error('Conflit détecté : une autre version existe sur le serveur.')}if(!r.ok)throw new Error('Sync HTTP '+r.status);const j=await r.json().catch(()=>({}));state.final.sync.remoteRevision=j.revision||r.headers.get('ETag')?.replace(/"/g,'')||'';state.final.sync.lastSyncAt=new Date().toISOString();state.final.sync.lastSyncProjectAt=projectEditedAtV10();state.final.sync.queue=[];localStorage.setItem('jlg360_sync_queue','[]');save(false);renderSyncV10();if(!silent)toast('Projet synchronisé')}catch(e){if(!/Hors ligne/.test(e.message)&&!silent)toast(e.message);renderSyncV10(e.message);if(!navigator.onLine||/Failed to fetch|NetworkError/i.test(e.message))queueSyncV10('push')}}
async function fetchRemoteV10(){const cfg=await syncConfigV10(),r=await fetch(cfg.url,{headers:{Accept:'application/json'}});if(r.status===404)throw new Error('Aucun projet distant pour ce code.');if(!r.ok)throw new Error('Sync HTTP '+r.status);const payload=await r.json(),project=await decryptProjectV10(payload,cfg.code);return{project,revision:payload.revision||r.headers.get('ETag')?.replace(/"/g,'')||'',payload}}
function importRemoteV10(remote,revision){state={...state,...remote,answers:remote.answers||{},evidence:remote.evidence||[],finance:remote.finance||{},workflow:remote.workflow||{},execution:remote.execution||{},territory:remote.territory||{},premium:remote.premium||{},final:remote.final||state.final||{}};ensureV10State();state.final.sync.remoteRevision=revision||state.final.sync.remoteRevision||'';state.final.sync.lastSyncAt=new Date().toISOString();state.final.sync.lastSyncProjectAt=projectEditedAtV10();fillProject();fillFinance();save(false);renderAll();renderSyncV10();toast('Version distante récupérée')}
async function pullSyncV10({silent=false}={}){try{if(!navigator.onLine)throw new Error('Connexion requise pour récupérer.');const x=await fetchRemoteV10(),localEdit=new Date(projectEditedAtV10()).getTime(),last=new Date(state.final.sync.lastSyncProjectAt||0).getTime(),remoteEdit=new Date(x.project?.savedAt||x.payload?.updatedAt||0).getTime();if(last&&localEdit>last+1500&&remoteEdit>last+1500){showConflictV10(x.revision,x.project);if(!silent)toast('Conflit local/distant à choisir');return}importRemoteV10(x.project,x.revision)}catch(e){if(!silent)toast(e.message);renderSyncV10(e.message)}}
function showConflictV10(revision='',remoteProject=null){const box=$('#v10Conflict');if(!box)return;box.classList.remove('hidden');box.innerHTML=`<b>Conflit de synchronisation</b><p>Une version distante et une version locale ont évolué. Choisis celle qui doit devenir la référence.</p><div class="row"><button class="btn small primary" id="v10UseLocal">Garder local</button><button class="btn small" id="v10UseRemote">Utiliser distant</button><button class="btn small ghost" id="v10CancelConflict">Plus tard</button></div>`;$('#v10UseLocal').onclick=()=>{state.final.sync.remoteRevision=revision;pushSyncV10({force:true});box.classList.add('hidden')};$('#v10UseRemote').onclick=async()=>{try{const x=remoteProject?{project:remoteProject,revision}:await fetchRemoteV10();importRemoteV10(x.project,x.revision);box.classList.add('hidden')}catch(e){toast(e.message)}};$('#v10CancelConflict').onclick=()=>box.classList.add('hidden')}
async function flushSyncQueueV10(){ensureV10State();if(!navigator.onLine||!state.final.sync.queue.length)return;const copy=[...state.final.sync.queue];state.final.sync.queue=[];for(const x of copy){if(x.type==='push')await pushSyncV10({silent:true});else if(x.type==='pull')await pullSyncV10({silent:true})}renderSyncV10()}
function renderSyncV10(err=''){ensureV10State();const set=(id,v)=>{const e=$(id);if(e)e.value=v};set('#v10DeviceName',state.final.sync.deviceName||'');set('#v10SyncEndpoint',state.final.sync.endpoint||'');set('#v10SyncCode',state.final.sync.channelCode||'');const auto=$('#v10AutoSync');if(auto)auto.checked=state.final.sync.auto!==false;const ok=!!state.final.sync.endpoint&&state.final.sync.channelCode.replace(/-/g,'').length>=16;const health=$('#syncHealth');if(health){health.className='status '+(state.final.sync.lastSyncAt?'ok':ok?'alert':'alert');health.textContent=state.final.sync.lastSyncAt?'SYNCHRO':ok?'PRÊT':'LOCAL'}const meta=$('#v10SyncMeta');if(meta)meta.innerHTML=`<div><span>Appareil</span><b>${esc(state.final.sync.deviceName)}</b></div><div><span>ID</span><b>${esc(state.final.sync.deviceId.slice(-8))}</b></div><div><span>Dernière sync</span><b>${state.final.sync.lastSyncAt?new Date(state.final.sync.lastSyncAt).toLocaleString('fr-FR'):'Jamais'}</b></div><div><span>Révision distante</span><b>${esc(state.final.sync.remoteRevision?state.final.sync.remoteRevision.slice(0,10):'—')}</b></div>${err?`<div class="sync-error"><span>État</span><b>${esc(err)}</b></div>`:''}`;const q=$('#v10Queue'),queue=state.final.sync.queue||[];if(q)q.innerHTML=queue.length?`<b>${queue.length} opération(s) en attente</b><p>${queue.map(x=>`${esc(x.type)} · ${new Date(x.queuedAt).toLocaleTimeString('fr-FR')}`).join(' · ')}</p>`:'<span class="muted">Aucune opération en attente.</span>';const top=$('#finalStatus');if(top)top.innerHTML=`<div><span class="eyebrow">V10 FINAL</span><h2>${navigator.onLine?'Application en ligne':'Mode hors ligne actif'}</h2><p>${state.final.sync.lastSyncAt?'Synchronisation multi-appareils configurée.':'Toutes les fonctions locales restent disponibles ; la synchronisation est optionnelle.'}</p></div><div class="final-version"><strong>V10</strong><span>Final</span></div>`}
function bindSyncV10(){
  $('#v10GenerateCode')&&($('#v10GenerateCode').onclick=()=>{$('#v10SyncCode').value=generateSyncCode();toast('Nouveau code généré — conserve-le sur tes appareils')});
  $('#v10SaveSync')&&($('#v10SaveSync').onclick=persistSyncConfigV10);$('#v10Push')&&($('#v10Push').onclick=()=>pushSyncV10());$('#v10Pull')&&($('#v10Pull').onclick=()=>pullSyncV10());
  $('#v10ResetQueue')&&($('#v10ResetQueue').onclick=()=>{state.final.sync.queue=[];localStorage.setItem('jlg360_sync_queue','[]');renderSyncV10();toast('File vidée')});
  window.addEventListener('online',()=>{renderSyncV10();flushSyncQueueV10()});window.addEventListener('offline',()=>renderSyncV10());
}
