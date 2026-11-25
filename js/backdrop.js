// Fonds animés de certains thèmes, dessinés derrière tout le contenu.
//   etoiles  : ciel étoilé qui scintille, nébuleuses, étoiles filantes, constellations
//   pinksoni : grandes étoiles filantes qui tombent et éclatent en cœurs au sol
//   mayuff   : deux puffs en 3D qui tournent (WebGL, voir puffs.js)
//   warfare  : globe en fil de fer, grille en perspective, cibles, coordonnées (Bastia)
import { prefersReducedMotion } from './utils.js';
import { setPuffs } from './puffs.js';

let canvas = null;
let ctx = null;
let raf = 0;
let painter = null;
let W = 0, H = 0, DPR = 1;
let last = 0;

const PAINTERS = { etoiles: starry, pinksoni: pinkFall, warfare: holo };

export function setBackdrop(theme) {
  stop();
  setPuffs(theme === 'mayuff');
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

/* ------------------------------------------- Pinksoni : étoiles et cœurs */
function starPath(r, inner = 0.46) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * inner : r;
    const a = -Math.PI / 2 + i * Math.PI / 5;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}
function heartPath(s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 0.55, s * 0.5, -s, s * 0.15, -s, -s * 0.3);
  ctx.arc(-s * 0.5, -s * 0.3, s * 0.5, Math.PI, 0);
  ctx.arc(s * 0.5, -s * 0.3, s * 0.5, Math.PI, 0);
  ctx.bezierCurveTo(s, s * 0.15, s * 0.55, s * 0.5, 0, s * 0.9);
  ctx.closePath();
}

function pinkFall() {
  const stars = [];
  const hearts = [];
  let next = 0.4;
  const HEARTS = ['#FF2E88', '#FF5C9E', '#FF8FB8', '#FFB3D1', '#E5246B', '#C2185B', '#FF4D6D', '#D7263D', '#FFD1E3', '#B5123F'];
  const FILLS = [['#FFFFFF', '#FFC4DF'], ['#FFF3F9', '#FF8EC2'], ['#FFE9F3', '#FF5FA2'], ['#FFFFFF', '#FFE08A']];
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  function spawn() {
    const size = rand(34, 78);
    stars.push({
      x: rand(0.06, 0.94) * W, y: -size * 1.5, size,
      vx: rand(-28, 28), vy: rand(50, 90),
      rot: rand(0, Math.PI * 2), vr: rand(-0.7, 0.7),
      fill: pick(FILLS),
    });
  }
  function explode(s) {
    const n = 14 + ((Math.random() * 10) | 0);
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 1.05, Math.PI * 1.95); // vers le haut, en éventail
      const sp = rand(140, 420);
      hearts.push({
        x: s.x + rand(-8, 8), y: H - 6,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        size: rand(6, 17), rot: rand(-0.5, 0.5), vr: rand(-2.5, 2.5),
        color: pick(HEARTS), life: 1, decay: rand(0.35, 0.65),
      });
    }
  }
  function drawStar(s) {
    const ang = Math.atan2(s.vy, s.vx);
    const len = s.size * 4.2;
    const tx = s.x - Math.cos(ang) * len, ty = s.y - Math.sin(ang) * len;
    const g = ctx.createLinearGradient(s.x, s.y, tx, ty);
    g.addColorStop(0, 'rgba(255, 255, 255, .6)');
    g.addColorStop(0.4, 'rgba(255, 200, 228, .25)');
    g.addColorStop(1, 'rgba(255, 200, 228, 0)');
    ctx.strokeStyle = g; ctx.lineWidth = s.size * 0.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(tx, ty); ctx.stroke();

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rot);
    ctx.shadowColor = 'rgba(255, 255, 255, .95)';
    ctx.shadowBlur = s.size * 0.6;
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, s.size);
    rg.addColorStop(0, s.fill[0]); rg.addColorStop(1, s.fill[1]);
    ctx.fillStyle = rg;
    starPath(s.size);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.lineWidth = 2.5; ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(255, 255, 255, .95)';
    ctx.stroke();
    ctx.restore();
  }

  return {
    draw(t, dt) {
      ctx.clearRect(0, 0, W, H);
      if (!dt) {
        // animations réduites : quelques étoiles immobiles
        [[0.12, 0.2, 40], [0.86, 0.32, 54], [0.3, 0.75, 32], [0.7, 0.8, 44]].forEach(([x, y, size], i) =>
          drawStar({ x: x * W, y: y * H, size, vx: 1, vy: 2, rot: i, fill: FILLS[i % FILLS.length] }));
        return;
      }
      next -= dt;
      if (next <= 0 && stars.length < 4) { spawn(); next = rand(1.6, 3.2); }

      for (let i = stars.length - 1; i >= 0; i--) {
        const s = stars[i];
        s.x += s.vx * dt; s.y += s.vy * dt; s.rot += s.vr * dt;
        if (s.y + s.size * 0.6 >= H) { explode(s); stars.splice(i, 1); continue; }
        drawStar(s);
      }

      for (let i = hearts.length - 1; i >= 0; i--) {
        const p = hearts[i];
        p.vy += 520 * dt;
        p.vx *= 0.99;
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.y > H - p.size) { p.y = H - p.size; p.vy *= -0.35; p.vx *= 0.8; }
        p.rot += p.vr * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0) { hearts.splice(i, 1); continue; }
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.6);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        heartPath(p.size);
        ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255, 255, 255, .7)';
        ctx.stroke();
        ctx.restore();
      }
    },
  };
}

