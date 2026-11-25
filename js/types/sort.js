// Classer des étiquettes dans des familles (2 à 5 zones).
// { "type": "sort", "prompt": "Range chaque médicament dans sa famille.",
//   "groups": [ { "name": "IEC", "items": ["Ramipril", "Périndopril"] },
//               { "name": "Sartans", "items": ["Losartan", "Valsartan"] } ] }
// On glisse les étiquettes (souris ou doigt), ou on touche une étiquette puis sa zone.
import { h, md, shuffle, clamp } from '../utils.js';

const ZONE_COLORS = [['--c2', '--c2-ink'], ['--c5', '--c5-ink'], ['--c4', '--c4-ink'], ['--c6', '--c6-ink'], ['--c1', '--c1-ink']];
const allItems = (q) => q.groups.flatMap((g, gi) => g.items.map((text) => ({ text, group: gi })));

export default {
  inlineReveal: true,
  label: 'Classement',
  time: 90,

  validate(q) {
    if (!Array.isArray(q.groups) || q.groups.length < 2) return 'il faut au moins 2 "groups"';
    if (q.groups.length > 5) return '5 "groups" maximum';
    if (q.groups.some((g) => !g || !g.name || !Array.isArray(g.items) || !g.items.length)) return 'chaque groupe doit avoir un "name" et des "items"';
    const items = allItems(q).map((it) => it.text);
    if (new Set(items).size !== items.length) return 'une étiquette apparaît deux fois';
    if (items.length < 4 || items.length > 24) return 'entre 4 et 24 étiquettes';
    return null;
  },

  hint() { return 'Glisse chaque étiquette dans sa zone, ou touche l\'étiquette puis la zone'; },

  mount(q, api) {
    const items = allItems(q);
    const place = items.map(() => null); // index étiquette → index zone (null = dans le bac)
    let selected = null;
    let locked = false;

    /* ------------------------------------------------------------ Éléments */
    const tags = items.map((it, i) => {
      const t = h('button', {
        type: 'button', class: 'sort__tag', dataset: { i },
        'aria-pressed': 'false',
        onClick: () => { if (suppressClick) { suppressClick = false; return; } select(i); },
      }, h('span', { class: 'sort__tag-text', html: md(it.text) }));
      t.addEventListener('pointerdown', (e) => pointerDown(e, i));
      return t;
    });

    const tray = h('div', { class: 'sort__tray', role: 'group', 'aria-label': 'Étiquettes à classer', dataset: { zone: 'tray' } });
    const trayEmpty = h('p', { class: 'sort__tray-empty' }, 'Tout est rangé. Tu peux encore déplacer une étiquette avant de valider.');
    tray.addEventListener('click', (e) => { if (e.target === tray || e.target === trayEmpty) dropSelected(null); });

    const counts = [];
    const drops = [];
    const zones = q.groups.map((g, zi) => {
      const [bg, ink] = ZONE_COLORS[zi % ZONE_COLORS.length];
      const count = h('span', { class: 'sort__count' }, '0');
      counts.push(count);
      const head = h('button', {
        type: 'button', class: 'sort__head',
        'aria-label': `Ranger dans : ${g.name}`,
        onClick: () => dropSelected(zi),
      }, h('span', { class: 'sort__key', 'aria-hidden': 'true' }, String(zi + 1)), h('span', { class: 'sort__name', html: md(g.name) }), count);
      const drop = h('div', { class: 'sort__drop' });
      drops.push(drop);
      const zone = h('section', {
        class: 'sort__zone', dataset: { zone: String(zi) },
        style: { '--zc': `var(${bg})`, '--zc-ink': `var(${ink})` },
      }, head, drop);
      zone.addEventListener('click', (e) => { if (!e.target.closest('.sort__tag') && !e.target.closest('.sort__head')) dropSelected(zi); });
      return zone;
    });

    const board = h('div', { class: 'sort__zones', style: { '--n': String(q.groups.length) } }, zones);
    const el = h('div', { class: 'sort' }, tray, board);
    shuffle(tags).forEach((t) => tray.append(t));
    tray.append(trayEmpty);

    /* ------------------------------------------------------------- Logique */
    function refresh() {
      counts.forEach((c, zi) => { c.textContent = String(place.filter((p) => p === zi).length); });
      const left = place.filter((p) => p == null).length;
      el.classList.toggle('is-done', left === 0);
      el.classList.toggle('has-selection', selected != null);
      api.setAnswer(place.slice(), left === 0);
    }

    function select(i) {
      if (locked) return;
      if (selected === i) { selected = null; api.sound('click'); }
      else { selected = i; api.sound('select'); }
      tags.forEach((t, k) => { t.classList.toggle('is-selected', k === selected); t.setAttribute('aria-pressed', String(k === selected)); });
      refresh();
    }

    function moveTo(i, zi) {
      const tag = tags[i];
      const target = zi == null ? tray : drops[zi];
      // animation FLIP : l'étiquette glisse de son ancienne place à la nouvelle
      const r0 = tag.getBoundingClientRect();
      if (zi == null) tray.insertBefore(tag, trayEmpty); else target.append(tag);
      place[i] = zi;
      const r1 = tag.getBoundingClientRect();
      if (tag.animate && (r0.left !== r1.left || r0.top !== r1.top)) {
        tag.animate([{ transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    }

    function dropSelected(zi) {
      if (locked || selected == null) return;
      const i = selected;
      selected = null;
      tags[i].classList.remove('is-selected');
      tags[i].setAttribute('aria-pressed', 'false');
      if (place[i] !== zi) { moveTo(i, zi); api.sound('place'); }
      refresh();
      // au clavier : on enchaîne sur la prochaine étiquette du bac
      const next = tags.find((t, k) => place[k] == null);
      if (next && document.activeElement?.closest?.('.sort')) next.focus({ preventScroll: true });
    }

    /* ----------------------------------------------- Glisser (souris, doigt) */
    let drag = null;
    let suppressClick = false;

    function zoneAt(x, y) {
      const hit = document.elementFromPoint(x, y)?.closest?.('[data-zone]');
      if (!hit || !el.contains(hit)) return undefined;
      return hit.dataset.zone === 'tray' ? null : Number(hit.dataset.zone);
    }

    function pointerDown(e, i) {
      if (locked || (e.pointerType === 'mouse' && e.button !== 0)) return;
      drag = { i, id: e.pointerId, x0: e.clientX, y0: e.clientY, active: false, ghost: null, over: undefined };
      tags[i].setPointerCapture(e.pointerId);
    }

    function startDrag(e) {
      const tag = tags[drag.i];
      const r = tag.getBoundingClientRect();
      const ghost = tag.cloneNode(true);
      ghost.classList.add('sort__ghost');
      ghost.classList.remove('is-selected');
      ghost.style.width = `${r.width}px`;
      ghost.style.left = `${r.left}px`;
      ghost.style.top = `${r.top}px`;
      document.body.append(ghost);
      drag.ghost = ghost;
      drag.dx = e.clientX - r.left;
      drag.dy = e.clientY - r.top;
      drag.active = true;
      tag.classList.add('is-lifted');
      if (selected != null) select(selected); // on oublie la sélection en cours
      el.classList.add('is-dragging');
      api.sound('select');
    }

    function onMove(e) {
      if (!drag || e.pointerId !== drag.id) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 7) return;
        startDrag(e);
      }
      e.preventDefault();
      drag.ghost.style.left = `${e.clientX - drag.dx}px`;
      drag.ghost.style.top = `${e.clientY - drag.dy}px`;
      const over = zoneAt(e.clientX, e.clientY);
      if (over !== drag.over) {
        drag.over = over;
        zones.forEach((z, zi) => z.classList.toggle('is-over', over === zi));
        tray.classList.toggle('is-over', over === null);
      }
      // défilement automatique près des bords de l'écran
      const scroller = el.closest('.stage') || document.scrollingElement;
      const edge = 70;
      if (e.clientY < edge) scroller.scrollBy(0, -clamp((edge - e.clientY) / 3, 2, 18));
      else if (e.clientY > innerHeight - edge) scroller.scrollBy(0, clamp((e.clientY - innerHeight + edge) / 3, 2, 18));
    }

    function onUp(e) {
      if (!drag || e.pointerId !== drag.id) return;
      const d = drag;
      drag = null;
      if (!d.active) return; // simple toucher : le clic s'en charge
      suppressClick = true;
      setTimeout(() => { suppressClick = false; }, 0);
      d.ghost.remove();
      tags[d.i].classList.remove('is-lifted');
      el.classList.remove('is-dragging');
      zones.forEach((z) => z.classList.remove('is-over'));
      tray.classList.remove('is-over');
      if (e.type === 'pointerup' && d.over !== undefined && d.over !== place[d.i]) {
        moveTo(d.i, d.over);
        api.sound('place');
      }
      refresh();
    }
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);

    refresh();

    return {
      el,
      key(k) {
        const zi = parseInt(k, 10) - 1;
        if (selected != null && zi >= 0 && zi < zones.length) { dropSelected(zi); return true; }
        return false;
      },
      lock() {
        locked = true;
        el.classList.add('is-locked');
        if (selected != null) tags[selected].classList.remove('is-selected');
        tags.forEach((t) => { t.disabled = true; });
      },
      reveal() {
        tags.forEach((t, i) => {
          const ok = place[i] === items[i].group;
          t.classList.add(ok ? 'is-good' : 'is-bad');
          if (!ok) t.append(h('span', { class: 'sort__fix', html: `→ ${md(q.groups[items[i].group].name)}` }));
        });
      },
      focus() { tags[0]?.focus({ preventScroll: true }); },
    };
  },

  grade(q, answer) {
    const items = allItems(q);
    if (!Array.isArray(answer)) return { score: 0 };
    const ok = items.filter((it, i) => answer[i] === it.group).length;
    const score = ok === items.length ? 1 : (ok / items.length) * 0.8;
    return { score, note: ok < items.length ? `${ok} étiquette${ok > 1 ? 's' : ''} bien rangée${ok > 1 ? 's' : ''} sur ${items.length}.` : null };
  },

  answerText(q) { return q.groups.map((g) => `${g.name} : ${g.items.join(', ')}`).join(' ; '); },
};
