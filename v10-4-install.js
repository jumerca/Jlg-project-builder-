/* JLG Project Lab 360 — V10.6 safe install controller */
(()=>{
  const VERSION='10.6.0';
  const $=s=>document.querySelector(s);
  const ua=navigator.userAgent||'';
  const isAndroid=/Android/i.test(ua);
  const isIOS=/iPhone|iPad|iPod/i.test(ua);
  const isChrome=/Chrome\/\d+/i.test(ua)&&!/SamsungBrowser|EdgA|OPR|\bwv\b/i.test(ua);
  const notify=m=>{try{typeof window.toast==='function'?window.toast(m):console.info(m)}catch{}};
  let installPrompt=window.__jlgInstallPrompt||null;

  function openChrome(){
    const target='jumerca.github.io/Jlg-project-builder-/?v='+VERSION+'&install=1';
    const fallback=encodeURIComponent('https://'+target);
    location.href='intent://'+target+'#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+fallback+';end';
  }

  function showHelp(kind){
    document.querySelector('.jlg-install-help')?.remove();
    const m=document.createElement('div');
    m.className='jlg-install-help';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:20px;touch-action:auto';
    const text=kind==='android'
      ?'<p>Pour une vraie installation Android qui apparaisse dans la liste de toutes tes applications, ouvre cette page dans <b>Chrome</b> puis choisis <b>Installer l’application</b>.</p><p><b>Ne choisis pas seulement “Ajouter à l’écran d’accueil”.</b></p>'
      :'<p>Sur iPhone : Safari → Partager → Sur l’écran d’accueil.</p>';
    m.innerHTML='<div style="width:min(440px,100%);background:#0a1724;color:white;border:1px solid #34506a;border-radius:20px;padding:20px"><h3>Installer JLG Project Lab 360</h3>'+text+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'+(kind==='android'?'<button class="btn primary" data-chrome type="button">Ouvrir dans Chrome</button>':'')+'<button class="btn ghost" data-close type="button">Fermer</button></div></div>';
    document.body.appendChild(m);
    m.querySelector('[data-chrome]')?.addEventListener('click',openChrome,{once:true});
    m.querySelector('[data-close]')?.addEventListener('click',()=>m.remove(),{once:true});
    m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  }

  async function install(){
    installPrompt=window.__jlgInstallPrompt||installPrompt;
    if(installPrompt){
      try{
        installPrompt.prompt();
        const choice=await installPrompt.userChoice;
        installPrompt=null;window.__jlgInstallPrompt=null;
        if(choice?.outcome==='accepted')notify('Installation Android lancée');
        return;
      }catch(e){console.warn('Install prompt',e)}
    }
    if(isAndroid){
      if(!isChrome){openChrome();return}
      showHelp('android');return;
    }
    if(isIOS){showHelp('ios');return}
    notify('Dans le menu du navigateur, choisis Installer l’application.');
  }

  function wireButton(){
    const bar=$('#jlgInstallStaticBar');
    const btn=$('#jlgInstallHeaderBtn');
    if(bar)bar.style.display='flex';
    if(btn){
      btn.style.display='inline-flex';
      btn.style.alignItems='center';
      btn.style.justifyContent='center';
      btn.onclick=install;
    }
  }

  document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.__jlgInstallPrompt=e;wireButton()});
  window.addEventListener('jlginstallready',()=>{installPrompt=window.__jlgInstallPrompt||installPrompt;wireButton()});
  window.addEventListener('appinstalled',()=>notify('JLG Project Lab 360 est installée'));
  wireButton();
  setTimeout(wireButton,500);
})();
