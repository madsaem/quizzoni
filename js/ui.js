// Éléments d'interface partagés : thèmes, dialogue de confirmation, réglages, toast.
import { h } from './utils.js';
import { icon } from './icons.js';
import * as store from './state.js';
import { sound } from './audio.js';

export const THEMES = [
  { id: 'officine', name: 'Officine' },
  { id: 'nuit', name: 'Garde de nuit' },
  { id: 'corse', name: 'Cap Corse' },
];

export function applyTheme(id) {
  const theme = THEMES.find((t) => t.id === id) ? id : 'officine';
  document.documentElement.dataset.theme = theme;
  sound.setPack(theme);
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

  const themeBtns = THEMES.map((t) => {
    const b = h('button', {
      type: 'button',
      class: 'theme-pick__opt',
      role: 'radio',
      'aria-checked': String(st.theme === t.id),
      onClick: () => {
        store.setSetting('theme', t.id);
        applyTheme(t.id);
        themeBtns.forEach((x) => x.setAttribute('aria-checked', String(x === b)));
        sound.play('select');
      },
    },
    h('span', { class: 'theme-pick__swatch', 'data-theme': t.id, 'aria-hidden': 'true' },
      h('span', { style: { background: 'var(--stage)' } }),
      h('span', { style: { background: 'var(--c1)' } }),
      h('span', { style: { background: 'var(--c2)' } }),
      h('span', { style: { background: 'var(--c3)' } }),
      h('span', { style: { background: 'var(--c4)' } })),
    h('span', { class: 'theme-pick__name' }, t.name));
    return b;
  });

  const soundSwitch = h('input', {
    type: 'checkbox', class: 'switch', id: 'set-sound', checked: st.sound,
    onChange: (e) => {
      store.setSetting('sound', e.target.checked);
      sound.setEnabled(e.target.checked);
      document.dispatchEvent(new CustomEvent('soundchange'));
      sound.play('select');
    },
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
      h('span', { class: 'setting__label', id: 'theme-label' }, 'Thème'),
      h('div', { class: 'theme-pick', role: 'radiogroup', 'aria-labelledby': 'theme-label' }, themeBtns),
      h('p', { class: 'setting__hint' }, 'Chaque thème a ses propres couleurs et ses propres sons.')),
    h('div', { class: 'setting' },
      h('div', { class: 'switch-row' }, h('label', { for: 'set-sound' }, 'Sons'), soundSwitch),
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

/** Pastilles de difficulté (1 à 3 gélules pleines). */
export function levelPills(n) {
  return h('span', { class: 'lvl', dataset: { n: String(n) }, 'aria-hidden': 'true' }, h('span'), h('span'), h('span'));
}

export function soundIcon() { return icon(store.settings().sound ? 'soundOn' : 'soundOff'); }
