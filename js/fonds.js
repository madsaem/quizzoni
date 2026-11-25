// Fonds animés des thèmes ajoutés le 25/11/2026 (dessinés dans le canvas de backdrop.js).
// Chaque fonction reçoit env = { ctx, W, H, DPR }, tenu à jour par backdrop.js, et renvoie
// { draw(t, dt), resize() }. dt vaut 0 quand les animations sont réduites : on dessine une image fixe.

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Canvas hors écran à la taille de l'écran (pour les décors fixes, dessinés une seule fois). */
function layer(env, paint) {
  const c = document.createElement('canvas');
  c.width = Math.round(env.W * env.DPR);
  c.height = Math.round(env.H * env.DPR);
  const g = c.getContext('2d');
  g.setTransform(env.DPR, 0, 0, env.DPR, 0, 0);
  paint(g, env.W, env.H);
  return c;
}
const blit = (env, c) => env.ctx.drawImage(c, 0, 0, env.W, env.H);

/* =================================================================== Automne */
const LEAF_COLORS = ['#C8561F', '#E07A2E', '#D9A021', '#A8323A', '#8E3B22', '#E9B44C', '#B5651D', '#C0392B'];

function leafPath(g, s, maple) {
  g.beginPath();
  if (maple) {
    // érable : cinq pointes
    const pts = [[0, -1], [.22, -.45], [.62, -.62], [.45, -.18], [.95, .05], [.42, .2], [.48, .62], [0, .38], [-.48, .62], [-.42, .2], [-.95, .05], [-.45, -.18], [-.62, -.62], [-.22, -.45]];
    pts.forEach(([x, y], i) => (i ? g.lineTo(x * s, y * s) : g.moveTo(x * s, y * s)));
    g.closePath();
  } else {
    g.moveTo(0, -s);
    g.quadraticCurveTo(s * .75, -s * .2, 0, s * .85);
    g.quadraticCurveTo(-s * .75, -s * .2, 0, -s);
  }
}
function drawLeaf(g, l) {
  g.save();
  g.translate(l.x, l.y);
  g.rotate(l.rot);
  g.scale(1, l.flip);
  g.fillStyle = l.color;
  leafPath(g, l.size, l.maple);
  g.fill();
  g.strokeStyle = 'rgba(60, 25, 8, .45)';
  g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, -l.size * .7); g.lineTo(0, l.size * 1.15); g.stroke();
  g.restore();
}

export function automne(env) {
  let scene = null;
  let leaves = [];
  let trees = [];

  function build() {
    const { W, H } = env;
    const ground = H * .82;
    const nt = Math.max(4, Math.round(W / 230));
    trees = Array.from({ length: nt }, (_, i) => ({
      x: ((i + .5) / nt) * W + rand(-40, 40),
      y: ground + rand(-6, 10),
      h: rand(.2, .32) * H,
      r: rand(.07, .1) * Math.min(W, H * 1.4),
    }));
    scene = layer(env, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#F5A962'); sky.addColorStop(.45, '#F8CF94'); sky.addColorStop(1, '#F1E0C0');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      // soleil bas
      const sx = W * .78, sy = H * .3, sr = Math.min(W, H) * .085;
      const glow = g.createRadialGradient(sx, sy, sr * .5, sx, sy, sr * 5);
      glow.addColorStop(0, 'rgba(255, 226, 150, .85)'); glow.addColorStop(1, 'rgba(255, 226, 150, 0)');
      g.fillStyle = glow; g.fillRect(0, 0, W, H);
      const disk = g.createRadialGradient(sx - sr * .3, sy - sr * .3, sr * .1, sx, sy, sr);
      disk.addColorStop(0, '#FFF1C4'); disk.addColorStop(1, '#FFB65A');
      g.fillStyle = disk; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
      // collines
      [[.66, '#D9A06A', .5], [.74, '#B97446', .7], [.82, '#8A5230', 1]].forEach(([yy, col, a], k) => {
        g.globalAlpha = a; g.fillStyle = col;
        g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 12) g.lineTo(x, H * yy + Math.sin(x / (160 + k * 70) + k * 2) * 14 + Math.sin(x / 47 + k) * 4);
        g.lineTo(W, H); g.closePath(); g.fill();
      });
      g.globalAlpha = 1;
      // arbres : tronc, branches, feuillage en touffes
      trees.forEach((tr) => {
        g.strokeStyle = '#4A2A17'; g.lineCap = 'round';
        g.lineWidth = tr.r * .16;
        g.beginPath(); g.moveTo(tr.x, tr.y); g.lineTo(tr.x + tr.r * .05, tr.y - tr.h); g.stroke();
        g.lineWidth = tr.r * .07;
        [[-.7, .55], [.6, .6], [-.4, .82], [.35, .85]].forEach(([dx, hy]) => {
          g.beginPath(); g.moveTo(tr.x, tr.y - tr.h * hy * .8); g.lineTo(tr.x + dx * tr.r, tr.y - tr.h * hy - tr.r * .2); g.stroke();
        });
        for (let i = 0; i < 26; i++) {
          const a = rand(0, Math.PI * 2), d = Math.sqrt(Math.random()) * tr.r;
          g.globalAlpha = .9;
          g.fillStyle = pick(LEAF_COLORS);
          g.beginPath();
          g.arc(tr.x + Math.cos(a) * d * 1.15, tr.y - tr.h - tr.r * .15 + Math.sin(a) * d * .8, tr.r * rand(.22, .38), 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      });
      // tapis de feuilles au sol
      for (let i = 0; i < W / 9; i++) {
        drawLeaf(g, { x: rand(0, W), y: rand(ground + 4, H), size: rand(4, 8), rot: rand(0, 6.3), flip: rand(.5, 1), color: pick(LEAF_COLORS), maple: Math.random() < .5 });
      }
    });
    leaves = Array.from({ length: Math.round(Math.min(34, W / 40)) }, () => spawn(true));
  }

  function spawn(anywhere) {
    const tr = Math.random() < .55 && trees.length ? pick(trees) : null;
    return {
      x: tr ? tr.x + rand(-tr.r, tr.r) : rand(0, env.W),
      y: anywhere ? rand(0, env.H) : tr ? tr.y - tr.h - rand(0, tr.r * .5) : -20,
      size: rand(7, 13), rot: rand(0, 6.3), vr: rand(-1.6, 1.6),
      vy: rand(26, 52), sway: rand(.8, 1.8), amp: rand(18, 46), ph: rand(0, 6.3),
      flip: 1, color: pick(LEAF_COLORS), maple: Math.random() < .55,
    };
  }

  build();
  return {
    resize: build,
    draw(t, dt) {
      blit(env, scene);
      const g = env.ctx;
      leaves.forEach((l, i) => {
        if (dt) {
          l.y += l.vy * dt;
          l.x += (Math.sin(t * l.sway + l.ph) * l.amp + 14) * dt;
          l.rot += l.vr * dt;
          l.flip = Math.cos(t * l.sway * 1.7 + l.ph);
          if (l.y > env.H + 20 || l.x > env.W + 30) leaves[i] = spawn(false);
        }
        drawLeaf(g, l);
      });
    },
  };
}

