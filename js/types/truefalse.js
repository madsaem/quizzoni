// Vrai ou faux.
// { "type": "truefalse", "prompt": "...", "answer": true }
import { h, md } from '../utils.js';
import { icon } from '../icons.js';
import { markTile } from './choice.js';

export default {
  label: 'Vrai ou faux',
  time: 15,

  validate(q) {
    return typeof q.answer === 'boolean' ? null : '"answer" doit valoir true (vrai) ou false (faux)';
  },

  mount(q, api) {
    const grid = h('div', { class: 'answers answers--tf', role: 'group', 'aria-label': 'Vrai ou faux' });
    const make = (value, label, colorIdx, sym, keyHint) => {
      const b = h('button', {
        type: 'button',
        class: `key answer answer--${colorIdx}`,
        dataset: { value: String(value) },
        onClick: () => {
          if (grid.classList.contains('is-locked')) return;
          api.sound('select');
          api.submit(value, b);
        },
      },
      h('span', { class: 'answer__sym' }, icon(sym)),
      h('span', { html: md(label) }),
      h('span', { class: 'answer__key', 'aria-hidden': 'true' }, keyHint));
      return b;
    };
    const yes = make(true, 'Vrai', 2, 'true', 'V');
    const no = make(false, 'Faux', 1, 'false', 'F');
    grid.append(yes, no);

    return {
      el: grid,
      key(k) {
        const low = k.toLowerCase();
        if (low === 'v' || k === '1') { yes.click(); return true; }
        if (low === 'f' || k === '2') { no.click(); return true; }
        return false;
      },
      lock() { grid.classList.add('is-locked'); },
      reveal(result, answer) {
        [yes, no].forEach((b) => {
          const v = b.dataset.value === 'true';
          if (v === q.answer) markTile(b, 'correct');
          else if (v === answer) markTile(b, 'wrong');
          else markTile(b, 'dim');
        });
      },
      focus() { yes.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    return { score: answer === q.answer ? 1 : 0 };
  },

  answerText(q) { return q.answer ? 'Vrai' : 'Faux'; },
};
