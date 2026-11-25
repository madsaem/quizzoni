// Éléments d'interface partagés : thèmes, dialogue de confirmation, réglages, toast.
import { h } from './utils.js';
import { icon } from './icons.js';
import * as store from './state.js';
import { sound } from './audio.js';
import { music } from './music.js';
import { setBackdrop } from './backdrop.js';

export const THEMES = [
  { id: 'officine', name: 'Officine', desc: 'Clair, les couleurs franches de la pharmacie.', sounds: 'Sons d\'arcade' },
  { id: 'nuit', name: 'Garde de nuit', desc: 'Sombre et doux, pour réviser tard sans s\'abîmer les yeux.', sounds: 'Sons feutrés' },
  { id: 'contraste', name: 'Contraste élevé', desc: 'Noir profond, contours jaunes, blancs et cyan. Lisibilité maximale.', sounds: 'Bips nets' },
  { id: 'etoiles', name: 'Nuit étoilée', desc: 'Ciel animé, étoiles filantes, constellations qui dérivent sur les touches.', sounds: 'Carillons' },
  { id: 'pinksoni', name: 'Pinksoni', desc: 'Rose en dégradé, étoiles filantes qui éclatent en cœurs, fleurs qui éclosent sur les bonnes réponses.', sounds: 'Clochettes de cristal' },
  { id: 'mayuff', name: 'Mayuff', desc: 'Deux puffs géantes en 3D, fumée dans les touches, fond rose quand tu réussis, rouge quand tu rates.', sounds: 'Bulles de chewing-gum' },
  { id: 'warfare', name: 'Warfare', desc: 'Hologramme vert, globe radar, lignes de balayage.', sounds: 'Sons de menu militaires', music: true },
  { id: 'automne', name: 'Automne', desc: 'Soleil bas, arbres roux, feuilles qui tombent, boutons en tricot de pull à losanges.', sounds: 'Bois et feuilles' },
  { id: 'scarlet', name: 'Scarlet', desc: 'Le manoir écarlate sous la lune de sang : la lance rouge traverse le ciel, le temps s\'arrête parfois.', sounds: 'Clavecin et couteaux', music: true },
  { id: 'gilded', name: 'Gilded', desc: 'Cuir frappé d\'un monogramme doré et irisé, boutons cousus, rivets et pièces d\'or.', sounds: 'Pièces d\'or' },
  { id: 'grunge', name: 'Grunge', desc: 'Cave rouillée, ampoule qui grésille, toiles d\'araignée, tôle larmée sur les boutons.', sounds: 'Métal et gouttes', music: true },
  { id: 'ifsi', name: 'IFSI', desc: 'Feuille d\'écolier à carreaux Seyès et boutons de site des années 2000.', sounds: 'Stylo et sonnerie' },
  { id: 'david', name: 'David', desc: 'Le drapeau bleu et blanc flotte en fond, étoile de David, Hava Nagila au menu.', sounds: 'Clarinette et tambourin', music: true },
  { id: 'bazaar', name: 'Bazaar', desc: 'Souk en grès, arcades, lanternes et enseignes en arabe, boutons en zellige.', sounds: 'Oud et darbouka', music: true },
];

export function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) ? id : 'officine';
  document.documentElement.dataset.theme = theme;
  sound.setPack(theme);
  setBackdrop(theme);
  music.setTheme(theme);
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
}

export function applyMotion(reduced) {
  if (reduced) document.documentElement.dataset.motion = 'reduced';
  else delete document.documentElement.dataset.motion;
}

export function toast(message, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const el = h('div', { class: 'toast', role: 'status' }, message);
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

/** Dialogue de confirmation. Renvoie une promesse : true si confirmé. */
export function confirmDialog({ title, text, confirm = 'Confirmer', cancel = 'Annuler', danger = false }) {
  return new Promise((resolve) => {
    const dlg = h('dialog', { class: 'dialog', 'aria-labelledby': 'dlg-title' });
    const close = (v) => { dlg.close(); dlg.remove(); resolve(v); };
    const cancelBtn = h('button', { type: 'button', class: 'key key--ghost', onClick: () => { sound.play('click'); close(false); } }, cancel);
    const okBtn = h('button', {
      type: 'button',
      class: 'key',
      style: danger ? { '--k-bg': 'var(--bad)', '--k-ink': '#fff' } : null,
      onClick: () => { sound.play('click'); close(true); },
    }, confirm);
    dlg.append(h('div', { class: 'dialog__inner', style: danger ? { borderTopColor: 'var(--bad)' } : null },
      h('h2', { id: 'dlg-title' }, title),
      text ? h('p', { class: 'dialog__lead' }, text) : null,
      h('div', { class: 'dialog__actions' }, cancelBtn, okBtn)));
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(false); });
    document.body.append(dlg);
    dlg.showModal();
    cancelBtn.focus();
  });
}

