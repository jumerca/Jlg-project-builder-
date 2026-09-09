(()=>{
  const VERSION='10.4.0';
  const $=s=>document.querySelector(s);
  const isAndroid=/Android/i.test(navigator.userAgent||'');
  let installPrompt=null;
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
  function ensureButton(){
    let bar=$('#jlgInstallStaticBar');
    if(!bar){bar=document.createElement('div');bar.id='jlgInstallStaticBar';bar.className='no-print';bar.style.cssText='display:flex;justify-content:center;padding:8px 0 12px';bar.innerHTML='<button id="jlgInstallHeaderBtn" class="btn primary" type="button">Installer l’application</button>';$('#tabs')?.insertAdjacentElement('afterend',bar)}
    $('#jlgInstallHeaderBtn')?.addEventListener('click',async()=>{
      if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;return;}
      if(isAndroid){
        const target='https://jumerca.github.io/Jlg-project-builder-/?v='+VERSION+'&install=1';
        const m=document.createElement('div');m.style.cssText='position:fixed;inset:0;z-index:99999;background:#000c;display:grid;place-items:center;padding:20px';m.innerHTML='<div style="max-width:430px;background:#0a1724;color:white;border:1px solid #34506a;border-radius:20px;padding:20px"><h3>Installer Project Lab</h3><p>Pour une vraie installation Android qui apparaisse dans la liste des applications, ouvre cette page dans Chrome puis choisis <b>Installer l’application</b>, pas seulement Ajouter à l’écran d’accueil.</p><div style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn primary" href="'+target+'" target="_blank" rel="noopener">Ouvrir dans Chrome</a><button class="btn ghost" type="button">Fermer</button></div></div>';document.body.appendChild(m);m.querySelector('button').onclick=()=>m.remove();return;
      }
    },{once:true});
  }
  document.querySelectorAll('#updateBanner').forEach(x=>x.remove());
  new MutationObserver(()=>document.querySelectorAll('#updateBanner').forEach(x=>x.remove())).observe(document.body,{childList:true,subtree:true});
  ensureButton();setTimeout(ensureButton,600);
})();
