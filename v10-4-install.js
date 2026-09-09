/* JLG Project Lab 360 — V10.6.1 reliable Android install controller */
(()=>{
  const VERSION='10.6.1';
  const INSTALL_URL='https://jumerca.github.io/Jlg-project-builder-/?v='+VERSION+'&install=1';
  const $=s=>document.querySelector(s);
  const ua=navigator.userAgent||'';
  const isAndroid=/Android/i.test(ua);
  const isIOS=/iPhone|iPad|iPod/i.test(ua);
  const isChrome=/Chrome\/\d+/i.test(ua)&&!/SamsungBrowser|EdgA|OPR|\bwv\b/i.test(ua);
  const notify=m=>{try{typeof window.toast==='function'?window.toast(m):console.info(m)}catch{}};
  let installPrompt=window.__jlgInstallPrompt||null;

  async function copyInstallLink(){
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(INSTALL_URL)}
      else{
        const t=document.createElement('textarea');t.value=INSTALL_URL;t.style.position='fixed';t.style.opacity='0';document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();
      }
      notify('Lien copié — ouvre Chrome et colle-le dans la barre d’adresse');
      const msg=document.querySelector('[data-copy-status]');if(msg)msg.textContent='✓ Lien copié. Ouvre Chrome puis colle-le dans la barre d’adresse.';
    }catch(e){console.warn(e);notify('Impossible de copier automatiquement le lien')}
  }

  function tryExternalBrowser(){
    const w=window.open(INSTALL_URL,'_blank','noopener,noreferrer');
    if(!w)notify('Ouverture bloquée : utilise « Copier le lien pour Chrome »');
  }

  function showHelp(kind){
    document.querySelector('.jlg-install-help')?.remove();
    const m=document.createElement('div');
    m.className='jlg-install-help';
    m.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.78);display:grid;place-items:center;padding:20px;touch-action:auto';
    let text='',actions='';
    if(kind==='android'){
      text='<p>Tu es dans un navigateur intégré. Android ne me permet pas de forcer Chrome proprement depuis ici.</p><p><b>Méthode fiable :</b> copie le lien, ouvre Chrome, colle-le dans la barre d’adresse, puis appuie sur <b>⬇ Installer l’application</b>.</p><p data-copy-status style="color:#8ed7ff"></p>';
      actions='<button class="btn primary" data-copy type="button">Copier le lien pour Chrome</button><button class="btn ghost" data-browser type="button">Essayer d’ouvrir le navigateur</button>';
    }else if(kind==='chrome'){
      text='<p>Tu es bien dans Chrome, mais le bouton d’installation natif n’est pas encore proposé.</p><p>Appuie sur le menu <b>⋮</b> de Chrome puis choisis <b>Installer l’application</b>. Si cette option n’apparaît pas, recharge cette page une fois.</p>';
    }else{
      text='<p>Sur iPhone : ouvre la page dans Safari → Partager → Sur l’écran d’accueil.</p>';
    }
    m.innerHTML='<div style="width:min(460px,100%);background:#0a1724;color:white;border:1px solid #34506a;border-radius:20px;padding:20px"><h3>Installer JLG Project Lab 360</h3>'+text+'<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:14px">'+actions+'<button class="btn ghost" data-close type="button">Fermer</button></div></div>';
    document.body.appendChild(m);
    m.querySelector('[data-copy]')?.addEventListener('click',copyInstallLink);
    m.querySelector('[data-browser]')?.addEventListener('click',tryExternalBrowser);
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
    if(isAndroid){showHelp(isChrome?'chrome':'android');return}
    if(isIOS){showHelp('ios');return}
    notify('Dans le menu du navigateur, choisis Installer l’application.');
  }

  function wireButton(){
    const bar=$('#jlgInstallStaticBar');
    const btn=$('#jlgInstallHeaderBtn');
    if(bar)bar.style.display='flex';
    if(btn){
      btn.style.display='inline-flex';btn.style.alignItems='center';btn.style.justifyContent='center';btn.onclick=install;
    }
  }

  document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;window.__jlgInstallPrompt=e;wireButton()});
  window.addEventListener('jlginstallready',()=>{installPrompt=window.__jlgInstallPrompt||installPrompt;wireButton()});
  window.addEventListener('appinstalled',()=>notify('JLG Project Lab 360 est installée'));
  wireButton();setTimeout(wireButton,500);
})();