/* ------------------------------------------------------------ Hologramme */
function holo() {
  const G = '70,255,150';
  let blips = [];
  const labels = ['42°41′N 9°27′E', 'BASTIA', 'IFSI-2B', 'GRID 0412', 'SAT-LINK OK', 'SECTEUR 7'];

  function build() {
    blips = Array.from({ length: 6 }, (_, i) => ({ lat: rand(-0.9, 0.9), lon: rand(0, Math.PI * 2), label: labels[i], ph: rand(0, 6) }));
  }
  build();

  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  return {
    resize: build,
    draw(t) {
      ctx.clearRect(0, 0, W, H);
      const bg = ctx.createRadialGradient(W * 0.7, H * 0.45, 0, W * 0.7, H * 0.45, Math.max(W, H) * 0.8);
      bg.addColorStop(0, '#04170C');
      bg.addColorStop(0.6, '#020B06');
      bg.addColorStop(1, '#010503');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // grille au sol en perspective, qui avance
      const hz = H * 0.62;
      ctx.lineWidth = 1;
      for (let i = -14; i <= 14; i++) {
        ctx.strokeStyle = `rgba(${G},${0.1 - Math.abs(i) * 0.004})`;
        line(W / 2 + i * 18, hz, W / 2 + i * W * 0.16, H);
      }
      const off = (t * 0.25) % 1;
      for (let k = 0; k < 12; k++) {
        const z = (k + off) / 12;
        const y = hz + (H - hz) * z * z;
        ctx.strokeStyle = `rgba(${G},${0.03 + z * 0.12})`;
        line(0, y, W, y);
      }
      ctx.strokeStyle = `rgba(${G},.25)`;
      line(0, hz, W, hz);

      // globe en fil de fer
      const cx = W * (W > 900 ? 0.74 : 0.5), cy = H * 0.4, R = Math.min(W, H) * (W > 900 ? 0.3 : 0.34);
      const rot = t * 0.12;
      const tilt = 0.38;
      const proj = (lat, lon) => {
        const x = Math.cos(lat) * Math.sin(lon + rot);
        const y = Math.sin(lat);
        const z = Math.cos(lat) * Math.cos(lon + rot);
        const y2 = y * Math.cos(tilt) - z * Math.sin(tilt);
        const z2 = y * Math.sin(tilt) + z * Math.cos(tilt);
        return [cx + x * R, cy - y2 * R, z2];
      };
      const glow = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
      glow.addColorStop(0, `rgba(${G},.07)`);
      glow.addColorStop(1, `rgba(${G},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, Math.PI * 2); ctx.fill();

      // deux tracés seulement (face avant, face arrière) : bien plus léger à dessiner
      const front = new Path2D();
      const back = new Path2D();
      const seg = (pts) => {
        for (let i = 1; i < pts.length; i++) {
          const [x1, y1, z1] = pts[i - 1];
          const [x2, y2, z2] = pts[i];
          const p = (z1 + z2) / 2 > 0 ? front : back;
          p.moveTo(x1, y1); p.lineTo(x2, y2);
        }
      };
      for (let la = -75; la <= 75; la += 15) {
        const pts = [];
        for (let lo = 0; lo <= 360; lo += 10) pts.push(proj((la * Math.PI) / 180, (lo * Math.PI) / 180));
        seg(pts);
      }
      for (let lo = 0; lo < 360; lo += 20) {
        const pts = [];
        for (let la = -90; la <= 90; la += 10) pts.push(proj((la * Math.PI) / 180, (lo * Math.PI) / 180));
        seg(pts);
      }
      ctx.strokeStyle = `rgba(${G},.1)`;
      ctx.stroke(back);
      ctx.strokeStyle = `rgba(${G},.42)`;
      ctx.stroke(front);
      ctx.strokeStyle = `rgba(${G},.55)`;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();

      // cibles sur le globe
      ctx.font = '600 11px Rajdhani, monospace';
      blips.forEach((b) => {
        const [x, y, z] = proj(b.lat, b.lon);
        if (z <= 0.05) return;
        const pulse = 0.5 + 0.5 * Math.sin(t * 3 + b.ph);
        ctx.strokeStyle = `rgba(${G},${0.5 + pulse * 0.4})`;
        const s = 6 + pulse * 3;
        ctx.strokeRect(x - s, y - s, s * 2, s * 2);
        ctx.fillStyle = `rgba(${G},.9)`;
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
        ctx.fillStyle = `rgba(${G},${0.45 + z * 0.4})`;
        line(x + s, y - s, x + s + 14, y - s - 12);
        ctx.fillText(b.label, x + s + 16, y - s - 14);
      });

      // balayage radar autour du globe
      const ang = (t * 0.9) % (Math.PI * 2);
      const sweep = ctx.createConicGradient ? ctx.createConicGradient(ang, cx, cy) : null;
      if (sweep) {
        sweep.addColorStop(0, `rgba(${G},.16)`);
        sweep.addColorStop(0.08, `rgba(${G},0)`);
        sweep.addColorStop(1, `rgba(${G},0)`);
        ctx.fillStyle = sweep;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = `rgba(${G},.18)`;
      ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.arc(cx, cy, R * 1.18, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      // texte de télémétrie dans un coin
      ctx.fillStyle = `rgba(${G},.45)`;
      ctx.font = '600 12px Rajdhani, monospace';
      const clock = new Date();
      const hh = String(clock.getHours()).padStart(2, '0'), mm = String(clock.getMinutes()).padStart(2, '0'), ss = String(clock.getSeconds()).padStart(2, '0');
      [`T+ ${hh}:${mm}:${ss}`, `LAT 42.70  LON 09.45`, `SIGNAL ${(92 + Math.sin(t) * 6).toFixed(1)} %`].forEach((txt, i) => ctx.fillText(txt, 18, H - 54 + i * 16));
    },
  };
}
