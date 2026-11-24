// Petits outils partagés : création d'éléments, hasard, texte, nombres.

const SVG_NS = 'http://www.w3.org/2000/svg';

function setAttrs(el, attrs) {
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') {
      for (const [sk, sv] of Object.entries(v)) {
        if (sv == null) continue;
        if (sk.startsWith('--')) el.style.setProperty(sk, sv);
        else el.style[sk] = sv;
      }
    } else if (k.startsWith('on') && typeof v === 'function') {
      el.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k === 'html') el.innerHTML = v;
    else if (k === 'dataset') Object.assign(el.dataset, v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
}

function appendChildren(el, children) {
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false || c === true) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

/** h('button', { class: 'key', onClick }, 'Texte', autreElement) */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);
  setAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

export function s(tag, attrs, ...children) {
  const el = document.createElementNS(SVG_NS, tag);
  setAttrs(el, attrs);
  appendChildren(el, children);
  return el;
}

/** Transforme une chaîne SVG en élément. */
export function svgFrom(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

export function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Mélange en évitant de retomber sur l'ordre d'origine (si possible). */
export function shuffleNotIdentity(arr) {
  if (arr.length < 2) return arr.slice();
  let out;
  let tries = 0;
  do { out = shuffle(arr); tries++; } while (tries < 10 && out.every((x, i) => x === arr[i]));
  return out;
}

export function sample(arr, n) { return shuffle(arr).slice(0, n); }

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Hash court et stable (pour identifier une question par son texte). */
export function hash(str) {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(36);
}

/* ---------------------------------------------------------------- Nombres */
const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 2 });
export function fmt(n, digits) {
  if (n == null || Number.isNaN(n)) return '';
  if (digits != null) {
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
  }
  return nf.format(n);
}

/** Nombre de décimales d'un pas (0.1 → 1, 0.05 → 2). */
export function decimalsOf(step) {
  const str = String(step);
  return str.includes('.') ? str.split('.')[1].length : 0;
}

/** "41,7 gouttes" → 41.7 ; renvoie null si illisible. */
export function parseNumber(input) {
  if (input == null) return null;
  const cleaned = String(input)
    .replace(/\s| | /g, '')
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/);
  if (!cleaned) return null;
  const n = parseFloat(cleaned[0]);
  return Number.isFinite(n) ? n : null;
}

/* ----------------------------------------------------------------- Texte */
const ARTICLES = /^(le|la|les|l|un|une|des|du|de|d)\s+/;

/** Minuscules, sans accents ni ponctuation, espaces réduits. */
export function normalize(str) {
  return String(str ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/œ/g, 'oe').replace(/æ/g, 'ae')
    .replace(/['’`´-]/g, ' ')
    .replace(/[^a-z0-9%+.,/ ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(ARTICLES, '');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Fautes tolérées selon la longueur du mot attendu. */
export function typoBudget(len) {
  if (len <= 3) return 0;
  if (len <= 6) return 1;
  if (len <= 12) return 2;
  return 3;
}

/**
 * Mise en forme légère dans les questions :
 * **gras**, *italique*, O~2~ (indice), m^2^ (exposant), retours à la ligne.
 */
export function md(text) {
  const esc = String(text ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~(.+?)~/g, '<sub>$1</sub>')
    .replace(/\^(.+?)\^/g, '<sup>$1</sup>')
    .replace(/\n/g, '<br>')
    // typographie française : espace insécable avant ? ! : ; % et après «
    .replace(/ ([?!:;%»])/g, '\u00a0$1')
    .replace(/« /g, '«\u00a0');
}

export function plural(n, one, many) { return `${fmt(n)} ${n > 1 ? many : one}`; }

export function prefersReducedMotion() {
  return document.documentElement.dataset.motion === 'reduced' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
