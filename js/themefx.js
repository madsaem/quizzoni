// Effets de réponse propres à certains thèmes.
//   pinksoni : des fleurs éclosent au lieu des confettis sur une bonne réponse
//   mayuff   : le fond passe au monogramme rose (réussi) ou rouge rosé (raté)
//   automne, gilded, scarlet : feuilles, pièces d'or ou couteaux d'argent jaillissent de la réponse
import { prefersReducedMotion } from './utils.js';

const theme = () => document.documentElement.dataset.theme;

/** Humeur du fond (Mayuff) : 'win', 'lose' ou null. */
export function setMood(mood) {
  const root = document.documentElement;
  if (mood) root.dataset.mood = mood;
  else delete root.dataset.mood;
}

/**
 * Appelé après chaque réponse. Renvoie true si le thème remplace les confettis.
 * @param {'good'|'mid'|'bad'} kind
 */
export function answerFx(kind, x, y) {
  const t = theme();
  if (t === 'mayuff') {
    setMood(kind === 'good' ? 'win' : kind === 'bad' ? 'lose' : null);
    return false;
  }
  if (t === 'pinksoni' && kind !== 'bad') {
    bloom(x, y, kind === 'good' ? 3 + Math.round(Math.random() * 2) : 2);
    return true;
  }
  if (FLING[t] && kind !== 'bad') {
    fling(x, y, kind === 'good' ? FLING[t].n : Math.ceil(FLING[t].n / 3), FLING[t].make);
    return true;
  }
  return false;
}

/* ------------------------------------------- Jaillissements (DOM + WAAPI) */
const LEAVES = ['#C8561F', '#E07A2E', '#D9A021', '#A8323A', '#8E3B22', '#E9B44C'];
const FLING = {
  automne: {
    n: 14,
    make: () => {
      const el = document.createElement('div');
      el.className = 'fx-leaf';
      const c = LEAVES[(Math.random() * LEAVES.length) | 0];
      el.innerHTML = `<svg viewBox="-10 -10 20 20" aria-hidden="true"><path fill="${c}" d="M0-9.5 2.1-4.3 5.9-5.9 4.3-1.7 9 .5 4-1.9 4.6 5.9 0 3.6-4.6 5.9-4 1.9-9 .5-4.3-1.7-5.9-5.9-2.1-4.3z"/><path d="M0-6v15" stroke="rgba(60,25,8,.5)" stroke-width="1"/></svg>`;
      return el;
    },
  },
  gilded: { n: 12, make: () => { const el = document.createElement('div'); el.className = 'fx-coin'; return el; } },
  scarlet: {
    n: 9,
    make: () => {
      const el = document.createElement('div');
      el.className = 'fx-knife';
      el.innerHTML = '<svg viewBox="0 0 60 10" aria-hidden="true"><defs><linearGradient id="kb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset=".55" stop-color="#C9CED8"/><stop offset="1" stop-color="#6E7586"/></linearGradient></defs><path d="M60 5Q36 1 18 2v6q18 1 42-3z" fill="url(#kb)"/><rect x="15" y="0" width="3" height="10" fill="#E3B04B"/><rect x="2" y="3" width="13" height="4" rx="1.5" fill="#3A1020"/></svg>';
      return el;
    },
  },
};

let flingLayer = null;
function fling(x, y, n, make) {
  if (prefersReducedMotion()) return;
  if (!flingLayer || !flingLayer.isConnected) {
    flingLayer = document.createElement('div');
    flingLayer.className = 'fx-fling';
    document.body.append(flingLayer);
  }
  for (let k = 0; k < n; k++) {
    const el = make();
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    flingLayer.append(el);
    const a = -Math.PI / 2 + rand(-1.15, 1.15);
    const v = rand(160, 330);
    const dx = Math.cos(a) * v, dy = Math.sin(a) * v;
    const spin = rand(-540, 540);
    const dur = rand(1100, 1600);
    el.animate([
      { transform: 'translate(-50%, -50%) translate(0, 0) rotate(0deg) scale(.4)', opacity: 1 },
      { transform: `translate(-50%, -50%) translate(${dx * .55}px, ${dy * .55}px) rotate(${spin * .4}deg) scale(1)`, opacity: 1, offset: .35, easing: 'cubic-bezier(.3, 0, .7, 1)' },
      { transform: `translate(-50%, -50%) translate(${dx * .9}px, ${dy * .15 + 260}px) rotate(${spin}deg) scale(.9)`, opacity: 0 },
    ], { duration: dur, delay: k * 18, easing: 'cubic-bezier(.15, .7, .4, 1)', fill: 'both' }).finished.then(() => el.remove(), () => el.remove());
  }
}

