(()=>{
  const VERSION='10.5.0';
  const $=s=>document.querySelector(s);
  const ua=navigator.userAgent||'';
  const isAndroid=/Android/i.test(ua);
  const isIOS=/iPhone|iPad|iPod/i.test(ua);
  const isChrome=/Chrome\/\d+/i.test(ua)&&!/SamsungBrowser|EdgA|OPR|\bwv\b/i.test(ua);
  let installPrompt=window.__jlgInstallPrompt||null;
  const notify=m=>{try{typeof window.toast==='function'?window.toast(m):console.info(m)}catch{}};

  function setVersion(){const v=$('.version-pill');if(v)v.textContent='V10.5';const s=$('.brand small');if(s)s.textContent='V10.5 Autonome · sans compte, sans backend';document.title='JLG Project Lab 360 — V10.5 Autonome'}
  function openChrome(){const target='jumerca.github.io/Jlg-project-builder-/?v='+VERSION+'&install=1';const fallback=encodeURIComponent('https://'+target);location.href='intent://'+target+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+fallback+';end'}
  function help(kind){document.querySelector('.jlg-install-help')?.remove();const m=document.createElement('div');m.className='jlg-install-help';m.style.cssText='position:fixed;inset:0;z-index:99999;background:#000c;display:grid;place-items:center;padding:20px';const body=kind==='android'?'<p>Pour une vraie installation Android qui apparaisse dans la liste de toutes tes applications, ouvre cette page dans <b>Chrome</b>, puis choisis <b>Installer l’application</b>.</p><p><b>Ne choisis pas seulement “Ajouter à l’écran d’accueil”.</b></p>':'<p>Sur iPhone : Safari → Partager → Sur l’écran d’accueil.</p>';m.innerHTML='<div style="width:min(440px,100%);background:#0a1724;color:white;border:1px solid #34506a;border-radius:20px;padding:20px"><h3>Installer JLG Project Lab 360</h3>'+body+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'+(kind==='android'?'<button class="btn primary" data-chrome type="button">Ouvrir dans Chrome</button>':'')+'<button class="btn ghost" data-close type="button">Fermer</button></div></div>';document.body.appendChild(m);m.querySelector('[data-chrome]')?.addEventListener('click',openChrome);m.querySelector('[data-close]').onclick=()=>m.remove()}
  async function install(){installPrompt=window.__jlgInstallPrompt||installPrompt;if(installPrompt){try{installPrompt.prompt();const c=await installPrompt.userChoice;installPrompt=null;window.__jlgInstallPrompt=null;if(c?.outcome==='accepted')notify('Installation Android lancée');return}catch(e){console.warn(e)}}if(isAndroid){if(!isChrome){openChrome();return}help('android');return}if(isIOS){help('ios');return}notify('Dans le menu du navigateur, choisis Installer l’application.')}
  function ensureButton(){let bar=$('#jlgInstallStaticBar');if(!bar){bar=document.createElement('div');bar.id='jlgInstallStaticBar';bar.className='no-print';bar.style.cssText='display:flex!important;justify-content:center;padding:8px 0 12px;position:relative;z-index:25';bar.innerHTML='<button id="jlgInstallHeaderBtn" class="btn primary" type="button" style="min-height:46px;border-radius:999px;padding:11px 20px;font-size:15px">⬇ Installer l’application</button>';$('#tabs')?.insertAdjacentElement('afterend',bar)}bar.style.display='flex';const b=$('#jlgInstallHeaderBtn');if(b){b.style.display='inline-flex';b.style.alignItems='center';b.style.justifyContent='center';b.textContent='⬇ Installer l’application';b.onclick=install}}
  document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
  new MutationObserver(()=>{document.querySelectorAll('#updateBanner').forEach(x=>x.remove());ensureButton()}).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.__jlgInstallPrompt=e;ensureButton()});
  window.addEventListener('jlginstallready',()=>{installPrompt=window.__jlgInstallPrompt||installPrompt;ensureButton()});
  window.addEventListener('appinstalled',()=>notify('JLG Project Lab 360 est installée'));
  setVersion();ensureButton();setTimeout(()=>{setVersion();ensureButton()},350);setTimeout(()=>{setVersion();ensureButton()},1200);
})();