/* =================================================================== Scarlet */
function knifePath(g, len) {
  // lame fine et légèrement courbe, garde, manche
  g.beginPath();
  g.moveTo(len * .5, 0);
  g.quadraticCurveTo(len * .1, -len * .07, -len * .12, -len * .05);
  g.lineTo(-len * .12, len * .03);
  g.quadraticCurveTo(len * .1, len * .02, len * .5, 0);
  g.closePath();
}
function drawKnife(g, x, y, ang, len, alpha = 1) {
  g.save();
  g.translate(x, y); g.rotate(ang); g.globalAlpha = alpha;
  const bl = g.createLinearGradient(0, -len * .06, 0, len * .04);
  bl.addColorStop(0, '#FFFFFF'); bl.addColorStop(.5, '#C9CED8'); bl.addColorStop(1, '#7E8596');
  g.fillStyle = bl; g.shadowColor = 'rgba(190, 210, 255, .9)'; g.shadowBlur = 10;
  knifePath(g, len); g.fill();
  g.shadowBlur = 0;
  g.fillStyle = '#E3B04B'; g.fillRect(-len * .15, -len * .085, len * .035, len * .15);
  g.fillStyle = '#3A1020'; g.fillRect(-len * .34, -len * .035, len * .19, len * .06);
  g.restore();
}

