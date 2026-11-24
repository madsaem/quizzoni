// Remettre dans l'ordre. Écrire les étapes dans le BON ordre : le site les mélange.
// { "type": "order", "prompt": "...", "items": ["Étape 1", "Étape 2", "Étape 3"] }
import { h, shuffleNotIdentity } from '../utils.js';
import { icon } from '../icons.js';

export default {
  inlineReveal: true,
  label: 'Ordre',
  time: 45,

  validate(q) {
    if (!Array.isArray(q.items) || q.items.length < 3) return 'il faut au moins 3 "items"';
    if (new Set(q.items).size !== q.items.length) return 'deux "items" sont identiques';
    return null;
  },

  hint() { return 'Glisse les cartes ou utilise les flèches'; },

  mount(q, api) {
    let locked = false;
    const list = h('ol', { class: 'order', role: 'list' });
    const order = shuffleNotIdentity(q.items.map((_, i) => i));
    const items = order.map((idx) => makeItem(idx));
    list.append(...items);

    function makeItem(idx) {
      const up = h('button', { type: 'button', class: 'order__btn', 'aria-label': 'Monter', onClick: () => move(li, -1) }, icon('up'));
      const down = h('button', { type: 'button', class: 'order__btn', 'aria-label': 'Descendre', onClick: () => move(li, 1) }, icon('down'));
      const grip = h('span', { class: 'order__grip', 'aria-hidden': 'true' }, icon('grip'));
      const li = h('li', { class: 'order__item', dataset: { idx } },
        grip,
        h('span', { class: 'order__pos' }),
        h('span', { class: 'order__text' }, q.items[idx]),
        h('span', { class: 'order__btns' }, up, down));
      li.addEventListener('pointerdown', (e) => startDrag(e, li));
      return li;
    }

    function current() { return [...list.children].map((li) => Number(li.dataset.idx)); }

    function refresh() {
      [...list.children].forEach((li, i, arr) => {
        li.querySelector('.order__pos').textContent = String(i + 1);
        const [up, down] = li.querySelectorAll('.order__btn');
        up.disabled = i === 0;
        down.disabled = i === arr.length - 1;
      });
      api.setAnswer(current(), true);
    }

    /** Animation FLIP : les cartes glissent vers leur nouvelle place. */
    function flip(mutate) {
      const before = new Map([...list.children].map((el) => [el, el.getBoundingClientRect().top]));
      mutate();
      [...list.children].forEach((el) => {
        const dy = before.get(el) - el.getBoundingClientRect().top;
        if (dy && el.animate) el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 220, easing: 'cubic-bezier(.2,.8,.2,1)' });
      });
    }

    function move(li, dir) {
      if (locked) return;
      const sib = dir < 0 ? li.previousElementSibling : li.nextElementSibling;
      if (!sib) return;
      flip(() => (dir < 0 ? list.insertBefore(li, sib) : list.insertBefore(sib, li)));
      api.sound('click');
      refresh();
      const btn = li.querySelectorAll('.order__btn')[dir < 0 ? 0 : 1];
      (btn.disabled ? li.querySelectorAll('.order__btn')[dir < 0 ? 1 : 0] : btn).focus({ preventScroll: true });
    }

    // Glisser avec le doigt (via la poignée) ou la souris (n'importe où sur la carte)
    let drag = null;
    function startDrag(e, li) {
      if (locked || e.target.closest('button')) return;
      if (e.pointerType !== 'mouse' && !e.target.closest('.order__grip')) return;
      e.preventDefault();
      drag = { li, startY: e.clientY, id: e.pointerId };
      li.setPointerCapture(e.pointerId);
      li.classList.add('is-dragging');
      api.sound('select');
    }
    list.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { li } = drag;
      let dy = e.clientY - drag.startY;
      const gap = 8.8;
      const next = li.nextElementSibling;
      const prev = li.previousElementSibling;
      if (next && dy > next.offsetHeight / 2 + gap) {
        flip(() => list.insertBefore(next, li));
        drag.startY += next.offsetHeight + gap;
        api.sound('click');
      } else if (prev && dy < -(prev.offsetHeight / 2 + gap)) {
        flip(() => list.insertBefore(li, prev));
        drag.startY -= prev.offsetHeight + gap;
        api.sound('click');
      }
      dy = e.clientY - drag.startY;
      li.style.transform = `translateY(${dy}px) scale(1.02)`;
    });
    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const { li } = drag;
      li.classList.remove('is-dragging');
      const from = li.style.transform;
      li.style.transform = '';
      if (li.animate && from) li.animate([{ transform: from }, { transform: 'none' }], { duration: 180, easing: 'cubic-bezier(.2,.8,.2,1)' });
      drag = null;
      refresh();
    };
    list.addEventListener('pointerup', endDrag);
    list.addEventListener('pointercancel', endDrag);

    refresh();

    return {
      el: list,
      lock() { locked = true; list.classList.add('is-locked'); },
      reveal() {
        [...list.children].forEach((li, i) => {
          const idx = Number(li.dataset.idx);
          const ok = idx === i;
          li.classList.add(ok ? 'is-good' : 'is-bad');
          if (!ok) li.querySelector('.order__text').append(h('span', { class: 'order__fix' }, `Place correcte : ${idx + 1}`));
        });
      },
      focus() { list.querySelector('.order__btn:not(:disabled)')?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    if (!Array.isArray(answer)) return { score: 0 };
    const ok = answer.filter((idx, i) => idx === i).length;
    const score = ok === q.items.length ? 1 : (ok / q.items.length) * 0.8;
    return { score, note: ok < q.items.length ? `${ok} étape${ok > 1 ? 's' : ''} à la bonne place sur ${q.items.length}.` : null };
  },

  answerText(q) { return q.items.map((t, i) => `${i + 1}. ${t}`).join(' ; '); },
};
