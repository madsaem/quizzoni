// Citer plusieurs éléments : « Cite 3 HBPM », « Cite les 4 signes de… ».
// { "type": "cite", "prompt": "Cite 3 HBPM.", "need": 3,
//   "answers": [["énoxaparine", "Lovenox"], ["tinzaparine", "Innohep"], "daltéparine"] }
// Chaque élément accepté peut avoir des synonymes (nom commercial, abréviation) :
// ils comptent pour un seul élément. Sans "need", il faut tous les citer.
// Les petites fautes de frappe sont tolérées, sauf avec "match": "exact".
import { h, normalize, levenshtein, typoBudget } from '../utils.js';

const itemsOf = (q) => q.answers.map((a) => (Array.isArray(a) ? a : [a]));
const needOf = (q) => Math.min(q.need || q.answers.length, q.answers.length);

/** Trouve l'élément accepté qui correspond à une saisie. */
function matchItem(q, text) {
  const given = normalize(text);
  if (!given) return null;
  let best = null;
  itemsOf(q).forEach((syns, idx) => {
    syns.forEach((s) => {
      const target = normalize(s);
      if (given === target) { if (!best || best.d > 0) best = { idx, d: 0 }; return; }
      // faute de frappe tolérée, mais pas sur la première lettre :
      // « lansoprazole » ne doit pas passer pour « pantoprazole »
      if (q.match === 'exact' || given[0] !== target[0]) return;
      const d = levenshtein(given, target);
      if (d <= typoBudget(target.length) && (!best || d < best.d)) best = { idx, d };
    });
  });
  return best;
}

/** Corrige une liste de saisies : chaque élément ne compte qu'une fois. */
function check(q, list) {
  const used = new Set();
  return (list || []).map((text) => {
    if (!String(text ?? '').trim()) return { text, state: 'empty' };
    const m = matchItem(q, text);
    if (!m) return { text, state: 'unknown' };
    if (used.has(m.idx)) return { text, state: 'dup', idx: m.idx };
    used.add(m.idx);
    return { text, state: 'ok', idx: m.idx, typo: m.d > 0 };
  });
}

export default {
  inlineReveal: false,
  label: 'À citer',
  time: 60,

  validate(q) {
    if (!Array.isArray(q.answers) || q.answers.length < 2) return 'il faut une liste "answers" d\'au moins 2 éléments';
    if (q.need != null && (!Number.isInteger(q.need) || q.need < 1)) return '"need" doit être un nombre entier';
    if (needOf(q) > 10) return '10 éléments à citer maximum';
    return null;
  },

  hint(q) {
    const n = needOf(q);
    return n === q.answers.length ? `Il y en a ${n} à citer, dans n'importe quel ordre` : `${n} réponses différentes, dans n'importe quel ordre`;
  },

  mount(q, api) {
    const n = needOf(q);
    const inputs = [];
    const rows = Array.from({ length: n }, (_, i) => {
      const input = h('input', {
        class: 'field cite__input',
        type: 'text',
        autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
        enterkeyhint: i < n - 1 ? 'next' : 'done',
        'aria-label': `Réponse ${i + 1} sur ${n}`,
        onInput: update,
        onKeydown: (e) => {
          // Entrée passe au champ suivant ; sur le dernier, elle valide
          if (e.key === 'Enter' && i < n - 1) { e.preventDefault(); e.stopPropagation(); inputs[i + 1].focus(); }
        },
      });
      inputs.push(input);
      return h('li', { class: 'cite__row' }, h('span', { class: 'cite__num', 'aria-hidden': 'true' }, String(i + 1)), input);
    });
    const list = h('ol', { class: `cite${n > 4 ? ' cite--cols' : ''}`, role: 'list' }, rows);

    function update() {
      const values = inputs.map((x) => x.value);
      api.setAnswer(values, values.some((v) => v.trim()));
    }

    return {
      el: list,
      lock() { inputs.forEach((x) => { x.readOnly = true; }); },
      reveal() {
        const items = itemsOf(q);
        check(q, inputs.map((x) => x.value)).forEach((r, i) => {
          const row = rows[i];
          row.classList.add(r.state === 'ok' ? 'is-good' : 'is-bad');
          inputs[i].classList.add(r.state === 'ok' ? 'is-correct' : 'is-wrong');
          const why = r.state === 'empty' ? 'vide'
            : r.state === 'dup' ? 'déjà cité'
              : r.state === 'unknown' ? 'pas dans la liste'
                : r.typo ? `accepté : ${items[r.idx][0]}` : null;
          if (why) row.append(h('span', { class: 'cite__why' }, why));
        });
      },
      focus() { inputs[0]?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    const n = needOf(q);
    const res = check(q, answer);
    const ok = res.filter((r) => r.state === 'ok');
    const score = Math.min(1, ok.length / n);
    const notes = [];
    if (ok.length < n) notes.push(`${ok.length} bonne${ok.length > 1 ? 's' : ''} réponse${ok.length > 1 ? 's' : ''} sur ${n}.`);
    const others = itemsOf(q).filter((_, i) => !ok.some((r) => r.idx === i)).map((s) => s[0]);
    if (score >= 1 && others.length) notes.push(`Autres réponses possibles : ${others.join(', ')}.`);
    return { score, note: notes.join(' ') || null };
  },

  answerText(q) {
    const list = itemsOf(q).map((s) => (s.length > 1 ? `${s[0]} (${s.slice(1).join(', ')})` : s[0]));
    return needOf(q) < q.answers.length ? `${needOf(q)} parmi : ${list.join(', ')}` : list.join(', ');
  },
};