export function scarlet(env) {
  let scene = null;
  let windows = [];
  let bats = [];
  let spear = null;
  let sparks = [];
  let nextSpear = 3;
  let nextBats = 2;
  let stop = null;            // arrêt du temps en cours
  let nextStop = 22;
  let veil = null;

  function build() {
    const { W, H } = env;
    windows = [];
    scene = layer(env, (g) => {
      const sky = g.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#2A0510'); sky.addColorStop(.6, '#160309'); sky.addColorStop(1, '#0A0104');
      g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < W * H / 9000; i++) { g.fillStyle = `rgba(255, 220, 230, ${rand(.15, .6)})`; g.fillRect(rand(0, W), rand(0, H * .6), 1.2, 1.2); }
      // lune de sang
      const mx = W * .78, my = H * .24, mr = Math.min(W, H) * .13;
      const halo = g.createRadialGradient(mx, my, mr * .8, mx, my, mr * 3.2);
      halo.addColorStop(0, 'rgba(215, 25, 63, .45)'); halo.addColorStop(1, 'rgba(215, 25, 63, 0)');
      g.fillStyle = halo; g.fillRect(0, 0, W, H);
      const moon = g.createRadialGradient(mx - mr * .35, my - mr * .35, mr * .1, mx, my, mr);
      moon.addColorStop(0, '#FF7A8A'); moon.addColorStop(.55, '#D41B3C'); moon.addColorStop(1, '#7A0A1E');
      g.fillStyle = moon; g.beginPath(); g.arc(mx, my, mr, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(90, 5, 20, .35)';
      [[-.3, -.1, .18], [.25, .2, .14], [.05, -.42, .09], [-.1, .4, .1]].forEach(([dx, dy, r]) => { g.beginPath(); g.arc(mx + dx * mr, my + dy * mr, r * mr, 0, Math.PI * 2); g.fill(); });
      // manoir gothique en ombre chinoise
      const base = H * .8;
      const cx = W * .5;
      const s = Math.min(W / 1400, H / 900) * 1.1 + .35;
      g.fillStyle = '#070003';
      const tower = (x, w, h, roof) => {
        g.fillRect(x - w / 2, base - h, w, h + H);
        g.beginPath(); g.moveTo(x - w / 2 - 6 * s, base - h); g.lineTo(x, base - h - roof); g.lineTo(x + w / 2 + 6 * s, base - h); g.fill();
        for (let k = 0; k < Math.floor(h / (46 * s)); k++) windows.push({ x: x - 5 * s, y: base - h + 22 * s + k * 46 * s, w: 10 * s, h: 18 * s, ph: rand(0, 6) });
      };
      g.fillRect(cx - 330 * s, base - 120 * s, 660 * s, 120 * s + H);
      for (let x = cx - 330 * s; x < cx + 330 * s; x += 22 * s) g.fillRect(x, base - 132 * s, 12 * s, 14 * s);
      for (let x = cx - 300 * s; x < cx + 300 * s; x += 40 * s) windows.push({ x, y: base - 90 * s, w: 14 * s, h: 26 * s, ph: rand(0, 6) });
      tower(cx - 360 * s, 70 * s, 230 * s, 110 * s);
      tower(cx + 360 * s, 70 * s, 260 * s, 120 * s);
      tower(cx - 190 * s, 50 * s, 190 * s, 80 * s);
      tower(cx + 190 * s, 50 * s, 200 * s, 85 * s);
      tower(cx, 110 * s, 300 * s, 150 * s);   // tour de l'horloge
      // horloge
      const ky = base - 230 * s;
      g.strokeStyle = 'rgba(227, 176, 75, .6)'; g.lineWidth = 2 * s;
      g.beginPath(); g.arc(cx, ky, 30 * s, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * 24 * s, ky + Math.sin(a) * 24 * s); g.lineTo(cx + Math.cos(a) * 28 * s, ky + Math.sin(a) * 28 * s); g.stroke(); }
      g.fillStyle = '#050002'; g.fillRect(0, base + 40 * s, W, H);
    });
  }

  function newSpear() {
    const fromLeft = Math.random() < .5;
    const y0 = rand(.08, .55) * env.H, y1 = y0 + rand(-.15, .35) * env.H;
    const x0 = fromLeft ? -200 : env.W + 200, x1 = fromLeft ? env.W + 400 : -400;
    return { x0, y0, x1, y1, p: 0, dur: rand(.45, .7) };
  }
  function drawSpear(g, x, y, ang) {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.shadowColor = '#FF2A4A'; g.shadowBlur = 34;
    g.strokeStyle = '#FF3355'; g.lineWidth = 7; g.lineCap = 'round';
    g.beginPath(); g.moveTo(-170, 0); g.lineTo(40, 0); g.stroke();
    g.strokeStyle = '#FFE1E6'; g.lineWidth = 2.5;
    g.beginPath(); g.moveTo(-160, 0); g.lineTo(40, 0); g.stroke();
    // pointe en losange et ailettes
    g.fillStyle = '#FF4A63';
    g.beginPath(); g.moveTo(110, 0); g.lineTo(40, -16); g.lineTo(52, 0); g.lineTo(40, 16); g.closePath(); g.fill();
    g.fillStyle = '#FFF0F3';
    g.beginPath(); g.moveTo(104, 0); g.lineTo(48, -6); g.lineTo(54, 0); g.lineTo(48, 6); g.closePath(); g.fill();
    g.fillStyle = '#FF3355';
    g.beginPath(); g.moveTo(30, 0); g.lineTo(6, -22); g.lineTo(18, 0); g.lineTo(6, 22); g.closePath(); g.fill();
    g.restore();
  }
  function drawBat(g, b, t) {
    const f = Math.sin(t * b.flap + b.ph);
    g.save(); g.translate(b.x, b.y); g.scale(b.s * (b.vx < 0 ? -1 : 1), b.s);
    g.fillStyle = '#0A0004';
    g.beginPath();
    g.moveTo(0, 0);
    g.quadraticCurveTo(-8, -8 - f * 8, -20, -4 - f * 10);
    g.quadraticCurveTo(-14, 0, -16, 4);
    g.quadraticCurveTo(-8, 2, 0, 6);
    g.quadraticCurveTo(8, 2, 16, 4);
    g.quadraticCurveTo(14, 0, 20, -4 - f * 10);
    g.quadraticCurveTo(8, -8 - f * 8, 0, 0);
    g.fill();
    g.restore();
  }
  function setVeil(on) {
    if (on && !veil) { veil = document.createElement('div'); veil.id = 'timestop'; document.body.append(veil); requestAnimationFrame(() => veil?.classList.add('is-on')); }
    if (!on && veil) { const v = veil; veil = null; v.classList.remove('is-on'); setTimeout(() => v.remove(), 250); }
  }

  build();
  return {
    resize: build,
    stop() { setVeil(false); },
    draw(t, dt) {
      const g = env.ctx;
      const frozen = stop && stop.t < 1.4;
      blit(env, scene);
      // fenêtres éclairées qui vacillent
      windows.forEach((w) => {
        const a = frozen ? .7 : .55 + Math.sin(t * 2.2 + w.ph) * .15 + (Math.random() < .01 ? -.3 : 0);
        g.fillStyle = `rgba(255, 70, 90, ${a})`;
        g.fillRect(w.x, w.y, w.w, w.h);
      });
      if (!dt) return;

      // arrêt du temps (pas pendant une partie : trop distrayant)
      nextStop -= dt;
      if (!stop && nextStop <= 0 && location.hash !== '#/play') {
        const cx = rand(.3, .7) * env.W, cy = rand(.3, .6) * env.H;
        const n = 12;
        stop = { t: 0, cx, cy, knives: Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2 + rand(-.1, .1); const d = rand(110, 170); return { a, d, len: rand(46, 62) }; }) };
        setVeil(true);
      }
      if (stop) {
        stop.t += dt;
        const { cx, cy } = stop;
        if (stop.t < 1.4) {
          // horloge et couteaux figés
          g.save(); g.globalAlpha = Math.min(1, stop.t * 4) * .9;
          g.strokeStyle = '#E3E6F0'; g.lineWidth = 2;
          g.beginPath(); g.arc(cx, cy, 70, 0, Math.PI * 2); g.stroke();
          for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; g.beginPath(); g.moveTo(cx + Math.cos(a) * 58, cy + Math.sin(a) * 58); g.lineTo(cx + Math.cos(a) * 66, cy + Math.sin(a) * 66); g.stroke(); }
          g.lineWidth = 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx, cy - 46); g.moveTo(cx, cy); g.lineTo(cx + 30, cy + 8); g.stroke();
          g.restore();
          stop.knives.forEach((k) => drawKnife(g, cx + Math.cos(k.a) * k.d, cy + Math.sin(k.a) * k.d, k.a + Math.PI, k.len, Math.min(1, stop.t * 5)));
        } else {
          if (veil) setVeil(false);
          const p = (stop.t - 1.4) / .5;
          stop.knives.forEach((k) => drawKnife(g, cx + Math.cos(k.a) * (k.d - p * k.d * .9), cy + Math.sin(k.a) * (k.d - p * k.d * .9), k.a + Math.PI, k.len, 1 - p));
          if (p >= 1) { stop = null; nextStop = rand(35, 55); }
        }
        if (stop && stop.t < 1.4) return;   // le temps est arrêté : rien d'autre ne bouge
      }

      // chauves-souris
      nextBats -= dt;
      if (nextBats <= 0) {
        const left = Math.random() < .5, y = rand(.1, .5) * env.H;
        for (let i = 0; i < 3 + (Math.random() * 4 | 0); i++) bats.push({ x: left ? -30 - i * 30 : env.W + 30 + i * 30, y: y + rand(-40, 40), vx: (left ? 1 : -1) * rand(90, 150), vy: rand(-12, 12), s: rand(.7, 1.3), flap: rand(14, 20), ph: rand(0, 6) });
        nextBats = rand(6, 12);
      }
      bats = bats.filter((b) => b.x > -120 && b.x < env.W + 120);
      bats.forEach((b) => { b.x += b.vx * dt; b.y += (b.vy + Math.sin(t * 3 + b.ph) * 20) * dt; drawBat(g, b, t); });

      // la lance écarlate
      nextSpear -= dt;
      if (!spear && nextSpear <= 0) { spear = newSpear(); nextSpear = rand(7, 13); }
      if (spear) {
        spear.p += dt / spear.dur;
        const e = spear.p;
        const x = spear.x0 + (spear.x1 - spear.x0) * e, y = spear.y0 + (spear.y1 - spear.y0) * e;
        const ang = Math.atan2(spear.y1 - spear.y0, spear.x1 - spear.x0);
        const tail = 520;
        const tg = g.createLinearGradient(x, y, x - Math.cos(ang) * tail, y - Math.sin(ang) * tail);
        tg.addColorStop(0, 'rgba(255, 60, 90, .75)'); tg.addColorStop(1, 'rgba(255, 60, 90, 0)');
        g.save(); g.strokeStyle = tg; g.lineWidth = 16; g.lineCap = 'round'; g.shadowColor = '#FF2A4A'; g.shadowBlur = 24;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * tail, y - Math.sin(ang) * tail); g.stroke(); g.restore();
        for (let i = 0; i < 6; i++) sparks.push({ x: x - Math.cos(ang) * rand(0, 200), y: y - Math.sin(ang) * rand(0, 200), vx: rand(-60, 60), vy: rand(-60, 60), life: 1 });
        drawSpear(g, x, y, ang);
        if (e < .15) { g.fillStyle = `rgba(255, 40, 70, ${.08 * (1 - e / .15)})`; g.fillRect(0, 0, env.W, env.H); }
        if (e >= 1) spear = null;
      }
      sparks = sparks.filter((s) => (s.life -= dt * 1.6) > 0);
      sparks.forEach((s) => { s.x += s.vx * dt; s.y += s.vy * dt; g.fillStyle = `rgba(255, ${120 + s.life * 100 | 0}, ${140 + s.life * 80 | 0}, ${s.life})`; g.fillRect(s.x, s.y, 2.2, 2.2); });
    },
  };
}

