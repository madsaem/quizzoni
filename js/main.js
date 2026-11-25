// Point d'entrée : réglages, barre du haut, navigation entre les écrans.
import * as store from './state.js';
import { sound } from './audio.js';
import './sons.js';   // packs de sons des thèmes ajoutés
import { loadCatalog } from './data.js';
import { applyTheme, applyMotion, openSettings, openThemes, soundIcon, THEMES } from './ui.js';
import { setMood } from './themefx.js';
import { music } from './music.js';
import { initAccount, openAccount, onAccountChange, accountButtonLabel } from './compte.js';
import { renderHome } from './views/home.js';
import { renderIntro } from './views/intro.js';
import { renderPlay } from './views/play.js';
import { renderResults } from './views/results.js';
import { h } from './utils.js';

const main = document.getElementById('main');
const topbar = document.querySelector('.topbar');

/* ------------------------------------------------------------- Réglages */
const st = store.settings();
// ancien thème supprimé (Cap Corse) : retour au thème par défaut
if (!THEMES.some((t) => t.id === st.theme)) store.setSetting('theme', 'officine');
sound.setEnabled(st.sound);
sound.setVolume(st.volume);
music.setEnabled({ music: st.music !== false, sound: st.sound });
applyTheme(store.settings().theme);
applyMotion(st.reducedMotion);

// le navigateur n'autorise le son qu'après un premier geste
const unlock = () => { sound.unlock(); music.unlock(); window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock); };
window.addEventListener('pointerdown', unlock);
window.addEventListener('keydown', unlock);

/* -------------------------------------------------------- Barre du haut */
const soundBtn = document.getElementById('sound-toggle');
const refreshSoundBtn = () => {
  soundBtn.replaceChildren(soundIcon());
  soundBtn.setAttribute('aria-pressed', String(store.settings().sound));
  soundBtn.setAttribute('aria-label', store.settings().sound ? 'Couper le son' : 'Activer le son');
};
soundBtn.addEventListener('click', () => {
  const on = !store.settings().sound;
  store.setSetting('sound', on);
  sound.setEnabled(on);
  music.setEnabled({ sound: on });
  refreshSoundBtn();
  sound.play('select');
});
document.addEventListener('soundchange', refreshSoundBtn);
refreshSoundBtn();

document.getElementById('settings-open').addEventListener('click', () => { sound.play('click'); openSettings(); });
document.getElementById('themes-open').addEventListener('click', () => { sound.play('click'); openThemes(); });
document.getElementById('account-open').addEventListener('click', () => { sound.play('click'); openAccount(); });
onAccountChange(() => { document.getElementById('account-label').textContent = accountButtonLabel(); });
initAccount();

/* ------------------------------------------------------------ Navigation */
let catalog = null;
let cleanup = null;

const routes = [
  [/^#?\/?$/, () => renderHome(main, catalog)],
  [/^#\/quiz\/([\w-]+)$/, (m) => renderIntro(main, m[1])],
  [/^#\/play$/, () => renderPlay(main)],
  [/^#\/resultats$/, () => renderResults(main)],
];

function route() {
  if (!catalog) return;   // le démarrage appellera route() une fois les quiz chargés
  const hash = location.hash || '#/';
  const found = routes.find(([re]) => re.test(hash));
  if (!found) { location.hash = '#/'; return; }
  const update = () => {
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    topbar.dataset.hidden = String(hash === '#/play');
    setMood(null);
    // musique : ambiance sur les menus, silence en partie, fanfare aux résultats
    if (hash === '#/play') music.quiet();
    else if (hash !== '#/resultats') { music.leaveOutcome(); music.menu(); }
    cleanup = found[1](hash.match(found[0]));
    if (hash !== '#/play') window.scrollTo(0, 0);
  };
  update();
}

window.addEventListener('hashchange', route);
document.addEventListener('progressreset', route);

/* ------------------------------------------------------------- Démarrage */
(async () => {
  try {
    catalog = await loadCatalog();
  } catch (e) {
    console.error(e);
    main.replaceChildren(h('div', { class: 'wrap', style: { paddingBlock: '4rem' } },
      h('h1', { style: { fontSize: 'var(--t-3xl)' } }, 'Les quiz n\'ont pas pu être chargés'),
      h('p', { style: { marginTop: '1rem', maxWidth: '60ch' } },
        location.protocol === 'file:'
          ? 'Le site doit être ouvert via un petit serveur local, pas en double-cliquant sur index.html. Lance start.command (Mac) ou start.bat (Windows), puis ouvre l\'adresse affichée.'
          : 'Vérifie que le dossier data/ est bien présent à côté de index.html, puis recharge la page.')));
    return;
  }
  route();
})();
