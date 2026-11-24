// Icônes SVG (dessinées pour Quizzoni). Utilisation : icon('heart')
import { svgFrom } from './utils.js';

const P = {
  // symboles des réponses
  heart: '<path fill="currentColor" d="M12 21.2s-7.6-4.7-9.7-9.6C.9 8.3 2.8 4.6 6.5 4.6c2.2 0 3.7 1.3 4.6 2.7l.9 1.3.9-1.3c.9-1.4 2.4-2.7 4.6-2.7 3.7 0 5.6 3.7 4.2 7-2.1 4.9-9.7 9.6-9.7 9.6z"/>',
  drop: '<path fill="currentColor" d="M12 2.2c3.4 4.6 7.4 9 7.4 12.8a7.4 7.4 0 0 1-14.8 0c0-3.8 4-8.2 7.4-12.8z"/>',
  capsule: '<g transform="rotate(-40 12 12)"><path fill="currentColor" d="M7 7.6h5v8.8H7a4.4 4.4 0 0 1 0-8.8z"/><path fill="currentColor" opacity=".55" d="M12 7.6h5a4.4 4.4 0 0 1 0 8.8h-5z"/></g>',
  cross: '<path fill="currentColor" d="M8.6 2.5h6.8v6.1h6.1v6.8h-6.1v6.1H8.6v-6.1H2.5V8.6h6.1z"/>',
  star: '<path fill="currentColor" d="m12 2.4 2.9 6.2 6.7.8-5 4.6 1.3 6.7L12 17.4l-5.9 3.3 1.3-6.7-5-4.6 6.7-.8z"/>',
  hex: '<path fill="currentColor" d="m12 2.3 8.6 5v9.4L12 21.7l-8.6-5V7.3z"/>',
  true: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square" d="m4.5 12.5 5 5 10-11"/>',
  false: '<path fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="square" d="m5.5 5.5 13 13m0-13-13 13"/>',

  // interface
  check: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="m4.5 12.5 5 5 10-11"/>',
  x: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="m6 6 12 12M18 6 6 18"/>',
  tilde: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="M4 14c2.5-4 5-4 8 0s5.5 4 8 0"/>',
  soundOn: '<path fill="currentColor" d="M3 9h4l5-4.5v15L7 15H3z"/><path fill="none" stroke="currentColor" stroke-width="2.2" d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12"/>',
  soundOff: '<path fill="currentColor" d="M3 9h4l5-4.5v15L7 15H3z"/><path fill="none" stroke="currentColor" stroke-width="2.4" d="m16 9 6 6m0-6-6 6"/>',
  settings: '<path fill="none" stroke="currentColor" stroke-width="2.4" d="M3 6.5h10M19 6.5h2M3 17.5h2M11 17.5h10"/><rect x="13" y="3.5" width="6" height="6" fill="currentColor"/><rect x="5" y="14.5" width="6" height="6" fill="currentColor"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path stroke="currentColor" stroke-width="3" d="m15.5 15.5 5.5 5.5"/>',
  back: '<path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" d="M15 4.5 7.5 12l7.5 7.5"/>',
  bolt: '<path fill="currentColor" d="M13.5 1.8 4 13.6h6.4l-1.9 8.6 9.5-11.8h-6.4z"/>',
  book: '<path fill="currentColor" d="M3 4.5h6.5A3.5 3.5 0 0 1 12 5.6v14.6a3 3 0 0 0-2.5-1.2H3zM21 4.5h-6.5A3.5 3.5 0 0 0 12 5.6v14.6a3 3 0 0 1 2.5-1.2H21z"/>',
  grip: '<path fill="currentColor" d="M7 4h4v4H7zm6 0h4v4h-4zM7 10h4v4H7zm6 0h4v4h-4zM7 16h4v4H7zm6 0h4v4h-4z"/>',
  up: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="m5 15 7-7 7 7"/>',
  down: '<path fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="square" d="m5 9 7 7 7-7"/>',
  flame: '<path fill="currentColor" d="M12.5 1.5c.6 4-3.9 5.6-3.9 10.1 0 1.2.5 2.2 1.2 2.9-.2-2 1.5-3.4 2.3-4.9 1.7 2.1 3.6 3.9 3.6 6.4a4.6 4.6 0 0 1-1.5 3.4c3.2-.9 5.4-3.6 5.4-7.2 0-5-4.5-7.5-7.1-10.7zM8.7 15.8c-.9 1-1.4 2.1-1.4 3.3 0 1 .4 2 1.1 2.7-2.9-.9-4.9-3.5-4.9-6.6 0-2.3 1.1-4.4 2.7-5.9-.1 2.6 1 4.8 2.5 6.5z"/>',
  shuffle: '<path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" d="M3 7h3.5c4.5 0 6.5 10 11 10H21M3 17h3.5c1.8 0 3.1-1.6 4.2-3.5M21 7h-3.5c-1.8 0-3.1 1.6-4.2 3.5M18 4l3 3-3 3M18 14l3 3-3 3"/>',
  retry: '<path fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="square" d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path fill="currentColor" d="M20.5 3v7h-7z"/>',
  shelf: '<path fill="currentColor" d="M2 19h20v3H2zM4 9h5v9H4zm6-4h5v13h-5zm6 6h4v7h-4z"/>',
  box: '<path fill="currentColor" d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zm2.5 1.6v6.2l5.3 2.7v-6.2zm13 0-5.3 2.7v6.2l5.3-2.7zM12 5.5 6.8 8.1 12 10.7l5.2-2.6z"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5" fill="none" stroke="currentColor" stroke-width="2.5"/><path stroke="currentColor" stroke-width="2.5" d="M12 9.5v4.5M9 2.5h6"/>',
  target: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
  marker: '<circle cx="12" cy="12" r="8" fill="none" stroke="#fff" stroke-width="5"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="3"/><path stroke="#fff" stroke-width="4.5" d="M12 0v7M12 17v7M0 12h7M17 12h7"/><path stroke="currentColor" stroke-width="2.4" d="M12 0v7M12 17v7M0 12h7M17 12h7"/><circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="#fff" stroke-width="1.2"/>',
  question: '<path fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="square" d="M8.5 8.5a3.5 3.5 0 1 1 5 3.2c-1 .5-1.5 1.3-1.5 2.4v1"/><rect x="10.5" y="18" width="3" height="3" fill="currentColor"/>',
};

export function icon(name, cls = '') {
  const body = P[name] || P.question;
  return svgFrom(`<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" class="${cls}">${body}</svg>`);
}

/** Symboles des réponses, dans l'ordre des couleurs c1…c6. */
export const ANSWER_SYMBOLS = ['heart', 'drop', 'capsule', 'cross', 'star', 'hex'];
export const ANSWER_SYMBOL_NAMES = ['cœur', 'goutte', 'gélule', 'croix', 'étoile', 'hexagone'];