/* ==================================================================== Gilded */
function drawCoin(g, x, y, r, ang, glint) {
  const sx = Math.cos(ang);
  g.save(); g.translate(x, y);
  // tranche
  g.fillStyle = '#8A6A1E';
  g.beginPath(); g.ellipse(Math.sign(sx) * -2, 0, Math.max(1.5, Math.abs(sx) * r), r, 0, 0, Math.PI * 2); g.fill();
  const face = g.createRadialGradient(-r * .3 * sx, -r * .35, r * .1, 0, 0, r);
  face.addColorStop(0, '#FFF6C9'); face.addColorStop(.45, '#F0C94A'); face.addColorStop(1, '#A7801F');
  g.fillStyle = face;
  g.beginPath(); g.ellipse(0, 0, Math.max(1, Math.abs(sx) * r), r, 0, 0, Math.PI * 2); g.fill();
  if (Math.abs(sx) > .3) {
    g.scale(sx, 1);
    g.strokeStyle = 'rgba(120, 85, 20, .7)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(0, 0, r * .78, 0, Math.PI * 2); g.stroke();
    g.fillStyle = 'rgba(120, 85, 20, .65)';
    g.fillRect(-r * .12, -r * .45, r * .24, r * .9); g.fillRect(-r * .45, -r * .12, r * .9, r * .24);
  }
  g.restore();
  if (glint > 0) {
    g.save(); g.translate(x - r * .35, y - r * .4); g.globalAlpha = glint; g.fillStyle = '#FFFFFF';
    g.beginPath(); g.moveTo(0, -r * .7); g.lineTo(r * .1, -r * .1); g.lineTo(r * .7, 0); g.lineTo(r * .1, r * .1); g.lineTo(0, r * .7); g.lineTo(-r * .1, r * .1); g.lineTo(-r * .7, 0); g.lineTo(-r * .1, -r * .1); g.closePath(); g.fill();
    g.restore();
  }
}

