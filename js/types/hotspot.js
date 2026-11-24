// Zone à cliquer sur une image (schéma, tracé, radio…).
// Les zones sont en % de l'image : x, y = coin haut gauche (rect) ou centre (circle).
// { "type": "hotspot", "prompt": "Clique sur le ventricule gauche",
//   "image": "assets/schemas/coeur.svg", "alt": "Schéma du cœur",
//   "zones": [ { "id": "vg", "shape": "rect", "x": 52, "y": 58, "w": 30, "h": 30 } ],
//   "answer": "vg" }            ← ou une liste d'ids : ["qrs1", "qrs2"]
import { h, s, clamp } from '../utils.js';
import { icon } from '../icons.js';

function inside(zone, px, py, W, H) {
  // px, py en pixels ; zone en %
  if (zone.shape === 'circle') {
    const cx = (zone.x / 100) * W, cy = (zone.y / 100) * H, r = (zone.r / 100) * W;
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r;
  }
  const x = (zone.x / 100) * W, y = (zone.y / 100) * H;
  return px >= x && px <= x + (zone.w / 100) * W && py >= y && py <= y + (zone.h / 100) * H;
}

function zoneShape(zone, W, H) {
  if (zone.shape === 'circle') {
    return s('ellipse', { class: 'zone-reveal', cx: zone.x, cy: zone.y, rx: zone.r, ry: zone.r * (W / H) });
  }
  return s('rect', { class: 'zone-reveal', x: zone.x, y: zone.y, width: zone.w, height: zone.h });
}

const answerIds = (q) => (Array.isArray(q.answer) ? q.answer : [q.answer]);

export default {
  label: 'Schéma',
  time: 25,

  validate(q) {
    if (!q.image) return 'il manque "image"';
    if (!Array.isArray(q.zones) || !q.zones.length) return 'il faut une liste "zones"';
    const ids = new Set(q.zones.map((z) => z.id));
    if (!answerIds(q).every((id) => ids.has(id))) return '"answer" doit être l\'id d\'une zone';
    return null;
  },

  hint() { return 'Touche l\'image pour placer ta croix, puis valide'; },

  mount(q, api) {
    let point = null; // { x, y } en %
    const img = h('img', { src: q.image, alt: q.alt || '', draggable: 'false' });
    const overlay = s('svg', { class: 'figure__overlay', viewBox: '0 0 100 100', preserveAspectRatio: 'none', 'aria-hidden': 'true' });
    const marker = h('div', { class: 'marker', hidden: true }, icon('marker'));
    const inner = h('div', {
      class: 'figure__inner',
      tabindex: '0',
      role: 'application',
      'aria-label': `${q.alt || 'Image'}. Utilise les flèches pour déplacer la croix, puis Entrée pour valider.`,
    }, img, overlay, marker);
    const fig = h('figure', { class: 'figure hotspot' }, inner, q.caption ? h('figcaption', { class: 'figure__caption' }, q.caption) : null);
    let locked = false;

    function place(x, y) {
      point = { x: clamp(x, 0, 100), y: clamp(y, 0, 100) };
      marker.hidden = false;
      marker.style.left = `${point.x}%`;
      marker.style.top = `${point.y}%`;
      // relance l'animation d'apparition
      marker.style.animation = 'none'; void marker.offsetWidth; marker.style.animation = '';
      api.setAnswer(point, true);
    }

    inner.addEventListener('click', (e) => {
      if (locked) return;
      const r = img.getBoundingClientRect();
      place(((e.clientX - r.left) / r.width) * 100, ((e.clientY - r.top) / r.height) * 100);
      api.sound('place');
    });
    inner.addEventListener('keydown', (e) => {
      if (locked) return;
      const d = e.shiftKey ? 6 : 2;
      const moves = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] };
      if (moves[e.key]) {
        e.preventDefault();
        const p = point || { x: 50, y: 50 };
        place(p.x + moves[e.key][0], p.y + moves[e.key][1]);
      }
    });

    return {
      el: fig,
      lock() { locked = true; fig.classList.add('is-locked'); },
      reveal(result) {
        const r = img.getBoundingClientRect();
        const W = r.width || 1, H = r.height || 1;
        q.zones.filter((z) => answerIds(q).includes(z.id)).forEach((z) => overlay.append(zoneShape(z, W, H)));
        if (point) marker.classList.add(result.score >= 1 ? 'is-good' : 'is-bad');
      },
      focus() { inner.focus({ preventScroll: true }); },
      // pour la correction : il faut les dimensions affichées
      measure() { const r = img.getBoundingClientRect(); return { W: r.width, H: r.height }; },
    };
  },

  grade(q, answer, comp) {
    if (!answer) return { score: 0 };
    const { W, H } = comp?.measure?.() || { W: 100, H: 100 };
    const px = (answer.x / 100) * W, py = (answer.y / 100) * H;
    const ids = answerIds(q);
    if (q.zones.some((z) => ids.includes(z.id) && inside(z, px, py, W, H))) return { score: 1 };
    const other = q.zones.find((z) => inside(z, px, py, W, H));
    return { score: 0, note: other?.label ? `Ta croix est sur : ${other.label}.` : null };
  },

  answerText(q) {
    const z = q.zones.find((zz) => answerIds(q).includes(zz.id));
    return z?.label || 'la zone entourée sur l\'image';
  },
};
