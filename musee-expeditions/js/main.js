/* Musée & Expéditions — main.js : démarrage, chargement de la sauvegarde. */
(function (G) {
  'use strict';
  const ME = G.ME;
  let state = ME.State.load();
  const isNew = !state;
  if (!state) { state = ME.State.newGame(); ME.State.save(state); }
  ME.UI.setState(state);
  ME.UI.bind();
  ME.UI.render();
  if (isNew) ME.UI.welcome();
  G.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') ME.State.save(ME.UI.getState()); });
  G.addEventListener('pagehide', () => ME.State.save(ME.UI.getState()));
  // Application installable : service worker (hors ligne) et invite d'installation
  ME.install = { prompt: null, standalone: G.matchMedia && G.matchMedia('(display-mode: standalone)').matches || G.navigator.standalone === true };
  if (!G.ME_SINGLE_FILE && 'serviceWorker' in G.navigator && /^https:|^http:\/\/localhost/.test(G.location.href)) {
    try { G.navigator.serviceWorker.register('sw.js').catch(() => {}); } catch (e) { /* aperçu intégré : non disponible */ }
  }
  G.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    ME.install.prompt = e;
    const b = document.getElementById('installBtn'); if (b) b.hidden = false;
  });
  G.addEventListener('appinstalled', () => {
    ME.install.prompt = null; ME.install.standalone = true;
    const b = document.getElementById('installBtn'); if (b) b.hidden = true;
    ME.UI.toast('Musée & Expéditions est installé sur cet appareil.', 'success');
  });
  G.ME_READY = true;
})(window);
