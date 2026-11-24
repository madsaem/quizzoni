// Effets visuels : confettis (gélules, croix), secousse, textes flottants,
// compteur animé et tracé d'ECG en fond de partie.
import { h, fmt, prefersReducedMotion } from './utils.js';

/* ================================================================ Confettis */
const canvas = document.getElementById('fx-canvas');
const cctx = canvas.getContext('2d');
let particles = [];
let running = false;
let dpr = 1;

function resizeFx() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
}
resizeFx();
window.addEventListener('resize', resizeFx);

function palette() {
  const cs = getComputedStyle(document.documentElement);
  const get = (v) => cs.getPropertyValue(v).trim();
  return {
    all: ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'].map(get),
    // pas de croix rouge sur fond clair (emblème protégé) : croix vertes, bleues ou jaunes
    cross: ['--brand', '--c2', '--c3', '--c4'].map(get),
    white: '#ffffff',
  };
}

function makeParticle(x, y, vx, vy, pal) {
  const r = Math.random();
  const shape = r < 0.42 ? 'pill' : r < 0.7 ? 'cross' : 'rect';
  const colors = shape === 'cross' ? pal.cross : pal.all;
  return {
    x, y, vx, vy,
    shape,
    color: colors[(Math.random() * colors.length) | 0],
    size: shape === 'rect' ? 7 + Math.random() * 6 : 9 + Math.random() * 7,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.3,
    wob: Math.random() * Math.PI * 2,
    life: 1,
    decay: 0.006 + Math.random() * 0.006,
  };
}

function drawParticle(p) {
  const c = cctx;
  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.rot);
  c.globalAlpha = Math.min(1, p.life * 2.5);
  const s = p.size;
  if (p.shape === 'rect') {
    c.fillStyle = p.color;
    c.fillRect(-s / 2, -s / 4, s, s / 2);
  } else if (p.shape === 'cross') {
    const t = s / 3;
    c.fillStyle = p.color;
    c.fillRect(-t / 2, -s / 2, t, s);
    c.fillRect(-s / 2, -t / 2, s, t);
  } else {
    // gélule bicolore
    const w = s * 1.5, hh = s * 0.62, r = hh / 2;
    c.beginPath();
    c.moveTo(0, -r); c.lineTo(-w / 2 + r, -r);
    c.arc(-w / 2 + r, 0, r, -Math.PI / 2, Math.PI / 2, true);
    c.lineTo(0, r); c.closePath();
    c.fillStyle = p.color; c.fill();
    c.beginPath();
    c.moveTo(0, -r); c.lineTo(w / 2 - r, -r);
    c.arc(w / 2 - r, 0, r, -Math.PI / 2, Math.PI / 2, false);
    c.lineTo(0, r); c.closePath();
    c.fillStyle = '#ffffff'; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1; c.stroke();
  }
  c.restore();
}

function loop() {
  cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  cctx.clearRect(0, 0, canvas.width, canvas.height);
  const H = window.innerHeight + 40;
  particles = particles.filter((p) => p.life > 0 && p.y < H);
  for (const p of particles) {
    p.vy += 0.22;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.wob += 0.12;
    p.x += p.vx + Math.sin(p.wob) * 0.6;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= p.decay;
    drawParticle(p);
  }
  if (particles.length) requestAnimationFrame(loop);
  else { running = false; cctx.clearRect(0, 0, canvas.width, canvas.height); }
}

function start() {
  if (!running) { running = true; requestAnimationFrame(loop); }
}

/** Gerbe de confettis depuis un point (coordonnées écran). */
export function burst(x, y, { count = 34, power = 1 } = {}) {
  if (prefersReducedMotion()) return;
  const pal = palette();
  for (let i = 0; i < count; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const sp = (5 + Math.random() * 8) * power;
    particles.push(makeParticle(x, y, Math.cos(a) * sp, Math.sin(a) * sp, pal));
  }
  start();
}

/** Pluie de confettis sur tout l'écran (fin de partie réussie). */
export function rain(count = 140) {
  if (prefersReducedMotion()) return;
  const pal = palette();
  for (let i = 0; i < count; i++) {
    const p = makeParticle(Math.random() * window.innerWidth, -20 - Math.random() * window.innerHeight * 0.6,
      (Math.random() - 0.5) * 3, 2 + Math.random() * 3, pal);
    p.decay *= 0.5;
    particles.push(p);
  }
  start();
}

/* ========================================================= Petits effets */
export function shake(el) {
  if (!el || prefersReducedMotion()) return;
  el.classList.remove('is-shaking');
  void el.offsetWidth;
  el.classList.add('is-shaking');
  setTimeout(() => el.classList.remove('is-shaking'), 500);
}

export function floatText(text, x, y, color) {
  const el = h('div', { class: 'float-text', style: { left: `${x}px`, top: `${y}px`, color } }, text);
  document.body.append(el);
  setTimeout(() => el.remove(), 1200);
}

