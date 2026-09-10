/* JLG Project Lab 360 — V10.9 Android APK installer */
(()=>{
  const VERSION='10.9.0';
  const APK_URL='./downloads/JLG-Project-Lab-360.apk?v='+VERSION;
  const $=s=>document.querySelector(s);
  const ua=navigator.userAgent||'';
  const isAndroid=/Android/i.test(ua);
  const isIOS=/iPhone|iPad|iPod/i.test(ua);
  const isNative=/JLGProjectLabAndroid/i.test(ua)||localStorage.getItem('jlg360_native_android')==='1';
  const notify=m=>{try{typeof window.toast==='function'?window.toast(m):console.info(m)}catch{}};
  let installPrompt=window.__jlgInstallPrompt||null;

  function hideInNative(){
    if(!isNative)return false;
    const bar=$('#jlgInstallStaticBar');if(bar)bar.style.display='none';
    return true;
  }

  function androidHelp(){
    document.querySelector('.jlg-install-help')?.remove();
    const m=document.createElement('div');m.className='jlg-install-help';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:20px;touch-action:auto';
    m.innerHTML='<div style="width:min(460px,100%);background:#0a1724;color:white;border:1px solid #34506a;border-radius:20px;padding:20px"><h3>Installer JLG Project Lab 360</h3><p>L’application Android V10.9 va être téléchargée. Ouvre ensuite <b>JLG-Project-Lab-360.apk</b> et valide <b>Installer</b>.</p><p>Cette version ajoute les contrôles interactifs, les PDF et l’enregistrement natif dans Téléchargements.</p><div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px"><a class="btn primary" href="'+APK_URL+'" download="JLG-Project-Lab-360.apk">Télécharger l’application Android</a><button class="btn ghost" data-close type="button">Fermer</button></div></div>';
    document.body.appendChild(m);
    m.querySelector('[data-close]')?.addEventListener('click',()=>m.remove(),{once:true});
    m.addEventListener('click',e=>{if(e.target===m)m.remove()});
  }

  async function install(){
    if(hideInNative())return;
    if(isAndroid){androidHelp();return}
    installPrompt=window.__jlgInstallPrompt||installPrompt;
    if(installPrompt){try{installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;window.__jlgInstallPrompt=null;return}catch(e){console.warn(e)}}
    if(isIOS){alert('Sur iPhone : Safari → Partager → Sur l’écran d’accueil.');return}
    notify('Dans le menu du navigateur, choisis Installer l’application.');
  }

  function wireButton(){
    if(hideInNative())return;
    const bar=$('#jlgInstallStaticBar');const btn=$('#jlgInstallHeaderBtn');
    if(bar)bar.style.display='flex';
    if(btn){btn.style.display='inline-flex';btn.style.alignItems='center';btn.style.justifyContent='center';btn.textContent=isAndroid?'⬇ Installer l’application Android':'⬇ Installer l’application';btn.onclick=install}
  }

  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.__jlgInstallPrompt=e;wireButton()});
  window.addEventListener('appinstalled',()=>notify('JLG Project Lab 360 est installée'));
  wireButton();setTimeout(wireButton,400);
})();
