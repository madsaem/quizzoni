// Effets de réponse propres à certains thèmes.
//   pinksoni : des fleurs éclosent au lieu des confettis sur une bonne réponse
//   mayuff   : le fond passe au monogramme rose (réussi) ou rouge rosé (raté)
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
  return false;
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
