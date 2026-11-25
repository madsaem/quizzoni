// Suffixe commun : des noms (de médicaments…) affichés sans leur fin,
// l'étudiant écrit le suffixe qui les termine tous.
// { "type": "suffix", "prompt": "Quel suffixe termine ces IEC ?",
//   "words": ["Ramipril", "Périndopril", "Énalapril", "Captopril", "Lisinopril"],
//   "suffix": "pril" }
// Facultatif : "answers": ["…"] pour accepter d'autres écritures du suffixe.
import { h, normalize, levenshtein } from '../utils.js';

/** "-Pril " → "pril" */
const clean = (str) => normalize(str).replace(/[\s-]/g, '');

export default {
  inlineReveal: true,
  label: 'Suffixe',
  time: 30,

  validate(q) {
    if (typeof q.suffix !== 'string' || !clean(q.suffix)) return 'il manque "suffix"';
    if (!Array.isArray(q.words) || q.words.length < 2) return 'il faut au moins 2 "words"';
    const bad = q.words.find((w) => typeof w !== 'string' || !clean(w).endsWith(clean(q.suffix)) || w.length <= q.suffix.length);
    if (bad) return `« ${bad} » ne se termine pas par « ${q.suffix} »`;
    return null;
  },

  hint() { return 'Écris la fin commune : elle complète tous les noms'; },

  mount(q, api) {
    const cut = q.suffix.length;
    const blanks = [];
    const words = q.words.map((w) => {
      const blank = h('span', { class: 'sfx__blank' });
      blanks.push(blank);
      return h('li', { class: 'sfx__word' }, h('span', { class: 'sfx__stem' }, w.slice(0, -cut)), blank);
    });
    const input = h('input', {
      class: 'field sfx__input',
      type: 'text',
      autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      enterkeyhint: 'done',
      placeholder: 'suffixe',
      'aria-label': 'Suffixe commun',
      onInput: () => {
        const v = input.value.replace(/^[\s-]+/, '').trim();
        blanks.forEach((b) => { b.textContent = v; b.classList.toggle('is-typed', !!v); });
        api.setAnswer(input.value, clean(input.value) !== '');
      },
    });
    const el = h('div', { class: 'sfx' },
      h('ul', { class: 'sfx__words', role: 'list' }, words),
      h('label', { class: 'sfx__row' }, h('span', { class: 'sfx__dash', 'aria-hidden': 'true' }, '…'), input));

    return {
      el,
      lock() { input.readOnly = true; },
      reveal(result) {
        const ok = result.score >= 1;
        input.classList.add(ok ? 'is-correct' : 'is-wrong');
        blanks.forEach((b) => {
          b.textContent = q.suffix;
          b.classList.add('is-typed', ok ? 'is-good' : 'is-fixed');
        });
        el.classList.add(ok ? 'is-good' : 'is-bad');
        if (!ok) el.append(h('p', { class: 'sfx__fix' }, 'Suffixe attendu : ', h('b', {}, `-${q.suffix}`)));
      },
      focus() { input.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    const given = clean(answer);
    if (!given) return { score: 0 };
    const targets = [q.suffix, ...(q.answers || [])].map(clean);
    if (targets.includes(given)) return { score: 1 };
    // une faute de frappe tolérée sur les suffixes longs (« floxacine »…)
    const close = targets.find((t) => t.length >= 6 && levenshtein(given, t) <= 1);
    if (close) return { score: 1, note: `Accepté malgré l'orthographe : « -${q.suffix} ».` };
    return { score: 0 };
  },

  answerText(q) { return `-${q.suffix}`; },
};
