// Réponse à écrire.
// { "type": "text", "prompt": "...", "answers": ["nœud sinusal", "noeud sino-atrial"] }
// Par défaut les petites fautes de frappe sont tolérées. Pour exiger l'orthographe exacte :
// "match": "exact"
import { h, normalize, levenshtein, typoBudget } from '../utils.js';

export default {
  label: 'Réponse écrite',
  time: 30,

  validate(q) {
    if (!Array.isArray(q.answers) || !q.answers.length) return 'il faut une liste "answers" avec au moins une réponse acceptée';
    return null;
  },

  hint(q) {
    return q.match === 'exact' ? 'Orthographe exacte demandée' : 'Les petites fautes de frappe sont acceptées';
  },

  mount(q, api) {
    const input = h('input', {
      class: 'field cut',
      type: 'text',
      autocomplete: 'off',
      autocapitalize: 'off',
      autocorrect: 'off',
      spellcheck: 'false',
      enterkeyhint: 'done',
      placeholder: q.placeholder || 'Ta réponse',
      'aria-label': 'Ta réponse',
      onInput: () => api.setAnswer(input.value, input.value.trim() !== ''),
    });
    const wrap = h('div', { class: 'typed' }, h('div', { class: 'typed__row' }, input));

    return {
      el: wrap,
      lock() { input.readOnly = true; },
      reveal(result) {
        input.classList.add(result.score >= 1 ? 'is-correct' : 'is-wrong');
      },
      focus() { input.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (answer == null || !String(answer).trim()) return { score: 0 };
    const given = normalize(answer);
    let best = null;
    for (const acc of q.answers) {
      const target = normalize(acc);
      if (given === target) return { score: 1 };
      if (q.match !== 'exact') {
        const d = levenshtein(given, target);
        if (d <= typoBudget(target.length) && (!best || d < best.d)) best = { d, acc };
      }
    }
    if (best) return { score: 1, note: `Accepté malgré l'orthographe : « ${best.acc} ».` };
    return { score: 0 };
  },

  answerText(q) {
    const [first, ...others] = q.answers;
    return others.length ? `${first} (accepté aussi : ${others.join(', ')})` : first;
  },
};
