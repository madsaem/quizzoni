// Musique d'ambiance des thèmes : boucle de menu, victoire, défaite.
// Chaque thème musical a un fichier assets/audio/<thème>/pistes.json :
//   - si un "fichier" y est indiqué, il est joué (mp3, ogg, m4a, wav) ;
//   - sinon, une musique originale est synthétisée par le navigateur.
// La rubrique "sons" du même fichier peut remplacer les bruitages (clic, bonne réponse…).
import { audioOut, sound } from './audio.js';

const MUSICAL = new Set(['warfare', 'grunge', 'scarlet', 'david', 'bazaar']);
const AMBIENT = new Set(['grunge']);   // bruit de fond : continue pendant les parties

let theme = null;
let manifest = null;
let wanted = null;        // 'menu' quand l'écran courant veut sa musique
let unlocked = false;
let musicOn = true;
let current = null;       // { kind, stop(fade) }
let bus = null;
let token = 0;

/* --------------------------------------------------------------- Outils */
function out() {
  const o = audioOut();
  if (!o) return null;
  if (!bus || bus.context !== o.ctx) {
    bus = o.ctx.createGain();
    bus.gain.value = 0.6;
    bus.connect(o.master);
  }
  return { ctx: o.ctx, bus };
}

const can = () => unlocked && musicOn && MUSICAL.has(theme) && manifest;
const note = (n) => 440 * Math.pow(2, (n - 69) / 12); // numéro MIDI → Hz

/** Une piste = un gain dédié ; l'arrêter = fondu puis déconnexion. */
function track(ctx, gain = 1) {
  const g = ctx.createGain();
  g.gain.value = 0.0001;
  g.connect(bus);
  g.gain.setTargetAtTime(gain, ctx.currentTime, 0.4);
  return g;
}

function stopCurrent(fade = 1) {
  if (!current) return;
  const c = current;
  current = null;
  try { c.stop(fade); } catch { /* déjà arrêtée */ }
}

/* ------------------------------------------------------------ Instruments */
function voice(ctx, dest, { f, t, dur, type = 'sawtooth', g = 0.05, a = 0.6, r = 1.2, cutoff = 1200, detune = 8, q = 0.6 }) {
  const end = t + dur;
  const filt = ctx.createBiquadFilter();
  filt.type = 'lowpass'; filt.frequency.value = cutoff; filt.Q.value = q;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(g, t + a);
  env.gain.setValueAtTime(g, end);
  env.gain.exponentialRampToValueAtTime(0.0001, end + r);
  filt.connect(env).connect(dest);
  [-detune, detune].forEach((d) => {
    const o = ctx.createOscillator();
    o.type = type; o.frequency.value = f; o.detune.value = d;
    o.connect(filt); o.start(t); o.stop(end + r + 0.1);
  });
  return filt;
}

/** Cuivres : le filtre s'ouvre à l'attaque. */
function brass(ctx, dest, { f, t, dur, g = 0.06 }) {
  const filt = voice(ctx, dest, { f, t, dur, g, a: 0.12, r: 0.9, cutoff: 500, detune: 6, q: 1.2 });
  filt.frequency.setValueAtTime(400, t);
  filt.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
  filt.frequency.exponentialRampToValueAtTime(1300, t + 0.9);
}

/** Grosse percussion grave (tambour, timbale). */
function boom(ctx, dest, { t, g = 0.5, f = 95 }) {
  const o = ctx.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.5);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(g, t + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
  o.connect(env).connect(dest);
  o.start(t); o.stop(t + 1);
  // attaque : souffle filtré
  const len = Math.floor(ctx.sampleRate * 0.2);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const n = ctx.createBufferSource();
  n.buffer = buf;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260;
  const ng = ctx.createGain(); ng.gain.value = g * 0.5;
  n.connect(lp).connect(ng).connect(dest);
  n.start(t);
}

/** Cordes jouées court (ostinato). */
function stab(ctx, dest, { f, t, g = 0.025 }) {
  voice(ctx, dest, { f, t, dur: 0.07, g, a: 0.008, r: 0.14, cutoff: 2400, detune: 5 });
}

/* ------------------------------------------- Compositions (originales) */
// Ré mineur, 68 à la noire. 8 mesures : Rém, Sib, Fa, Do, Rém, Sib, Solm, La.
const CHORDS = [
  [50, 57, 62, 65], [46, 53, 58, 62], [41, 53, 57, 60], [48, 55, 60, 64],
  [50, 57, 62, 65], [46, 53, 58, 62], [43, 55, 58, 62], [45, 52, 57, 61],
];