export function gilded(env) {
  const coins = [];
  const spawn = (anywhere) => ({
    x: rand(.03, .97) * env.W, y: anywhere ? rand(0, env.H) : -40,
    r: rand(10, 20), vy: rand(18, 38), ang: rand(0, 6.3), va: rand(1.2, 3) * (Math.random() < .5 ? -1 : 1),
    sway: rand(.4, 1), ph: rand(0, 6.3), glint: 0,
  });
  const reset = () => { coins.length = 0; for (let i = 0; i < Math.min(12, Math.round(env.W / 120)); i++) coins.push(spawn(true)); };
  reset();
  return {
    resize: reset,
    draw(t, dt) {
      const g = env.ctx;
      g.clearRect(0, 0, env.W, env.H);
      coins.forEach((c, i) => {
        if (dt) {
          c.y += c.vy * dt; c.x += Math.sin(t * c.sway + c.ph) * 10 * dt; c.ang += c.va * dt;
          if (Math.random() < .004) c.glint = 1;
          c.glint = Math.max(0, c.glint - dt * 2.5);
          if (c.y > env.H + 40) coins[i] = spawn(false);
        }
        g.globalAlpha = .9;
        drawCoin(g, c.x, c.y, c.r, c.ang, c.glint);
        g.globalAlpha = 1;
      });
    },
  };
}

