// QCM : 2 à 6 propositions, une ou plusieurs bonnes réponses.
// { "type": "choice", "prompt": "...", "options": ["A", "B", "C"], "answer": 0 }
// Plusieurs bonnes réponses : "answer": [0, 2]
import { h, md, shuffle } from '../utils.js';
import { icon, ANSWER_SYMBOLS } from '../icons.js';

export function answerTile({ index, colorIndex, text, html, keyHint, onClick, pressed }) {
  const btn = h('button', {
    type: 'button',
    class: `key answer answer--${colorIndex + 1}`,
    'aria-pressed': pressed == null ? null : String(pressed),
    dataset: { index },
    onClick,
  },
  h('span', { class: 'answer__sym' }, icon(ANSWER_SYMBOLS[colorIndex])),
  h('span', { class: 'answer__text', html: html ?? md(text) }),
  keyHint ? h('span', { class: 'answer__key', 'aria-hidden': 'true' }, keyHint) : null);
  return btn;
}

export function markTile(btn, state) {
  btn.classList.add(state === 'correct' ? 'is-correct' : state === 'wrong' ? 'is-wrong' : 'is-dim');
  if (state === 'correct' || state === 'wrong') {
    btn.append(h('span', { class: 'answer__badge', 'aria-hidden': 'true' }, icon(state === 'correct' ? 'check' : 'x')));
  }
}

export default {
  label: 'QCM',
  time: 20,

  validate(q) {
    if (!Array.isArray(q.options) || q.options.length < 2) return 'il faut au moins 2 "options"';
    if (q.options.length > 6) return '6 "options" maximum';
    const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (!ans.length || ans.some((i) => !Number.isInteger(i) || i < 0 || i >= q.options.length)) {
      return '"answer" doit être le numéro (à partir de 0) d\'une option, ou une liste de numéros';
    }
    return null;
  },

  // plusieurs bonnes réponses : le nombre est affiché en grand au-dessus des propositions
  hint() { return null; },

  mount(q, api) {
    const multi = Array.isArray(q.answer);
    const order = q.shuffle === false ? q.options.map((_, i) => i) : shuffle(q.options.map((_, i) => i));
    const chosen = new Set();
    const n = q.options.length;
    const grid = h('div', { class: `answers answers--${n}`, role: 'group', 'aria-label': 'Propositions' });
    const need = multi ? q.answer.length : 1;
    const countEl = h('span', { class: 'answers-need__count', 'aria-live': 'polite' });
    const banner = multi ? h('div', { class: 'answers-need' },
      h('span', { class: 'answers-need__n', 'aria-hidden': 'true' }, String(need)),
      h('span', { class: 'answers-need__text' },
        h('b', {}, need > 1 ? `${need} bonnes réponses` : '1 seule bonne réponse'),
        need > 1 ? ' à cocher' : ' à cocher, même si on peut en cocher plusieurs'),
      countEl) : null;
    const setCount = () => { countEl.textContent = `${chosen.size} cochée${chosen.size > 1 ? 's' : ''} sur ${need}`; countEl.classList.toggle('is-full', chosen.size === need); countEl.classList.toggle('is-over', chosen.size > need); };
    if (multi) setCount();

    const tiles = order.map((optIndex, pos) => {
      const tile = answerTile({
        index: optIndex,
        colorIndex: pos,
        text: q.options[optIndex],
        keyHint: String(pos + 1),
        pressed: multi ? false : null,
        onClick: () => pick(optIndex, tile),
      });
      return tile;
    });
    grid.append(...tiles);

    function pick(optIndex, tile) {
      if (grid.classList.contains('is-locked')) return;
      if (!multi) {
        api.sound('select');
        api.submit(optIndex, tile);
        return;
      }
      if (chosen.has(optIndex)) chosen.delete(optIndex); else chosen.add(optIndex);
      tile.setAttribute('aria-pressed', String(chosen.has(optIndex)));
      api.sound('click');
      setCount();
      api.setAnswer([...chosen], chosen.size > 0);
    }

    return {
      el: banner ? h('div', { class: 'answers-wrap' }, banner, grid) : grid,
      key(k) {
        const i = parseInt(k, 10);
        if (i >= 1 && i <= tiles.length) { tiles[i - 1].click(); return true; }
        return false;
      },
      lock() { grid.classList.add('is-locked'); },
      reveal(result, answer) {
        const good = new Set(Array.isArray(q.answer) ? q.answer : [q.answer]);
        const picked = new Set(answer == null ? [] : Array.isArray(answer) ? answer : [answer]);
        tiles.forEach((t) => {
          const idx = Number(t.dataset.index);
          if (good.has(idx)) markTile(t, 'correct');
          else if (picked.has(idx)) markTile(t, 'wrong');
          else markTile(t, 'dim');
        });
      },
      focus() { tiles[0]?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (answer == null) return { score: 0 };
    if (!Array.isArray(q.answer)) return { score: answer === q.answer ? 1 : 0 };
    const good = new Set(q.answer);
    const picked = new Set(answer);
    let hits = 0, misses = 0;
    picked.forEach((i) => (good.has(i) ? hits++ : misses++));
    const exact = hits === good.size && misses === 0;
    return { score: exact ? 1 : Math.max(0, (hits - misses) / good.size) };
  },

  answerText(q) {
    const ans = Array.isArray(q.answer) ? q.answer : [q.answer];
    return ans.map((i) => q.options[i]).join(' ; ');
  },
};