function synthMenu(ctx, dest) {
  const beat = 60 / 68;
  const barLen = beat * 4;
  let bar = 0;
  let next = ctx.currentTime + 0.1;
  const timer = setInterval(schedule, 250);
  schedule();

  function schedule() {
    while (next < ctx.currentTime + 1.5) {
      const ch = CHORDS[bar % CHORDS.length];
      const cycle = Math.floor(bar / CHORDS.length);
      const t = next;
      // nappe de cordes
      ch.slice(1).forEach((n) => voice(ctx, dest, { f: note(n), t, dur: barLen - 0.4, g: 0.022, a: 1.1, r: 1.4, cutoff: 950 }));
      // basse tenue
      voice(ctx, dest, { f: note(ch[0] - 12), t, dur: barLen - 0.3, type: 'triangle', g: 0.09, a: 0.5, r: 1, cutoff: 400, detune: 3 });
      // battement de cœur : tambours graves
      boom(ctx, dest, { t, g: 0.28 });
      boom(ctx, dest, { t: t + beat * 2.5, g: 0.18 });
      // ostinato à partir du 2e passage, ou sur la 2e moitié
      if (cycle > 0 || bar % 8 >= 4) {
        const arp = [ch[1] + 12, ch[2] + 12, ch[3] + 12, ch[2] + 12];
        for (let i = 0; i < 8; i++) stab(ctx, dest, { f: note(arp[i % 4]), t: t + i * (beat / 2), g: 0.014 });
      }
      // un appel de cuivres toutes les 8 mesures
      if (bar % 8 === 6) brass(ctx, dest, { f: note(ch[2]), t: t + beat, dur: beat * 2.5, g: 0.03 });
      bar += 1;
      next += barLen;
    }
  }
  return () => clearInterval(timer);
}

function synthVictory(ctx, dest) {
  const t0 = ctx.currentTime + 0.05;
  const beat = 0.5;
  const seq = [
    { at: 0, ch: [50, 57, 62, 65], top: 69 },
    { at: 2, ch: [46, 53, 58, 62], top: 70 },
    { at: 4, ch: [48, 55, 60, 64], top: 72 },
    { at: 6, ch: [50, 57, 62, 66], top: 74, hold: 6 }, // Ré majeur : la lumière au bout
  ];
  seq.forEach(({ at, ch, top, hold = 2 }) => {
    const t = t0 + at * beat;
    const dur = hold * beat;
    ch.forEach((n) => brass(ctx, dest, { f: note(n), t, dur, g: 0.03 }));
    brass(ctx, dest, { f: note(top), t, dur, g: 0.045 });
    voice(ctx, dest, { f: note(ch[0] - 12), t, dur, type: 'triangle', g: 0.1, a: 0.05, r: 0.8, cutoff: 500 });
    boom(ctx, dest, { t, g: 0.45, f: 110 });
  });
  // roulement de timbales avant l'accord final
  for (let i = 0; i < 8; i++) boom(ctx, dest, { t: t0 + 5 * beat + i * 0.12, g: 0.08 + i * 0.03, f: 120 });
  boom(ctx, dest, { t: t0 + 6 * beat, g: 0.6, f: 80 });
  return 6.5;
}

function synthDefeat(ctx, dest) {
  const t0 = ctx.currentTime + 0.05;
  const b = 0.75;
  [[50, 57, 62], [46, 53, 58], [43, 50, 58], [45, 52, 57], [50, 57, 62]].forEach((ch, i) => {
    const t = t0 + i * 2 * b;
    ch.forEach((n) => voice(ctx, dest, { f: note(n), t, dur: 2 * b, g: 0.025, a: 0.7, r: 1.6, cutoff: 800 }));
    voice(ctx, dest, { f: note(ch[0] - 12), t, dur: 2 * b, type: 'triangle', g: 0.08, a: 0.4, r: 1.4, cutoff: 350, detune: 2 });
  });
  // la mélodie qui descend
  [[77, 0, 1.5], [76, 1.5, 0.5], [74, 2, 2], [73, 4, 1.5], [74, 5.5, 3]].forEach(([n, at, len]) => {
    const t = t0 + at * b;
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.value = note(n);
    const vib = ctx.createOscillator(); vib.frequency.value = 5;
    const vg = ctx.createGain(); vg.gain.value = 4;
    vib.connect(vg).connect(o.detune);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.06, t + 0.25);
    env.gain.setValueAtTime(0.06, t + len * b - 0.1);
    env.gain.exponentialRampToValueAtTime(0.0001, t + len * b + 0.5);
    o.connect(env).connect(dest);
    o.start(t); vib.start(t);
    o.stop(t + len * b + 0.6); vib.stop(t + len * b + 0.6);
  });
  boom(ctx, dest, { t: t0, g: 0.35, f: 70 });
  boom(ctx, dest, { t: t0 + 6 * b, g: 0.25, f: 65 });
  return 9;
}