/* ==================================================================== Grunge */
export function grunge(env) {
  let scene = null;
  let dust = [];
  let drips = [];
  let flick = 1;
  let target = 1;

  function build() {
    const { W, H } = env;
    scene = layer(env, (g) => {
      g.fillStyle = '#1A1512'; g.fillRect(0, 0, W, H);
      // briques
      const bh = 34, bw = 78;
      for (let row = 0, y = 0; y < H; row++, y += bh) {
        for (let x = (row % 2) * -bw / 2; x < W; x += bw) {
          const l = rand(14, 24);
          g.fillStyle = `hsl(${rand(14, 26)}, ${rand(18, 30)}%, ${l}%)`;
          g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
          if (Math.random() < .25) { g.fillStyle = `rgba(0, 0, 0, ${rand(.1, .35)})`; g.fillRect(x + rand(0, bw / 2), y + 2, rand(8, bw / 2), bh - 4); }
        }
      }
      // taches d'humidité, coulures de rouille, moisissure
      for (let i = 0; i < 18; i++) {
        const x = rand(0, W), y = rand(0, H), r = rand(40, 160);
        const st = g.createRadialGradient(x, y, 0, x, y, r);
        const col = pick(['40, 55, 30', '70, 40, 20', '20, 18, 14', '90, 50, 20']);
        st.addColorStop(0, `rgba(${col}, ${rand(.25, .5)})`); st.addColorStop(1, `rgba(${col}, 0)`);
        g.fillStyle = st; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 14; i++) {
        const x = rand(0, W), y = rand(0, H * .5), h = rand(60, 260);
        const run = g.createLinearGradient(0, y, 0, y + h);
        run.addColorStop(0, 'rgba(120, 55, 20, .5)'); run.addColorStop(1, 'rgba(120, 55, 20, 0)');
        g.fillStyle = run; g.fillRect(x, y, rand(2, 6), h);
      }
      // toiles d'araignée dans les coins du haut
      const web = (cx, cy, dir) => {
        g.strokeStyle = 'rgba(225, 220, 205, .28)'; g.lineWidth = .8;
        const R = Math.min(W, H) * .28;
        const rays = 7;
        for (let i = 0; i <= rays; i++) { const a = (i / rays) * Math.PI / 2; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + dir * Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke(); }
        for (let k = 1; k < 9; k++) {
          const d = (k / 9) * R;
          g.beginPath();
          for (let i = 0; i <= rays; i++) {
            const a = (i / rays) * Math.PI / 2, dd = d * (i % 2 ? .93 : 1);
            const px = cx + dir * Math.cos(a) * dd, py = cy + Math.sin(a) * dd;
            if (!i) g.moveTo(px, py); else g.quadraticCurveTo(cx + dir * Math.cos(a - .1) * dd * .9, cy + Math.sin(a - .1) * dd * .9, px, py);
          }
          g.stroke();
        }
      };
      web(0, 0, 1); web(W, 0, -1);
      // tuyau rouillé
      g.fillStyle = '#3B2A20'; g.fillRect(0, H * .16, W, 14);
      g.fillStyle = 'rgba(160, 80, 30, .5)'; for (let x = 0; x < W; x += rand(30, 90)) g.fillRect(x, H * .16, rand(6, 30), 14);
      g.fillStyle = 'rgba(0, 0, 0, .5)'; g.fillRect(0, H * .16 + 12, W, 3);
    });
    dust = Array.from({ length: 50 }, () => ({ x: rand(0, W), y: rand(0, H), vx: rand(-6, 6), vy: rand(-4, 4), r: rand(.6, 1.8) }));
  }

  build();
  return {
    resize: build,
    draw(t, dt) {
      const g = env.ctx;
      const { W, H } = env;
      blit(env, scene);
      // ampoule qui se balance et grésille
      if (dt) {
        if (Math.random() < .035) target = Math.random() < .5 ? rand(.05, .4) : 1;
        else if (Math.random() < .08) target = 1;
        flick += (target - flick) * Math.min(1, dt * 25);
      }
      const bx = W * .5 + Math.sin(t * .8) * 18, by = H * .14 + Math.cos(t * .8) * 2;
      g.strokeStyle = '#0A0806'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(W * .5, 0); g.lineTo(bx, by - 12); g.stroke();
      // obscurité autour du halo
      const R = Math.max(W, H) * (.5 + .25 * flick);
      const dark = g.createRadialGradient(bx, by, 20, bx, by, R);
      dark.addColorStop(0, `rgba(255, 200, 120, ${.16 * flick})`);
      dark.addColorStop(.35, 'rgba(0, 0, 0, .25)');
      dark.addColorStop(1, `rgba(0, 0, 0, ${.92 - .2 * flick})`);
      g.fillStyle = dark; g.fillRect(0, 0, W, H);
      g.fillStyle = `rgba(255, ${200 + 40 * flick | 0}, 140, ${.35 + .65 * flick})`;
      g.shadowColor = 'rgba(255, 210, 140, .9)'; g.shadowBlur = 30 * flick;
      g.beginPath(); g.ellipse(bx, by, 9, 12, 0, 0, Math.PI * 2); g.fill();
      g.shadowBlur = 0;
      g.fillStyle = '#2A241E'; g.fillRect(bx - 5, by - 20, 10, 9);
      // poussière dans la lumière
      dust.forEach((d) => {
        if (dt) { d.x += (d.vx + Math.sin(t + d.y) * 3) * dt; d.y += d.vy * dt; if (d.x < 0) d.x = W; if (d.x > W) d.x = 0; if (d.y < 0) d.y = H; if (d.y > H) d.y = 0; }
        const near = Math.max(0, 1 - Math.hypot(d.x - bx, d.y - by) / (H * .6));
        g.fillStyle = `rgba(255, 230, 190, ${near * .6 * flick})`;
        g.fillRect(d.x, d.y, d.r, d.r);
      });
      // gouttes qui tombent du tuyau
      if (dt && Math.random() < .012) drips.push({ x: rand(0, W), y: H * .16 + 16, vy: 0 });
      drips = drips.filter((d) => d.y < H);
      drips.forEach((d) => { if (dt) { d.vy += 600 * dt; d.y += d.vy * dt; } g.fillStyle = 'rgba(170, 190, 200, .55)'; g.fillRect(d.x, d.y, 2, 6); });
    },
  };
}