/* ------------------------------------------------------- Fleurs (Pinksoni) */
const FLOWERS = [
  // pétales, cœur de pétales, centre, lueur
  ['#FF4F9A', '#FFC2DC', '#FFF3B0', 'rgba(255, 79, 154, .8)'],
  ['#FFFFFF', '#FFD1E6', '#FF7EB6', 'rgba(255, 255, 255, .95)'],
  ['#E5174F', '#FF7A9C', '#FFE08A', 'rgba(229, 23, 79, .75)'],
  ['#FF8FC0', '#FFFFFF', '#FF2E88', 'rgba(255, 143, 192, .9)'],
  ['#C2185B', '#FF9CC9', '#FFF0F6', 'rgba(194, 24, 91, .7)'],
];
const rand = (a, b) => a + Math.random() * (b - a);

function flowerSVG(petals, [outer, inner, center]) {
  let o = '', i = '';
  for (let k = 0; k < petals; k++) {
    const a = (k * 360) / petals;
    o += `<ellipse cx="50" cy="27" rx="${petals > 6 ? 11 : 14}" ry="24" transform="rotate(${a} 50 50)"/>`;
    i += `<ellipse cx="50" cy="35" rx="8" ry="15" transform="rotate(${a + 180 / petals} 50 50)"/>`;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g class="bloom__outer" fill="${outer}" stroke="rgba(255,255,255,.75)" stroke-width="1.2">${o}</g>
    <g class="bloom__inner" fill="${inner}" stroke="rgba(255,255,255,.6)" stroke-width="1">${i}</g>
    <circle cx="50" cy="50" r="9" fill="${center}"/>
    <circle cx="47" cy="47" r="3" fill="#fff" fill-opacity=".85"/></svg>`;
}

let layer = null;
function bloom(x, y, n) {
  if (prefersReducedMotion()) return;
  if (!layer || !layer.isConnected) {
    layer = document.createElement('div');
    layer.id = 'bloom';
    document.body.append(layer);
  }
  const start = Math.random() * Math.PI * 2;
  for (let k = 0; k < n; k++) {
    const pal = FLOWERS[(Math.random() * FLOWERS.length) | 0];
    const size = rand(78, 128);
    const a = start + (k / n) * Math.PI * 2 + rand(-0.4, 0.4);
    const d = k === 0 ? rand(0, 24) : rand(50, 120);
    const el = document.createElement('div');
    el.className = 'bloom';
    el.style.cssText = `left:${x + Math.cos(a) * d}px;top:${y + Math.sin(a) * d * 0.7}px;width:${size}px;height:${size}px;`
      + `filter:drop-shadow(0 0 8px ${pal[3]}) drop-shadow(0 0 20px ${pal[3]});`;
    el.innerHTML = flowerSVG(5 + ((Math.random() * 4) | 0), pal);
    layer.append(el);

    // éclosion lente en tournant, puis disparition très rapide une fois au maximum
    const spin = rand(50, 90) * (Math.random() < 0.5 ? -1 : 1);
    const timing = { duration: rand(1500, 1900), delay: k * 120, fill: 'both' };
    const grow = 'cubic-bezier(.2, .6, .35, 1)';
    const snap = 'cubic-bezier(.55, 0, .95, .35)';
    el.animate([
      { transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 0.5, easing: grow },
      { transform: `translate(-50%, -50%) scale(1) rotate(${spin}deg)`, opacity: 1, offset: 0.88, easing: snap },
      { transform: `translate(-50%, -50%) scale(0) rotate(${spin * 1.25}deg)`, opacity: 0.9 },
    ], timing).finished.then(() => el.remove(), () => el.remove());
    el.querySelector('.bloom__inner').animate([
      { transform: 'scale(.25) rotate(-45deg)', easing: grow },
      { transform: 'scale(1) rotate(0deg)', offset: 0.88 },
      { transform: 'scale(1) rotate(0deg)' },
    ], timing);
    el.querySelector('.bloom__outer').animate([
      { transform: 'scale(.6)', easing: grow },
      { transform: 'scale(1)', offset: 0.88 },
      { transform: 'scale(1)' },
    ], timing);
  }
}