/** Grunge : bruit de fond inquiétant. Grondement grave qui respire, vent dans les tuyaux,
    et de temps en temps un grincement, un choc lointain ou une goutte qui résonne. */
function synthDrone(ctx, dest) {
  const nodes = [];
  const t0 = ctx.currentTime;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.value = 220; lp.Q.value = 4;
  const lfo = ctx.createOscillator(); lfo.frequency.value = .07;
  const lfoG = ctx.createGain(); lfoG.gain.value = 120;
  lfo.connect(lfoG).connect(lp.frequency);
  const g = ctx.createGain(); g.gain.value = .5;
  lp.connect(g).connect(dest);
  [36.7, 37.3, 55.1].forEach((f) => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.connect(lp); o.start(t0); nodes.push(o); });
  // vent : bruit filtré dont le volume ondule
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const wind = ctx.createBufferSource(); wind.buffer = buf; wind.loop = true;
  const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 420; bp.Q.value = 1.4;
  const wg = ctx.createGain(); wg.gain.value = .05;
  const wl = ctx.createOscillator(); wl.frequency.value = .11;
  const wlg = ctx.createGain(); wlg.gain.value = .04;
  wl.connect(wlg).connect(wg.gain);
  wind.connect(bp).connect(wg).connect(dest);
  wind.start(t0); lfo.start(t0); wl.start(t0);
  nodes.push(wind, lfo, wl);
  // évènements isolés
  const events = [
    (t) => { // grincement de métal
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(300, t); o.frequency.linearRampToValueAtTime(420, t + .5); o.frequency.linearRampToValueAtTime(260, t + 1.2);
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 18;
      const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(.05, t + .2); e.gain.exponentialRampToValueAtTime(.0001, t + 1.3);
      o.connect(f).connect(e).connect(dest); o.start(t); o.stop(t + 1.4);
    },
    (t) => boom(ctx, dest, { t, g: .25, f: 48 }),          // choc lointain
    (t) => { // goutte qui résonne
      [0, .28, .56].forEach((dt, i) => {
        const o = ctx.createOscillator(); o.frequency.setValueAtTime(1500, t + dt); o.frequency.exponentialRampToValueAtTime(900, t + dt + .12);
        const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t + dt); e.gain.exponentialRampToValueAtTime(.05 / (i + 1), t + dt + .005); e.gain.exponentialRampToValueAtTime(.0001, t + dt + .25);
        o.connect(e).connect(dest); o.start(t + dt); o.stop(t + dt + .3);
      });
    },
  ];
  const timer = setInterval(() => { if (Math.random() < .35) events[(Math.random() * events.length) | 0](ctx.currentTime + .05); }, 2500);
  return () => { clearInterval(timer); nodes.forEach((n) => { try { n.stop(ctx.currentTime + 2); } catch { /* déjà arrêté */ } }); };
}