/* ===================================================================== David */
function starOfDavid(g, cx, cy, R, lw, color) {
  g.strokeStyle = color; g.lineWidth = lw; g.lineJoin = 'miter';
  [0, Math.PI].forEach((rot) => {
    g.beginPath();
    for (let i = 0; i < 3; i++) {
      const a = rot - Math.PI / 2 + i * (Math.PI * 2 / 3);
      const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
      if (!i) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath(); g.stroke();
  });
}

export function david(env) {
  let flag = null;
  let FW = 0, FH = 0;
  const A = 16;   // amplitude des vagues (px)
  function build() {
    FW = env.W + 80; FH = env.H + A * 4;
    flag = document.createElement('canvas');
    flag.width = Math.round(FW * env.DPR); flag.height = Math.round(FH * env.DPR);
    const g = flag.getContext('2d');
    g.setTransform(env.DPR, 0, 0, env.DPR, 0, 0);
    g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, FW, FH);
    const blue = '#0038B8';
    g.fillStyle = blue;
    g.fillRect(0, FH * (15 / 160), FW, FH * (25 / 160));
    g.fillRect(0, FH * (1 - 40 / 160), FW, FH * (25 / 160));
    starOfDavid(g, FW / 2, FH / 2, FH * .2, FH * .032, blue);
  }
  build();
  return {
    resize: build,
    draw(t, dt) {
      const g = env.ctx;
      const { W, H } = env;
      g.fillStyle = '#F4F7FD'; g.fillRect(0, 0, W, H);
      const step = 6;
      const k = (Math.PI * 2) / (W * .55);
      const tt = dt ? t * 1.7 : 0;
      for (let x = 0; x < W + step; x += step) {
        const ph = x * k - tt;
        const amp = A * (.35 + .65 * (x / W));          // ça bat plus fort vers le bout du drapeau
        const dy = Math.sin(ph) * amp + Math.sin(ph * 2.3 + 1) * amp * .25;
        g.drawImage(flag, (x + 40) * env.DPR, 0, step * env.DPR, flag.height, x, -A * 2 + dy, step + .6, FH);
        // ombre et lumière des plis
        const shade = Math.cos(ph) * (amp / A);
        g.fillStyle = shade > 0 ? `rgba(255, 255, 255, ${shade * .16})` : `rgba(0, 20, 70, ${-shade * .14})`;
        g.fillRect(x, 0, step + .6, H);
      }
      g.fillStyle = 'rgba(244, 247, 253, .18)'; g.fillRect(0, 0, W, H);
    },
  };
}

/* ==================================================================== Bazaar */
const SIGNS = ['سوق', 'توابل', 'قهوة', 'شاي', 'صيدلية', 'حلويات', 'عطور', 'سجاد'];

