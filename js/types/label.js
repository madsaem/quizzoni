// Légender un schéma : placer des étiquettes sur des repères numérotés.
// { "type": "label", "prompt": "Légende le schéma", "image": "assets/schemas/coeur.svg",
//   "pins": [ { "x": 30, "y": 45, "answer": "Oreillette droite" }, ... ],
//   "distractors": ["Veine porte"] }        ← étiquettes pièges (facultatif)
import { h, shuffle } from '../utils.js';

export default {
  inlineReveal: true,
  label: 'Légende',
  time: 60,

  validate(q) {
    if (!q.image) return 'il manque "image"';
    if (!Array.isArray(q.pins) || q.pins.length < 2) return 'il faut au moins 2 "pins"';
    if (q.pins.some((p) => typeof p.x !== 'number' || typeof p.y !== 'number' || !p.answer)) return 'chaque pin doit avoir x, y et answer';
    const names = q.pins.map((p) => p.answer);
    if (new Set(names).size !== names.length) return 'deux pins ont la même réponse';
    return null;
  },

  hint() { return 'Choisis un repère, puis l\'étiquette qui lui correspond'; },

  mount(q, api) {
    const n = q.pins.length;
    const assign = Array(n).fill(null);
    let active = 0;
    let locked = false;

    const img = h('img', { src: q.image, alt: q.alt || '', draggable: 'false' });
    const pins = q.pins.map((p, i) => h('button', {
      type: 'button',
      class: 'pin',
      style: { left: `${p.x}%`, top: `${p.y}%` },
      'aria-label': `Repère ${i + 1}`,
      onClick: () => { if (!locked) { active = i; api.sound('click'); render(); } },
    }, String(i + 1)));
    const inner = h('div', { class: 'figure__inner' }, img, ...pins);
    const fig = h('figure', { class: 'figure' }, inner);

    const slotTexts = [];
    const slots = q.pins.map((p, i) => {
      const txt = h('span', { class: 'slot__text' });
      slotTexts.push(txt);
      return h('button', {
        type: 'button',
        class: 'slot',
        onClick: () => {
          if (locked) return;
          if (active === i && assign[i]) assign[i] = null;
          active = i;
          api.sound('click');
          render();
        },
      }, h('span', { class: 'slot__num' }, String(i + 1)), txt);
    });
    const slotList = h('ol', { class: 'slots', role: 'list' }, slots.map((sl) => h('li', {}, sl)));

    const labels = shuffle([...q.pins.map((p) => p.answer), ...(q.distractors || [])]);
    const tags = labels.map((label) => {
      const t = h('button', {
        type: 'button',
        class: 'key bank__tag',
        draggable: 'true',
        dataset: { label },
        onClick: () => put(label),
      }, label);
      t.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', label); });
      return t;
    });
    const bank = h('div', { class: 'bank', role: 'group', 'aria-label': 'Étiquettes' }, tags);

    // glisser-déposer (souris) sur les repères et les lignes
    [...pins, ...slots].forEach((target, k) => {
      const i = k % n;
      target.addEventListener('dragover', (e) => e.preventDefault());
      target.addEventListener('drop', (e) => {
        e.preventDefault();
        const label = e.dataTransfer.getData('text/plain');
        if (label && !locked) { active = i; put(label); }
      });
    });

    function put(label) {
      if (locked) return;
      if (active == null) active = assign.findIndex((a) => !a);
      if (active < 0) active = 0;
      const prev = assign.indexOf(label);
      if (prev >= 0) assign[prev] = null;
      assign[active] = label;
      api.sound('place');
      // passe au prochain repère vide
      let next = null;
      for (let k = 1; k <= n; k++) {
        const j = (active + k) % n;
        if (!assign[j]) { next = j; break; }
      }
      active = next;
      render();
    }

    function render() {
      pins.forEach((p, i) => {
        p.classList.toggle('is-active', i === active && !locked);
        p.classList.toggle('is-filled', !!assign[i]);
      });
      slots.forEach((sl, i) => {
        sl.classList.toggle('is-active', i === active && !locked);
        sl.classList.toggle('is-filled', !!assign[i]);
        slotTexts[i].replaceChildren(assign[i] ? h('span', {}, assign[i]) : h('span', { class: 'slot__empty' }, 'À placer'));
      });
      tags.forEach((t) => t.classList.toggle('is-used', assign.includes(t.dataset.label)));
      api.setAnswer(assign.slice(), assign.every(Boolean));
    }
    render();

    const side = h('div', {}, slotList, bank, h('p', { class: 'bank__help' }, 'Touche une ligne déjà remplie pour la vider.'));
    const wrap = h('div', { class: 'labeling' }, fig, side);

    return {
      el: wrap,
      lock() { locked = true; active = null; render(); tags.forEach((t) => { t.disabled = true; }); },
      reveal() {
        q.pins.forEach((p, i) => {
          const ok = assign[i] === p.answer;
          pins[i].classList.add(ok ? 'is-good' : 'is-bad');
          slots[i].classList.add(ok ? 'is-good' : 'is-bad');
          if (!ok) slotTexts[i].append(h('span', { class: 'slot__fix' }, `Réponse : ${p.answer}`));
        });
      },
      focus() { slots[0]?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (!Array.isArray(answer)) return { score: 0 };
    const ok = q.pins.filter((p, i) => answer[i] === p.answer).length;
    return { score: ok / q.pins.length, note: ok < q.pins.length ? `${ok} étiquette${ok > 1 ? 's' : ''} bien placée${ok > 1 ? 's' : ''} sur ${q.pins.length}.` : null };
  },

  answerText(q) { return q.pins.map((p, i) => `${i + 1}. ${p.answer}`).join(' ; '); },
};
