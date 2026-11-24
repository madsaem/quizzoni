// Curseur : placer une valeur sur une échelle.
// { "type": "slider", "prompt": "...", "min": 80, "max": 100, "step": 1,
//   "answer": 95, "tolerance": 1, "unit": "%" }
// Près de la bonne valeur (sans y être) on gagne une partie des points.
import { h, fmt, decimalsOf, clamp } from '../utils.js';

export function snap(v, q) {
  const step = q.step || 1;
  const n = Math.round((v - q.min) / step) * step + q.min;
  return +clamp(n, q.min, q.max).toFixed(decimalsOf(step));
}

export function pct(v, q) { return (v - q.min) / (q.max - q.min); }

/** Score entre 0 et 1 selon la distance à la bonne valeur. */
export function closeness(dist, q) {
  const tol = q.tolerance || 0;
  if (dist <= tol + 1e-9) return 1;
  const span = q.max - q.min;
  const window = q.partial ?? Math.max(tol * 2, span * 0.08);
  return Math.max(0, 1 - (dist - tol) / window) * 0.75;
}

export function fmtVal(v, q) {
  const d = decimalsOf(q.step || 1);
  return fmt(v, d);
}

export function buildScale(q) {
  const scale = h('div', { class: 'scale', 'aria-hidden': 'true' });
  const marks = q.marks || [0, 0.25, 0.5, 0.75, 1].map((p) => snap(q.min + (q.max - q.min) * p, q));
  marks.forEach((v) => {
    scale.append(h('span', { style: { left: `calc(var(--th, 30px) / 2 + (100% - var(--th, 30px)) * ${pct(v, q)})` } }, fmtVal(v, q)));
  });
  return scale;
}

export function validateScale(q) {
  if (typeof q.min !== 'number' || typeof q.max !== 'number' || q.max <= q.min) return '"min" et "max" doivent être des nombres, avec max > min';
  if (q.step != null && !(q.step > 0)) return '"step" doit être un nombre positif';
  return null;
}

export function answerBand(lo, hi, q, label) {
  const p1 = pct(lo, q), p2 = pct(hi, q);
  return h('div', {
    class: 'track__answer',
    style: { left: `${p1 * 100}%`, width: `${Math.max(0, p2 - p1) * 100}%` },
  }, label ? h('span', { class: 'track__flag' }, label) : null);
}

export default {
  label: 'Curseur',
  time: 25,

  validate(q) {
    return validateScale(q) || (typeof q.answer !== 'number' ? '"answer" doit être un nombre' : null);
  },

  hint(q) {
    return q.tolerance ? `Marge acceptée : ± ${fmtVal(q.tolerance, q)}${q.unit ? ` ${q.unit}` : ''}` : null;
  },

  mount(q, api) {
    let value = snap(q.start ?? (q.min + (q.max - q.min) / 2), q);
    const num = h('span', {}, fmtVal(value, q));
    const valueEl = h('div', { class: 'slider__value', 'aria-live': 'polite' }, num, q.unit ? h('span', { class: 'slider__unit' }, q.unit) : null);
    const fill = h('div', { class: 'track__fill' });
    const rail = h('div', { class: 'track__rail' }, fill);
    const input = h('input', {
      type: 'range', min: q.min, max: q.max, step: q.step || 1, value,
      'aria-label': q.unit ? `Valeur en ${q.unit}` : 'Valeur',
      onInput: () => { value = +input.value; update(); api.setAnswer(value, true); },
      onChange: () => api.sound('click'),
    });
    const track = h('div', { class: 'track' }, rail, input);
    const wrap = h('div', { class: 'slider' }, valueEl, track, buildScale(q));

    function update() {
      num.textContent = fmtVal(value, q);
      fill.style.left = '0';
      fill.style.width = `${pct(value, q) * 100}%`;
      input.setAttribute('aria-valuetext', `${fmtVal(value, q)} ${q.unit || ''}`.trim());
    }
    update();
    api.setAnswer(value, true);

    return {
      el: wrap,
      lock() { track.classList.add('is-locked'); input.disabled = true; },
      reveal() {
        const tol = q.tolerance || 0;
        rail.append(answerBand(Math.max(q.min, q.answer - tol), Math.min(q.max, q.answer + tol), q,
          `Réponse : ${fmtVal(q.answer, q)}${q.unit ? ` ${q.unit}` : ''}`));
      },
      focus() { input.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (answer == null) return { score: 0 };
    return { score: closeness(Math.abs(answer - q.answer), q) };
  },

  answerText(q) { return `${fmtVal(q.answer, q)}${q.unit ? ` ${q.unit}` : ''}`; },
};
