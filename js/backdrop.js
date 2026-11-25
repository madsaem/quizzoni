// Fonds animés de certains thèmes, dessinés derrière tout le contenu.
//   etoiles : ciel étoilé qui scintille, nébuleuses, étoiles filantes, constellations
import { prefersReducedMotion } from './utils.js';

let canvas = null;
let ctx = null;
let raf = 0;
let painter = null;
let W = 0, H = 0, DPR = 1;
let last = 0;

const PAINTERS = { etoiles: starry };

export function setBackdrop(theme) {
  stop();
  const make = PAINTERS[theme];
  if (!make) { canvas?.remove(); canvas = null; return; }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'backdrop';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);
    ctx = canvas.getContext('2d');
  }
  resize();
  painter = make();
  start();
}

function resize() {
  if (!canvas) return;
  DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  painter?.resize?.();
}

function start() {
  cancelAnimationFrame(raf);
  if (!painter) return;
  if (prefersReducedMotion()) { painter.draw(0, 0); return; }
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    if (now - last < 33) return; // 30 images/s suffisent pour un fond
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    painter.draw(now / 1000, dt);
  };
  raf = requestAnimationFrame(loop);
}

function stop() { cancelAnimationFrame(raf); raf = 0; painter = null; }

window.addEventListener('resize', () => { if (painter) { resize(); if (prefersReducedMotion()) painter.draw(0, 0); } });
document.addEventListener('visibilitychange', () => {
  if (!painter) return;
  if (document.hidden) cancelAnimationFrame(raf); else start();
});

const rand = (a, b) => a + Math.random() * (b - a);

/* -------------------------------------------------------------- Étoiles */
function starry() {
  let stars = [];
  let nebula = null;
  let shooting = null;
  let nextShoot = 3;
  let consts = [];

  function build() {
    const n = Math.min(380, Math.round((W * H) / 5200));
    const tints = ['255,255,255', '255,255,255', '207,196,255', '255,231,168', '190,220,255'];
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() < 0.92 ? rand(0.4, 1.2) : rand(1.4, 2.1),
      a: rand(0.35, 1), sp: rand(0.6, 2.2), ph: rand(0, Math.PI * 2),
      c: tints[Math.floor(Math.random() * tints.length)],
      drift: rand(0.6, 1.6),
    }));
    // nébuleuses : dessinées une fois sur un calque
    nebula = document.createElement('canvas');
    nebula.width = Math.round(W / 2); nebula.height = Math.round(H / 2);
    const nc = nebula.getContext('2d');
    const blobs = [
      [0.82, 0.12, 0.55, '167,123,255', 0.38],
      [0.1, 0.92, 0.5, '255,111,168', 0.24],
      [0.45, 0.55, 0.45, '47,199,190', 0.12],
      [0.2, 0.18, 0.35, '90,139,255', 0.2],
    ];
    blobs.forEach(([x, y, r, c, a]) => {
      const R = r * Math.max(nebula.width, nebula.height);
      const g = nc.createRadialGradient(x * nebula.width, y * nebula.height, 0, x * nebula.width, y * nebula.height, R);
      g.addColorStop(0, `rgba(${c},${a})`);
      g.addColorStop(1, `rgba(${c},0)`);
      nc.fillStyle = g;
      nc.fillRect(0, 0, nebula.width, nebula.height);
    });
    // deux constellations discrètes
    const shapes = [
      [[0, 0], [0.06, 0.03], [0.11, 0.01], [0.16, 0.05], [0.2, 0.12], [0.26, 0.1], [0.25, 0.04]], // grande ourse
      [[0, 0.04], [0.04, 0], [0.08, 0.05], [0.12, 0.01], [0.16, 0.06]], // cassiopée
    ];
    consts = shapes.map((pts, i) => {
      const ox = i === 0 ? W * 0.62 : W * 0.08;
      const oy = i === 0 ? H * 0.2 : H * 0.62;
      const s = Math.min(W, H) * 1.4;
      return { pts: pts.map(([x, y]) => [ox + x * s * 0.6, oy + y * s * 0.6]), ph: rand(0, 6) };
    });
  }
  build();

  return {
    resize: build,
    draw(t, dt) {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#07051E');
      sky.addColorStop(0.55, '#0C0A2E');
      sky.addColorStop(1, '#1A0F3D');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      // la nébuleuse dérive très lentement
      const ox = Math.sin(t * 0.03) * 20, oy = Math.cos(t * 0.025) * 14;
      ctx.drawImage(nebula, ox - 20, oy - 20, W + 40, H + 40);

      // constellations
      consts.forEach((c) => {
        const a = 0.1 + 0.08 * Math.sin(t * 0.3 + c.ph);
        ctx.strokeStyle = `rgba(200,190,255,${a})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        c.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        c.pts.forEach(([x, y]) => {
          ctx.fillStyle = `rgba(255,244,214,${0.55 + a})`;
          ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
        });
      });

      // étoiles qui scintillent et glissent doucement
      stars.forEach((s) => {
        s.x -= s.drift * dt * 3;
        if (s.x < -2) s.x = W + 2;
        const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
        ctx.fillStyle = `rgba(${s.c},${s.a * tw})`;
        if (s.r > 1.3) {
          // étoile brillante : petite croix de lumière
          const L = s.r * 3.2 * tw;
          ctx.fillRect(s.x - L, s.y - 0.5, L * 2, 1);
          ctx.fillRect(s.x - 0.5, s.y - L, 1, L * 2);
        }
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      });

      // étoile filante
      nextShoot -= dt;
      if (!shooting && nextShoot <= 0) {
        const fromLeft = Math.random() < 0.5;
        shooting = { x: fromLeft ? rand(0, W * 0.5) : rand(W * 0.5, W), y: rand(0, H * 0.4), vx: (fromLeft ? 1 : -1) * rand(520, 760), vy: rand(160, 260), life: 0, max: rand(0.7, 1.1) };
        nextShoot = rand(5, 11);
      }
      if (shooting) {
        const s = shooting;
        s.life += dt; s.x += s.vx * dt; s.y += s.vy * dt;
        const k = 1 - s.life / s.max;
        const tail = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 0.18, s.y - s.vy * 0.18);
        tail.addColorStop(0, `rgba(255,248,220,${0.9 * k})`);
        tail.addColorStop(1, 'rgba(255,248,220,0)');
        ctx.strokeStyle = tail;
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx * 0.18, s.y - s.vy * 0.18); ctx.stroke();
        if (s.life >= s.max) shooting = null;
      }
    },
  };
}
