// Associer deux colonnes.
// { "type": "match", "prompt": "Associe chaque toxique à son antidote",
//   "left": "Toxique", "right": "Antidote",              ← titres de colonnes (facultatif)
//   "pairs": [ ["AVK", "Vitamine K"], ["Morphine", "Naloxone"] ] }
import { h, md, shuffle } from '../utils.js';

const PAIR_COLORS = [
  ['--c2', '--c2-ink'], ['--c5', '--c5-ink'], ['--c4', '--c4-ink'],
  ['--c6', '--c6-ink'], ['--c1', '--c1-ink'], ['--c3', '--c3-ink'],
];

export default {
  inlineReveal: true,
  label: 'Association',
  time: 60,

  validate(q) {
    if (!Array.isArray(q.pairs) || q.pairs.length < 2) return 'il faut au moins 2 "pairs"';
    if (q.pairs.length > 6) return '6 "pairs" maximum';
    if (q.pairs.some((p) => !Array.isArray(p) || p.length !== 2)) return 'chaque paire doit être ["gauche", "droite"]';
    const rights = q.pairs.map((p) => p[1]);
    if (new Set(rights).size !== rights.length) return 'deux paires ont la même réponse à droite';
    return null;
  },

  hint() { return 'Touche un élément à gauche, puis son partenaire à droite'; },

  mount(q, api) {
    const n = q.pairs.length;
    const link = Array(n).fill(null); // index gauche → index droite
    let selLeft = null;
    let selRight = null;
    let locked = false;

    const leftOrder = shuffle(q.pairs.map((_, i) => i));
    const rightOrder = shuffle(q.pairs.map((_, i) => i));

    const mkItem = (side, idx, text) => h('button', {
      type: 'button',
      class: 'match__item',
      dataset: { side, idx },
      onClick: () => tap(side, idx),
    }, h('span', { class: 'match__badge', 'aria-hidden': 'true' }), h('span', { class: 'match__text', html: md(text) }));

    const leftEls = new Map(leftOrder.map((i) => [i, mkItem('L', i, q.pairs[i][0])]));
    const rightEls = new Map(rightOrder.map((i) => [i, mkItem('R', i, q.pairs[i][1])]));

    const colL = h('div', { class: 'match__col' }, q.left ? h('div', { class: 'match__head' }, q.left) : null, [...leftEls.values()]);
    const colR = h('div', { class: 'match__col' }, q.right ? h('div', { class: 'match__head' }, q.right) : null, [...rightEls.values()]);
    const grid = h('div', { class: 'match' }, colL, colR);
    const wrap = h('div', {}, grid, h('p', { class: 'match__help' }, 'Touche un élément déjà relié pour défaire le lien.'));

    function tap(side, idx) {
      if (locked) return;
      if (side === 'L') {
        if (link[idx] != null) { link[idx] = null; selLeft = idx; }
        else selLeft = selLeft === idx ? null : idx;
      } else {
        const owner = link.indexOf(idx);
        if (owner >= 0) { link[owner] = null; selRight = idx; }
        else selRight = selRight === idx ? null : idx;
      }
      if (selLeft != null && selRight != null) {
        link[selLeft] = selRight;
        selLeft = selRight = null;
        api.sound('place');
      } else {
        api.sound('click');
      }
      render();
    }

    function render() {
      // numéro et couleur de paire, dans l'ordre d'affichage de la colonne de gauche
      const pairNo = new Map();
      leftOrder.forEach((li) => { if (link[li] != null) pairNo.set(li, pairNo.size); });
      leftEls.forEach((el, i) => paint(el, link[i] != null ? pairNo.get(i) : null, selLeft === i));
      rightEls.forEach((el, i) => {
        const owner = link.indexOf(i);
        paint(el, owner >= 0 ? pairNo.get(owner) : null, selRight === i);
      });
      api.setAnswer(link.slice(), link.every((x) => x != null));
    }

    function paint(el, no, selected) {
      el.classList.toggle('is-selected', selected);
      el.classList.toggle('is-paired', no != null);
      el.setAttribute('aria-pressed', String(selected));
      const badge = el.querySelector('.match__badge');
      if (no != null) {
        const [c, ink] = PAIR_COLORS[no % PAIR_COLORS.length];
        el.style.setProperty('--pc', `var(${c})`);
        el.style.setProperty('--pc-ink', `var(${ink})`);
        badge.textContent = String(no + 1);
      } else {
        badge.textContent = '';
      }
    }
    render();

    return {
      el: wrap,
      lock() { locked = true; grid.classList.add('is-locked'); selLeft = selRight = null; },
      reveal() {
        leftEls.forEach((el, i) => {
          const ok = link[i] === i;
          el.classList.remove('is-paired', 'is-selected');
          el.classList.add(ok ? 'is-good' : 'is-bad');
          el.querySelector('.match__text').append(h('span', { class: 'match__fix' }, ok ? q.pairs[i][1] : `Réponse : ${q.pairs[i][1]}`));
        });
        rightEls.forEach((el) => { el.classList.remove('is-paired', 'is-selected'); el.style.opacity = '.55'; });
      },
      focus() { leftEls.get(leftOrder[0])?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (!Array.isArray(answer)) return { score: 0 };
    const ok = answer.filter((r, l) => r === l).length;
    return { score: ok / q.pairs.length, note: ok < q.pairs.length ? `${ok} association${ok > 1 ? 's' : ''} correcte${ok > 1 ? 's' : ''} sur ${q.pairs.length}.` : null };
  },

  answerText(q) { return q.pairs.map(([a, b]) => `${a} → ${b}`).join(' ; '); },
};
