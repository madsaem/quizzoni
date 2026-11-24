// Calcul : on tape un nombre, avec une marge d'erreur facultative.
// { "type": "number", "prompt": "...", "answer": 41.67, "tolerance": 1, "unit": "gouttes/min" }
import { h, fmt, parseNumber } from '../utils.js';

export default {
  label: 'Calcul',
  time: 60,

  validate(q) {
    if (typeof q.answer !== 'number') return '"answer" doit être un nombre (avec un point : 2.5)';
    if (q.tolerance != null && typeof q.tolerance !== 'number') return '"tolerance" doit être un nombre';
    return null;
  },

  hint(q) {
    if (!q.tolerance) return null;
    return `Marge acceptée : ± ${fmt(q.tolerance)}${q.unit ? ` ${q.unit}` : ''}`;
  },

  mount(q, api) {
    const input = h('input', {
      class: 'field cut',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      enterkeyhint: 'done',
      placeholder: q.placeholder || '0',
      'aria-label': q.unit ? `Ta réponse en ${q.unit}` : 'Ta réponse',
      onInput: () => {
        const v = parseNumber(input.value);
        api.setAnswer(v, v != null);
      },
    });
    const row = h('div', { class: 'typed__row' }, input, q.unit ? h('span', { class: 'typed__unit' }, q.unit) : null);
    const wrap = h('div', { class: 'typed' }, row,
      h('p', { class: 'typed__help' }, 'Virgule ou point, comme tu préfères.'));

    return {
      el: wrap,
      lock() { input.readOnly = true; },
      reveal(result) { input.classList.add(result.score >= 1 ? 'is-correct' : 'is-wrong'); },
      focus() { input.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (answer == null) return { score: 0 };
    const tol = q.tolerance || 0;
    const ok = Math.abs(answer - q.answer) <= tol + 1e-9;
    return { score: ok ? 1 : 0 };
  },

  answerText(q) {
    if (q.answerText) return q.answerText;
    return `${fmt(q.answer)}${q.unit ? ` ${q.unit}` : ''}`;
  },
};