/** Fenêtre des réglages : thème, son, animations, remise à zéro. */
export function openSettings() {
  const st = store.settings();
  const dlg = h('dialog', { class: 'dialog', 'aria-labelledby': 'set-title' });

  const themeName = h('b', {}, THEMES.find((t) => t.id === st.theme)?.name || 'Officine');
  const themeBtn = h('button', {
    type: 'button', class: 'key key--ghost key--sm',
    onClick: () => { sound.play('click'); close(); openThemes(); },
  }, 'Changer de thème');

  const soundSwitch = h('input', {
    type: 'checkbox', class: 'switch', id: 'set-sound', checked: st.sound,
    onChange: (e) => {
      store.setSetting('sound', e.target.checked);
      sound.setEnabled(e.target.checked);
      music.setEnabled({ sound: e.target.checked });
      document.dispatchEvent(new CustomEvent('soundchange'));
      sound.play('select');
    },
  });
  const musicSwitch = h('input', {
    type: 'checkbox', class: 'switch', id: 'set-music', checked: st.music !== false,
    onChange: (e) => { store.setSetting('music', e.target.checked); music.setEnabled({ music: e.target.checked }); sound.play('select'); },
  });
  const volume = h('input', {
    type: 'range', class: 'volume', min: 0, max: 1, step: 0.05, value: st.volume,
    'aria-label': 'Volume',
    onInput: (e) => { sound.setVolume(+e.target.value); },
    onChange: (e) => { store.setSetting('volume', +e.target.value); sound.play('correct'); },
  });
  const motionSwitch = h('input', {
    type: 'checkbox', class: 'switch', id: 'set-motion', checked: st.reducedMotion,
    onChange: (e) => { store.setSetting('reducedMotion', e.target.checked); applyMotion(e.target.checked); },
  });

  const resetBtn = h('button', {
    type: 'button', class: 'key key--ghost key--sm',
    onClick: async () => {
      const ok = await confirmDialog({
        title: 'Effacer ta progression ?',
        text: 'Records, statistiques et erreurs à revoir seront supprimés de cet appareil. Tes réglages sont conservés.',
        confirm: 'Tout effacer',
        cancel: 'Garder',
        danger: true,
      });
      if (ok) { store.resetProgress(); toast('Progression effacée.'); document.dispatchEvent(new CustomEvent('progressreset')); }
    },
  }, 'Effacer ma progression');

  const close = () => { dlg.close(); dlg.remove(); };
  dlg.append(h('div', { class: 'dialog__inner' },
    h('h2', { id: 'set-title' }, 'Réglages'),
    h('p', { class: 'dialog__lead' }, 'Enregistrés sur cet appareil.'),
    h('div', { class: 'setting' },
      h('div', { class: 'switch-row' }, h('span', {}, 'Thème : ', themeName), themeBtn)),
    h('div', { class: 'setting' },
      h('div', { class: 'switch-row' }, h('label', { for: 'set-sound' }, 'Sons'), soundSwitch),
      h('div', { class: 'switch-row' }, h('label', { for: 'set-music' }, 'Musique des thèmes', h('small', { class: 'setting__hint', style: { display: 'block', marginTop: 0 } }, `Thèmes ${THEMES.filter((t) => t.music).map((t) => t.name).join(', ')}`)), musicSwitch),
      h('div', { class: 'switch-row' }, h('span', {}, 'Volume'), h('div', { style: { flex: '0 1 12rem' } }, volume)),
      h('div', { class: 'switch-row' }, h('label', { for: 'set-motion' }, 'Réduire les animations'), motionSwitch)),
    h('div', { class: 'dialog__actions', style: { justifyContent: 'space-between' } },
      resetBtn,
      h('button', { type: 'button', class: 'key', onClick: () => { sound.play('click'); close(); } }, 'Fermer'))));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
}

/** Fenêtre « Thèmes » : un aperçu par thème, appliqué dès qu'on le touche. */
export function openThemes() {
  const st = store.settings();
  const dlg = h('dialog', { class: 'dialog dialog--themes', 'aria-labelledby': 'th-title' });
  const close = () => { dlg.close(); dlg.remove(); };
  const cards = THEMES.map((t) => {
    const card = h('button', {
      type: 'button', class: 'tcard', role: 'radio',
      'aria-checked': String(st.theme === t.id),
      onClick: () => {
        store.setSetting('theme', t.id);
        applyTheme(t.id);
        cards.forEach((c) => c.setAttribute('aria-checked', String(c === card)));
        sound.play('select');
      },
    },
    h('span', { class: 'tprev', 'data-theme': t.id, 'aria-hidden': 'true' },
      h('span', { class: 'tprev__q' }, 'Antidote des AVK ?'),
      h('span', { class: 'tprev__grid' }, ['--c1', '--c2', '--c3', '--c4'].map((c) => h('span', { class: 'tprev__tile', style: { '--t': `var(${c})` } })))),
    h('span', { class: 'tcard__name' }, t.name, h('span', { class: 'tcard__on' }, 'Actif')),
    h('span', { class: 'tcard__desc' }, t.desc),
    h('span', { class: 'tcard__music' }, icon('soundOn'), t.music ? `${t.sounds} et musique` : t.sounds));
    return card;
  });
  dlg.append(h('div', { class: 'dialog__inner' },
    h('h2', { id: 'th-title' }, 'Thèmes'),
    h('p', { class: 'dialog__lead' }, 'Chaque thème change les couleurs, les sons et parfois le fond. Il s\'applique tout de suite.'),
    h('div', { class: 'tcards', role: 'radiogroup', 'aria-labelledby': 'th-title' }, cards),
    h('div', { class: 'dialog__actions' },
      h('button', { type: 'button', class: 'key', onClick: () => { sound.play('click'); close(); } }, 'Fermer'))));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  dlg.showModal();
  cards.find((c) => c.getAttribute('aria-checked') === 'true')?.focus();
}

/** Pastilles de difficulté (1 à 3 gélules pleines). */
export function levelPills(n) {
  return h('span', { class: 'lvl', dataset: { n: String(n) }, 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
}

export function soundIcon() { return icon(store.settings().sound ? 'soundOn' : 'soundOff'); }
