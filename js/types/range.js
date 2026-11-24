// Fourchette : placer les deux bornes d'un intervalle (idéal pour les valeurs normales).
// { "type": "range", "prompt": "Kaliémie normale ?", "min": 2, "max": 7, "step": 0.1,
//   "answer": [3.5, 5.0], "tolerance": 0.2, "unit": "mmol/L" }
import { h } from '../utils.js';
import { snap, pct, closeness, fmtVal, buildScale, validateScale, answerBand } from './slider.js';

export default {
  label: 'Fourchette',
  time: 30,

  validate(q) {
    const e = validateScale(q);
    if (e) return e;
    if (!Array.isArray(q.answer) || q.answer.length !== 2 || q.answer[0] > q.answer[1]) {
      return '"answer" doit être [borne basse, borne haute]';
    }
    return null;
  },

  hint(q) {
    return q.tolerance ? `Marge acceptée sur chaque borne : ± ${fmtVal(q.tolerance, q)}${q.unit ? ` ${q.unit}` : ''}` : 'Place les deux bornes';
  },

  mount(q, api) {
    const span = q.max - q.min;
    let lo = snap(q.start?.[0] ?? q.min + span * 0.3, q);
    let hi = snap(q.start?.[1] ?? q.min + span * 0.7, q);

    const loNum = h('span', {});
    const hiNum = h('span', {});
    const valueEl = h('div', { class: 'slider__value', 'aria-live': 'polite' },
      loNum, h('span', { class: 'slider__sep' }, '–'), hiNum,
      q.unit ? h('span', { class: 'slider__unit' }, q.unit) : null);
    const fill = h('div', { class: 'track__fill' });
    const rail = h('div', { class: 'track__rail' }, fill);
    const mk = (label, v) => h('input', { type: 'range', min: q.min, max: q.max, step: q.step || 1, value: v, 'aria-label': label });
    const loIn = mk('Borne basse', lo);
    const hiIn = mk('Borne haute', hi);
    const track = h('div', { class: 'track' }, rail, loIn, hiIn);
    const wrap = h('div', { class: 'slider' }, valueEl, track, buildScale(q));

    loIn.addEventListener('input', () => {
      lo = Math.min(+loIn.value, hi);
      loIn.value = lo;
      update();
    });
    hiIn.addEventListener('input', () => {
      hi = Math.max(+hiIn.value, lo);
      hiIn.value = hi;
      update();
    });
    [loIn, hiIn].forEach((el) => el.addEventListener('change', () => api.sound('click')));

    function update() {
      loNum.textContent = fmtVal(lo, q);
      hiNum.textContent = fmtVal(hi, q);
      fill.style.left = `${pct(lo, q) * 100}%`;
      fill.style.width = `${(pct(hi, q) - pct(lo, q)) * 100}%`;
      // la poignée basse passe au-dessus quand elle est collée à droite
      loIn.style.zIndex = pct(lo, q) > 0.5 ? 4 : 2;
      hiIn.style.zIndex = 3;
      loIn.setAttribute('aria-valuetext', `${fmtVal(lo, q)} ${q.unit || ''}`.trim());
      hiIn.setAttribute('aria-valuetext', `${fmtVal(hi, q)} ${q.unit || ''}`.trim());
      api.setAnswer([lo, hi], true);
    }
    update();

    return {
      el: wrap,
      lock() { track.classList.add('is-locked'); loIn.disabled = true; hiIn.disabled = true; },
      reveal() {
        rail.append(answerBand(q.answer[0], q.answer[1], q,
          `Réponse : ${fmtVal(q.answer[0], q)} – ${fmtVal(q.answer[1], q)}${q.unit ? ` ${q.unit}` : ''}`));
      },
      focus() { loIn.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (!Array.isArray(answer)) return { score: 0 };
    const a = closeness(Math.abs(answer[0] - q.answer[0]), q);
    const b = closeness(Math.abs(answer[1] - q.answer[1]), q);
    const score = a === 1 && b === 1 ? 1 : Math.min(0.9, (a + b) / 2);
    return { score };
  },

  answerText(q) {
    return `${fmtVal(q.answer[0], q)} – ${fmtVal(q.answer[1], q)}${q.unit ? ` ${q.unit}` : ''}`;
  },
};