/** Bazaar : air original en mode hijaz (ré), oud, darbouka (rythme maqsum), bourdon et ney. */
function synthSouk(ctx, dest) {
  const beat = 60 / 96;
  const bar = beat * 4;
  const scale = [0, 1, 4, 5, 7, 8, 10, 12, 13, 16];
  const D = 146.83;
  // 8 mesures, 8 croches chacune : degrés de la gamme (null = silence)
  const MELODY = [
    [4, null, 3, 2, 1, null, 0, null], [1, 2, 3, null, 4, 3, 2, null],
    [4, 5, 6, null, 5, 4, 3, 2], [1, null, 0, null, null, null, null, null],
    [7, null, 6, 5, 4, null, 5, 6], [7, 8, 7, null, 6, 5, 4, null],
    [3, 4, 5, 4, 3, 2, 1, null], [0, null, null, null, null, null, null, null],
  ];
  const pluckNote = (f, t, g = .07) => {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.setValueAtTime(2600, t); filt.frequency.exponentialRampToValueAtTime(500, t + .35);
    const e = ctx.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(g, t + .004); e.gain.exponentialRampToValueAtTime(.0001, t + .6);
    o.connect(filt).connect(e).connect(dest); o.start(t); o.stop(t + .65);
  };
  const drum = (t, low) => {
    if (low) { boom(ctx, dest, { t, g: .22, f: 92 }); return; }
    const len = Math.floor(ctx.sampleRate * .06);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
    const n = ctx.createBufferSource(); n.buffer = buf;
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 3000;
    const g = ctx.createGain(); g.gain.value = .16;
    n.connect(hp).connect(g).connect(dest); n.start(t);
  };
  let i = 0;
  let next = ctx.currentTime + .15;
  // bourdon tenu sur ré (arrêté avec la musique)
  const dg = ctx.createGain();
  dg.gain.setValueAtTime(.0001, next); dg.gain.exponentialRampToValueAtTime(.035, next + 2);
  dg.connect(dest);
  const drones = [D / 2, D / 2 * 1.003, D * .75].map((f) => { const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.connect(dg); o.start(next); return o; });
  const timer = setInterval(schedule, 200);
  schedule();
  function schedule() {
    while (next < ctx.currentTime + 1.2) {
      const m = MELODY[i % MELODY.length];
      const t = next;
      // maqsum : DUM tek . tek DUM . tek .
      [[0, 1], [1, 0], [3, 0], [4, 1], [6, 0]].forEach(([k, low]) => drum(t + k * beat / 2, low));
      m.forEach((deg, k) => { if (deg != null) pluckNote(D * 2 * Math.pow(2, scale[deg] / 12), t + k * beat / 2, .06); });
      // ney : une longue note toutes les 4 mesures
      if (i % 4 === 2) voice(ctx, dest, { f: D * 4 * Math.pow(2, scale[4] / 12), t: t + beat, dur: bar * 1.2, type: 'sine', g: .025, a: .5, r: 1.2, cutoff: 3000, detune: 6 });
      i += 1;
      next += bar;
    }
  }
  return () => { clearInterval(timer); drones.forEach((o) => o.stop(ctx.currentTime + 2)); };
}

const SYNTH = {
  warfare: { menu: synthMenu, win: synthVictory, lose: synthDefeat },
  grunge: { menu: synthDrone },
  bazaar: { menu: synthSouk },
};

/* -------------------------------------------------- Lecture de fichiers */
function playFile(ctx, spec, { loop = false, onEnd } = {}) {
  const el = new Audio();
  el.src = spec.url;
  el.loop = loop;
  el.preload = 'auto';
  const g = track(ctx, spec.volume ?? 0.8);
  const src = ctx.createMediaElementSource(el);
  src.connect(g);
  const start = () => {
    if (spec.debut) el.currentTime = spec.debut;
    el.play().catch(() => { /* lecture refusée */ });
  };
  if (el.readyState >= 1) start(); else el.addEventListener('loadedmetadata', start, { once: true });
  let endTimer = 0;
  if (spec.duree) endTimer = setTimeout(() => stop(2), spec.duree * 1000);
  el.addEventListener('ended', () => onEnd?.());
  function stop(fade = 1) {
    clearTimeout(endTimer);
    g.gain.setTargetAtTime(0.0001, ctx.currentTime, Math.max(0.05, fade / 4));
    setTimeout(() => { el.pause(); src.disconnect(); g.disconnect(); if (spec.duree) onEnd?.(); }, fade * 1000 + 100);
  }
  return stop;
}

function fileSpec(entry) {
  if (!entry || !entry.fichier) return null;
  return { url: `assets/audio/${theme}/${entry.fichier}`, volume: entry.volume, debut: entry.debut || 0, duree: entry.duree || 0 };
}

/* --------------------------------------------------------- Lecteurs */
function startMenu() {
  const o = out();
  if (!o) return null;
  const spec = fileSpec(manifest.menu);
  if (spec) return { kind: 'menu', stop: playFile(o.ctx, spec, { loop: true }) };
  const make = SYNTH[theme]?.menu;
  if (!make) return null;
  const g = track(o.ctx, 1);
  const stopSched = make(o.ctx, g);
  return {
    kind: 'menu',
    stop(fade = 1) {
      stopSched();
      g.gain.setTargetAtTime(0.0001, o.ctx.currentTime, Math.max(0.05, fade / 4));
      setTimeout(() => g.disconnect(), fade * 1000 + 3000);
    },
  };
}