export function centerOf(el) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function countUp(el, from, to, dur = 700) {
  if (prefersReducedMotion() || from === to) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / dur);
    const e = 1 - Math.pow(1 - k, 3);
    el.textContent = fmt(Math.round(from + (to - from) * e));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export function vibrate(pattern) {
  try { if (navigator.vibrate && !prefersReducedMotion()) navigator.vibrate(pattern); } catch { /* rien */ }
}

/* ======================================================= Moniteur ECG */
const g = (x, mu, sig) => Math.exp(-((x - mu) ** 2) / (2 * sig * sig));
function ecgWave(p) {
  return 0.13 * g(p, 0.12, 0.028)
    - 0.12 * g(p, 0.235, 0.009)
    + 1.0 * g(p, 0.255, 0.011)
    - 0.28 * g(p, 0.278, 0.01)
    + 0.27 * g(p, 0.47, 0.045);
}

/**
 * Tracé d'ECG qui défile (balayage gauche → droite, comme un scope).
 * monitor.setBpm(n) accélère le rythme ; monitor.kick('good' | 'bad') réagit à une réponse.
 */
export function createMonitor(cv) {
  const c = cv.getContext('2d');
  let w = 0, hgt = 0, ratio = 1;
  let buf = new Float32Array(1);
  let head = 0;
  let phase = 0.6;
  let bpm = 70;
  let last = performance.now();
  let raf = 0;
  let color = '#73F0C8';
  let flash = null;
  let flashUntil = 0;
  let boost = 1;
  let stopped = false;
  const speed = 150;
  const gap = 26;

  function readColors() {
    const cs = getComputedStyle(document.documentElement);
    color = cs.getPropertyValue('--trace').trim() || color;
  }

  function resize() {
    ratio = Math.min(2, window.devicePixelRatio || 1);
    w = cv.clientWidth; hgt = cv.clientHeight;
    cv.width = Math.round(w * ratio); cv.height = Math.round(hgt * ratio);
    const old = buf;
    buf = new Float32Array(Math.max(1, Math.ceil(w)));
    buf.set(old.subarray(0, Math.min(old.length, buf.length)));
    if (head >= buf.length) head = 0;
  }

  function draw() {
    c.setTransform(ratio, 0, 0, ratio, 0, 0);
    c.clearRect(0, 0, w, hgt);
    const base = hgt * 0.6;
    const amp = Math.min(150, hgt * 0.2);
    const now = performance.now();
    const col = flash && now < flashUntil ? flash.color : color;
    c.lineWidth = 2.5;
    c.lineJoin = 'round';
    c.strokeStyle = col;
    c.shadowColor = col;
    c.shadowBlur = 10;
    c.beginPath();
    let penUp = true;
    const len = buf.length;
    for (let x = 0; x < len; x++) {
      const d = (x - head + len) % len;
      if (d > 0 && d < gap) { penUp = true; continue; }
      const y = base - buf[x] * amp;
      if (penUp) { c.moveTo(x, y); penUp = false; } else c.lineTo(x, y);
    }
    c.stroke();
    // point lumineux en tête de balayage
    const hx = (head - 1 + len) % len;
    c.fillStyle = col;
    c.beginPath();
    c.arc(hx, base - buf[hx] * amp, 4, 0, Math.PI * 2);
    c.fill();
  }

  function frame(now) {
    if (stopped) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const n = Math.max(1, Math.round(speed * dt));
    for (let i = 0; i < n; i++) {
      phase += (bpm / 60) * (dt / n);
      if (phase >= 1) { phase -= 1; boost = 1 + (boost - 1) * 0.4; }
      buf[head] = ecgWave(phase) * boost;
      head = (head + 1) % buf.length;
    }
    draw();
    raf = requestAnimationFrame(frame);
  }

  function staticTrace() {
    for (let x = 0; x < buf.length; x++) buf[x] = ecgWave((x / 220) % 1);
    head = 0;
    draw();
  }

  const onTheme = () => { readColors(); if (prefersReducedMotion()) draw(); };
  const onResize = () => { resize(); if (prefersReducedMotion()) staticTrace(); };

  resize();
  readColors();
  window.addEventListener('resize', onResize);
  document.addEventListener('themechange', onTheme);
  if (prefersReducedMotion()) staticTrace();
  else raf = requestAnimationFrame(frame);

  return {
    setBpm(v) { bpm = v; },
    kick(kind) {
      const cs = getComputedStyle(document.documentElement);
      flash = { kind, color: cs.getPropertyValue(kind === 'good' ? '--good' : kind === 'mid' ? '--mid' : '--bad').trim() };
      flashUntil = performance.now() + 1100;
      if (kind === 'good') boost = 1.6;
      if (kind === 'bad') { phase = 0.2; boost = 1.3; }
      if (prefersReducedMotion()) draw();
    },
    destroy() {
      stopped = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('themechange', onTheme);
    },
  };
}