export function bazaar(env) {
  let scene = null;
  let lanterns = [];
  let motes = [];

  function build() {
    const { W, H } = env;
    scene = layer(env, (g) => {
      // mur de grès : assises de pierre
      const wall = g.createLinearGradient(0, 0, 0, H);
      wall.addColorStop(0, '#E9C98F'); wall.addColorStop(1, '#D9B074');
      g.fillStyle = wall; g.fillRect(0, 0, W, H);
      g.strokeStyle = 'rgba(120, 80, 40, .18)'; g.lineWidth = 1;
      for (let y = 0, row = 0; y < H; y += 38, row++) {
        g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
        for (let x = (row % 2) * 45; x < W; x += 90) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 38); g.stroke(); }
      }
      for (let i = 0; i < W * H / 500; i++) { g.fillStyle = `rgba(${pick(['120, 80, 40', '255, 240, 210'])}, ${rand(.05, .18)})`; g.fillRect(rand(0, W), rand(0, H), rand(1, 2.5), rand(1, 2.5)); }
      // frise de zellige
      const fy = H * .64, fh = 30;
      g.fillStyle = '#F6EAD2'; g.fillRect(0, fy, W, fh);
      for (let x = 0; x < W; x += fh) {
        const cx = x + fh / 2, cy = fy + fh / 2;
        g.fillStyle = pick(['#1D7A80', '#24498F', '#1D7A80', '#B5452B']);
        g.beginPath();
        for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, r = i % 2 ? fh * .22 : fh * .45; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
        g.closePath(); g.fill();
        g.fillStyle = '#D9A23A'; g.beginPath(); g.arc(cx, cy, fh * .1, 0, Math.PI * 2); g.fill();
      }
      g.fillStyle = '#6A4524'; g.fillRect(0, fy - 3, W, 3); g.fillRect(0, fy + fh, W, 3);
      // arcades en fer à cheval, claveaux rouges et crème
      const aw = Math.max(150, Math.min(220, W / 6)), top = H * .8;
      g.save(); g.globalAlpha = .62;   // arcades estompées : le texte reste lisible par-dessus
      const n = Math.ceil(W / aw) + 1;
      for (let i = 0; i < n; i++) {
        const cx = i * aw + aw / 2 - (n * aw - W) / 2, r = aw * .38;
        const inner = g.createLinearGradient(0, top - r, 0, H);
        inner.addColorStop(0, '#8A6440'); inner.addColorStop(1, '#6A4A2C');
        g.fillStyle = inner;
        g.beginPath(); g.moveTo(cx - r * .86, H); g.lineTo(cx - r * .86, top + r * .5);
        g.arc(cx, top, r, Math.PI * .67, Math.PI * 2.33); g.lineTo(cx + r * .86, H); g.closePath(); g.fill();
        // étals dans l'ombre : tapis, épices
        for (let k = 0; k < 3; k++) { g.fillStyle = pick(['#B5452B', '#7E3768', '#D9A23A', '#1D7A80']); g.globalAlpha = .7; g.fillRect(cx - r * .7 + k * r * .48, H - rand(50, 110), r * .4, 200); }
        g.globalAlpha = 1;
        for (let k = 0; k < 3; k++) {
          const px = cx - r * .5 + k * r * .5, py = H - 34;
          g.fillStyle = pick(['#C0582E', '#D9A23A', '#8C3220', '#E2B74E']);
          g.beginPath(); g.moveTo(px - 18, H); g.lineTo(px, py); g.lineTo(px + 18, H); g.fill();
        }
        // claveaux alternés
        const segs = 13;
        for (let s = 0; s < segs; s++) {
          const a0 = Math.PI * .67 + (s / segs) * Math.PI * 1.66, a1 = Math.PI * .67 + ((s + 1) / segs) * Math.PI * 1.66;
          g.fillStyle = s % 2 ? '#F3E3C3' : '#B5452B';
          g.beginPath(); g.arc(cx, top, r + 14, a0, a1); g.arc(cx, top, r, a1, a0, true); g.closePath(); g.fill();
        }
        // colonne
        g.fillStyle = '#CDA46A'; g.fillRect(cx + aw / 2 - 9, top - 10, 18, H);
        g.fillStyle = '#A88252'; g.fillRect(cx + aw / 2 - 13, top - 14, 26, 8);
        // enseigne en arabe
        if (i % 2 === 0) {
          const word = SIGNS[(i / 2) % SIGNS.length | 0];
          const sw = 92, sh = 34, sy = top - r - 58;
          g.fillStyle = '#6A4524'; g.fillRect(cx - sw / 2, sy, sw, sh);
          g.strokeStyle = '#D9A23A'; g.lineWidth = 2; g.strokeRect(cx - sw / 2 + 3, sy + 3, sw - 6, sh - 6);
          g.strokeStyle = '#3A2210'; g.lineWidth = 1.5;
          g.beginPath(); g.moveTo(cx - sw / 3, sy); g.lineTo(cx - sw / 3, sy - 14); g.moveTo(cx + sw / 3, sy); g.lineTo(cx + sw / 3, sy - 14); g.stroke();
          g.fillStyle = '#F6E3B4'; g.font = '700 20px "Geeza Pro", "Segoe UI", "Noto Naskh Arabic", "Arial", serif';
          g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
          g.fillText(word, cx, sy + sh / 2 + 1);
          g.direction = 'ltr';
        }
      }
      g.restore();
    });
    const nl = Math.max(3, Math.round(W / 320));
    lanterns = Array.from({ length: nl }, (_, i) => ({
      x: ((i + .5) / nl) * W, len: rand(.12, .26) * H, ph: rand(0, 6), col: pick(['255, 150, 60', '255, 90, 70', '80, 200, 190', '255, 200, 90']),
    }));
    motes = Array.from({ length: 40 }, () => ({ x: rand(0, W), y: rand(0, H), vx: rand(4, 14), vy: rand(-3, 3), r: rand(.6, 1.6) }));
  }

  function drawLantern(g, L, t) {
    const sw = Math.sin(t * .9 + L.ph) * .08;
    const ax = L.x, ay = 0;
    const x = ax + Math.sin(sw) * L.len, y = ay + Math.cos(sw) * L.len;
    g.strokeStyle = '#3A2210'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(ax, ay); g.lineTo(x, y - 26); g.stroke();
    const fl = .85 + Math.sin(t * 9 + L.ph) * .05 + Math.sin(t * 23 + L.ph) * .04;
    const glow = g.createRadialGradient(x, y, 4, x, y, 90);
    glow.addColorStop(0, `rgba(${L.col}, ${.45 * fl})`); glow.addColorStop(1, `rgba(${L.col}, 0)`);
    g.fillStyle = glow; g.fillRect(x - 90, y - 90, 180, 180);
    g.save(); g.translate(x, y); g.rotate(sw);
    g.fillStyle = '#8C6A2A';
    g.beginPath(); g.moveTo(-6, -30); g.lineTo(6, -30); g.lineTo(14, -18); g.lineTo(-14, -18); g.closePath(); g.fill();
    g.fillStyle = `rgba(${L.col}, ${.85 * fl})`;
    g.beginPath(); g.moveTo(-14, -18); g.lineTo(14, -18); g.lineTo(18, 4); g.lineTo(10, 20); g.lineTo(-10, 20); g.lineTo(-18, 4); g.closePath(); g.fill();
    g.strokeStyle = '#6A4A18'; g.lineWidth = 2;
    g.stroke();
    g.beginPath(); g.moveTo(0, -18); g.lineTo(0, 20); g.moveTo(-18, 4); g.lineTo(18, 4); g.stroke();
    g.fillStyle = '#8C6A2A'; g.beginPath(); g.moveTo(-10, 20); g.lineTo(10, 20); g.lineTo(0, 32); g.closePath(); g.fill();
    g.restore();
  }

  build();
  return {
    resize: build,
    draw(t, dt) {
      const g = env.ctx;
      blit(env, scene);
      lanterns.forEach((L) => drawLantern(g, L, dt ? t : 0));
      motes.forEach((m) => {
        if (dt) { m.x += m.vx * dt; m.y += (m.vy + Math.sin(t + m.x / 50) * 4) * dt; if (m.x > env.W) m.x = 0; if (m.y < 0) m.y = env.H; if (m.y > env.H) m.y = 0; }
        g.fillStyle = 'rgba(255, 240, 200, .5)'; g.fillRect(m.x, m.y, m.r, m.r);
      });
    },
  };
}