/** Ce thème a-t-il une musique de fin de partie (fichier ou synthèse) ? */
function hasOutcome(win) {
  const entry = win ? manifest?.victoire : manifest?.defaite;
  return !!(entry?.fichier || (win ? SYNTH[theme]?.win : SYNTH[theme]?.lose));
}

function startOutcome(win) {
  const o = out();
  if (!o) return null;
  const my = ++token;
  const back = () => { if (my === token && current?.kind === 'outcome') { current = null; wanted = 'menu'; music.menu(); } };
  const spec = fileSpec(win ? manifest.victoire : manifest.defaite);
  if (spec) return { kind: 'outcome', stop: playFile(o.ctx, spec, { onEnd: () => setTimeout(back, 1500) }) };
  const fn = win ? SYNTH[theme]?.win : SYNTH[theme]?.lose;
  if (!fn) return null;
  const g = track(o.ctx, 1);
  g.gain.cancelScheduledValues(o.ctx.currentTime);
  g.gain.setValueAtTime(1, o.ctx.currentTime);
  const len = fn(o.ctx, g);
  const timer = setTimeout(back, (len + 2.5) * 1000);
  return {
    kind: 'outcome',
    stop(fade = 1) {
      clearTimeout(timer);
      g.gain.setTargetAtTime(0.0001, o.ctx.currentTime, Math.max(0.05, fade / 4));
      setTimeout(() => g.disconnect(), fade * 1000 + 2000);
    },
  };
}

async function loadManifest(id) {
  try {
    const res = await fetch(`assets/audio/${id}/pistes.json`, { cache: 'no-cache' });
    return res.ok ? await res.json() : {};
  } catch { return {}; }
}

async function loadSamples() {
  const map = manifest?.sons || {};
  const out2 = {};
  const forTheme = theme;
  await Promise.all(Object.entries(map).filter(([, f]) => f).map(async ([name, file]) => {
    try { out2[name] = await sound.decode(`assets/audio/${forTheme}/${file}`); } catch (e) { console.warn('Son introuvable :', file, e.message); }
  }));
  if (theme === forTheme) sound.setSamples(out2);
}

/* ------------------------------------------------------------ Interface */
export const music = {
  hasMusic(id = theme) { return MUSICAL.has(id); },
  /** 'menu', 'outcome' ou null : ce qui joue en ce moment */
  get playing() { return current?.kind || null; },

  async setTheme(id) {
    if (id === theme) return;
    theme = id;
    manifest = null;
    stopCurrent(0.6);
    if (!MUSICAL.has(id)) return;
    const m = await loadManifest(id);
    if (theme !== id) return;
    manifest = m;
    if (unlocked) loadSamples();
    if (wanted === 'menu') music.menu();
  },

  setEnabled({ music: m = musicOn } = {}) {
    musicOn = m;
    if (!can()) stopCurrent(0.5);
    else if (wanted === 'menu') music.menu();
  },

  /** Premier geste de l'utilisateur : la musique a le droit de démarrer. */
  unlock() {
    if (unlocked) return;
    unlocked = true;
    if (manifest) loadSamples();
    if (wanted === 'menu') music.menu();
  },

  /** Écrans de menu (accueil, notice) : boucle d'ambiance. */
  menu() {
    wanted = 'menu';
    if (!can() || current?.kind === 'menu') return;
    if (current?.kind === 'outcome') return; // on laisse finir la fanfare
    stopCurrent(1);
    current = startMenu();
  },

  /** Pendant une partie : silence. */
  quiet() {
    wanted = null;
    if (AMBIENT.has(theme) && current?.kind === 'menu') return;   // le bruit de fond continue
    stopCurrent(1.5);
  },

  /** Fin de partie : victoire ou défaite. Renvoie true si une musique est jouée. */
  outcome(win) {
    if (!can() || !hasOutcome(win)) return false;   // pas de musique de fin : on garde celle qui joue
    wanted = null;
    stopCurrent(0.3);
    current = startOutcome(win);
    return !!current;
  },

  /** Quitter l'écran des résultats : on coupe la fanfare et on reprend le menu. */
  leaveOutcome() {
    if (current?.kind === 'outcome') stopCurrent(1);
  },
};
