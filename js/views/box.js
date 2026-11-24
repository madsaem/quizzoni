// La boîte de médicament en 3D qui représente un quiz.
import { h } from '../utils.js';
import { icon } from '../icons.js';
import * as store from '../state.js';

/** Couleur d'un quiz : "c1"…"c6" (suit le thème) ou une couleur CSS. */
export function quizColorVars(quiz) {
  const c = quiz.color || 'c2';
  if (/^c[1-6]$/.test(c)) return { '--c': `var(--${c})`, '--c-ink': `var(--${c}-ink)` };
  return { '--c': c, '--c-ink': '#fff' };
}

let burstPath = null;
function starburst(points = 18, inner = 0.84) {
  if (burstPath) return burstPath;
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = (Math.PI * i) / points - Math.PI / 2;
    const r = i % 2 ? 50 * inner : 50;
    pts.push(`${(50 + r * Math.cos(a)).toFixed(1)}% ${(50 + r * Math.sin(a)).toFixed(1)}%`);
  }
  burstPath = `polygon(${pts.join(', ')})`;
  return burstPath;
}

export function renderBox(quiz, { href = null, sticker = true } = {}) {
  const prog = store.progressFor(quiz.id);
  const n = quiz.questions.length;
  const tag = href ? 'a' : 'div';

  const front = h('div', { class: 'box__face box__front' },
    h('div', { class: 'box__band' }, h('span', {}, quiz.ue || ''), h('span', {}, sticker && !prog ? '' : quiz.badge || '')),
    h('div', { class: 'box__content' },
      h('h3', { class: 'box__title' }, quiz.title),
      quiz.subtitle ? h('p', { class: 'box__sub' }, quiz.subtitle) : null,
      h('p', { class: 'box__dose' }, icon('box'), `Boîte de ${n} question${n > 1 ? 's' : ''}`),
      h('div', { class: 'box__stripes', 'aria-hidden': 'true' })),
    prog ? h('div', { class: 'box__stamp', 'aria-hidden': 'true' }, h('small', {}, 'Record'), h('b', {}, `${prog.bestPct} %`)) : null);

  const body = h('div', { class: 'box__body' },
    front,
    h('div', { class: 'box__face box__side', 'aria-hidden': 'true' }, h('span', {}, quiz.short || quiz.title)),
    h('div', { class: 'box__face box__top', 'aria-hidden': 'true' }),
    sticker && !prog ? h('div', {
      class: 'sticker',
      style: { clipPath: starburst(), transform: 'translateZ(3px) rotate(-14deg)' },
      'aria-hidden': 'true',
    }, 'Nouveau') : null);

  const label = `${quiz.title}${quiz.ue ? `, ${quiz.ue}` : ''}. ${n} questions.${prog ? ` Record : ${prog.bestPct} %.` : ' Pas encore fait.'}`;
  return h(tag, {
    class: 'box',
    href,
    style: quizColorVars(quiz),
    'aria-label': href ? label : null,
  }, body, h('div', { class: 'box__shadow', 'aria-hidden': 'true' }));
}
