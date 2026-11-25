// Sons synthétisés en direct (Web Audio) : aucun fichier audio à charger.
// Chaque thème a son « pack » : mêmes noms de sons, timbres différents.

let ctx = null;
let master = null;
let enabled = true;
let volume = 0.7;
let packName = 'officine';
let noiseBuffer = null;

function ensure() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    master.connect(comp).connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/* ------------------------------------------------------------ Générateurs */
function tone({ f, f2, type = 'sine', t = 0, dur = 0.15, a = 0.005, g = 0.2, detune = 0 }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(f, now);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, now + dur);
  o.detune.value = detune;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, now);
  gn.gain.exponentialRampToValueAtTime(g, now + a);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(gn).connect(master);
  o.start(now);
  o.stop(now + dur + 0.05);
}

function noise({ t = 0, dur = 0.25, g = 0.12, f = 1200, f2, q = 0.9, type = 'bandpass' }) {
  if (!noiseBuffer) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const filt = ctx.createBiquadFilter();
  filt.type = type;
  filt.Q.value = q;
  filt.frequency.setValueAtTime(f, now);
  if (f2) filt.frequency.exponentialRampToValueAtTime(f2, now + dur);
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(0.0001, now);
  gn.gain.exponentialRampToValueAtTime(g, now + dur * 0.3);
  gn.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(filt).connect(gn).connect(master);
  src.start(now);
  src.stop(now + dur + 0.05);
}

/** Note « percussive » façon marimba : fondamentale + partiel aigu bref. */
function pluck({ f, t = 0, dur = 0.45, g = 0.22 }) {
  tone({ f, t, dur, g, type: 'sine', a: 0.003 });
  tone({ f: f * 4, t, dur: 0.09, g: g * 0.3, type: 'sine', a: 0.002 });
  tone({ f: f * 10, t, dur: 0.025, g: g * 0.12, type: 'triangle', a: 0.001 });
}

/** Petite cloche douce : fondamentale + octave. */
function bell({ f, t = 0, dur = 0.6, g = 0.14 }) {
  tone({ f, t, dur, g, type: 'sine', a: 0.004 });
  tone({ f: f * 2, t, dur: dur * 0.5, g: g * 0.35, type: 'sine', a: 0.004 });
  tone({ f: f * 3.01, t, dur: dur * 0.25, g: g * 0.12, type: 'sine', a: 0.004 });
}

const semis = (base, n) => base * Math.pow(2, n / 12);

/* ------------------------------------------------------------------ Packs */
const PACKS = {
  // Officine : net, lumineux, un peu « arcade »
  officine: {
    click: () => { tone({ f: 880, type: 'square', dur: 0.035, g: 0.04 }); tone({ f: 1760, type: 'triangle', dur: 0.03, g: 0.05 }); },
    select: () => tone({ f: 620, f2: 940, type: 'triangle', dur: 0.09, g: 0.16 }),
    pop: () => tone({ f: 980, f2: 320, type: 'sine', dur: 0.07, g: 0.16 }),
    place: () => { tone({ f: 520, type: 'square', dur: 0.04, g: 0.05 }); tone({ f: 1040, type: 'sine', dur: 0.06, g: 0.1 }); },
    correct: () => {
      [1046.5, 1318.5, 1568].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.065, dur: 0.2, g: 0.16 }));
      tone({ f: 2093, type: 'sine', t: 0.2, dur: 0.35, g: 0.08 });
    },
    partial: () => { tone({ f: 784, type: 'triangle', dur: 0.12, g: 0.14 }); tone({ f: 880, type: 'triangle', t: 0.1, dur: 0.18, g: 0.12 }); },
    wrong: () => {
      tone({ f: 247, f2: 175, type: 'square', dur: 0.3, g: 0.07 });
      tone({ f: 233, f2: 165, type: 'square', dur: 0.3, g: 0.05, detune: 12 });
    },
    tick: () => tone({ f: 1500, type: 'square', dur: 0.025, g: 0.035 }),
    timeup: () => { tone({ f: 392, type: 'square', dur: 0.14, g: 0.07 }); tone({ f: 262, type: 'square', t: 0.15, dur: 0.3, g: 0.07 }); },
    streak: (n = 2) => {
      const base = semis(784, Math.min(n, 10));
      [0, 4, 7, 12].forEach((s, i) => tone({ f: semis(base, s), type: 'triangle', t: i * 0.045, dur: 0.12, g: 0.1 }));
    },
    finish: (pct = 1) => {
      if (pct >= 0.7) {
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.11, dur: 0.22, g: 0.15 }));
        [523.25, 659.25, 783.99, 1046.5].forEach((f) => tone({ f, type: 'triangle', t: 0.48, dur: 0.9, g: 0.08 }));
      } else {
        [392, 523.25, 659.25].forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.13, dur: 0.3, g: 0.13 }));
      }
    },
    whoosh: () => noise({ f: 500, f2: 2600, dur: 0.22, g: 0.05 }),
  },

  // Garde de nuit : doux, sinusoïdal, plus grave (on ne réveille pas le service)
  nuit: {
    click: () => tone({ f: 660, type: 'sine', dur: 0.05, g: 0.08 }),
    select: () => tone({ f: 520, f2: 700, type: 'sine', dur: 0.12, g: 0.14 }),
    pop: () => tone({ f: 700, f2: 260, type: 'sine', dur: 0.09, g: 0.14 }),
    place: () => tone({ f: 440, type: 'sine', dur: 0.08, g: 0.12 }),
    correct: () => [659.25, 830.6, 987.8].forEach((f, i) => bell({ f, t: i * 0.08, dur: 0.7, g: 0.12 })),
    partial: () => { bell({ f: 659.25, dur: 0.4, g: 0.1 }); bell({ f: 740, t: 0.1, dur: 0.5, g: 0.09 }); },
    wrong: () => { tone({ f: 220, f2: 160, type: 'sine', dur: 0.4, g: 0.2 }); tone({ f: 233, f2: 170, type: 'triangle', dur: 0.4, g: 0.05 }); },
    tick: () => tone({ f: 1000, type: 'sine', dur: 0.04, g: 0.05 }),
    timeup: () => { bell({ f: 330, dur: 0.5, g: 0.14 }); bell({ f: 247, t: 0.18, dur: 0.7, g: 0.14 }); },
    streak: (n = 2) => {
      const base = semis(659.25, Math.min(n, 10));
      [0, 7, 12].forEach((s, i) => bell({ f: semis(base, s), t: i * 0.06, dur: 0.4, g: 0.07 }));
    },
    finish: (pct = 1) => {
      const notes = pct >= 0.7 ? [523.25, 659.25, 783.99, 987.8, 1046.5] : [440, 523.25, 659.25];
      notes.forEach((f, i) => bell({ f, t: i * 0.14, dur: 1, g: 0.11 }));
    },
    whoosh: () => noise({ f: 300, f2: 900, dur: 0.3, g: 0.035, type: 'lowpass', q: 0.5 }),
  },

  // Contraste élevé : bips nets et bien distincts, sans fioriture
  contraste: {
    click: () => tone({ f: 1000, type: 'square', dur: 0.03, g: 0.05 }),
    select: () => { tone({ f: 880, type: 'square', dur: 0.05, g: 0.06 }); tone({ f: 1320, type: 'square', t: 0.06, dur: 0.06, g: 0.06 }); },
    pop: () => tone({ f: 1320, type: 'square', dur: 0.04, g: 0.05 }),
    place: () => tone({ f: 660, type: 'square', dur: 0.06, g: 0.06 }),
    correct: () => { tone({ f: 880, type: 'sine', dur: 0.12, g: 0.22 }); tone({ f: 1320, type: 'sine', t: 0.11, dur: 0.22, g: 0.22 }); },
    partial: () => { tone({ f: 880, type: 'sine', dur: 0.12, g: 0.2 }); tone({ f: 990, type: 'sine', t: 0.11, dur: 0.18, g: 0.18 }); },
    wrong: () => { tone({ f: 196, type: 'square', dur: 0.16, g: 0.08 }); tone({ f: 196, type: 'square', t: 0.2, dur: 0.22, g: 0.08 }); },
    tick: () => tone({ f: 1760, type: 'square', dur: 0.02, g: 0.04 }),
    timeup: () => { [0, 0.18, 0.36].forEach((t) => tone({ f: 440, type: 'square', t, dur: 0.12, g: 0.07 })); },
    streak: (n = 2) => { const base = semis(880, Math.min(n, 8)); [0, 0.07, 0.14].forEach((t, i) => tone({ f: semis(base, i * 5), type: 'sine', t, dur: 0.08, g: 0.14 })); },
    finish: (pct = 1) => {
      const notes = pct >= 0.7 ? [660, 880, 1320, 1760] : [660, 880, 990];
      notes.forEach((f, i) => tone({ f, type: 'sine', t: i * 0.12, dur: 0.25, g: 0.18 }));
    },
    whoosh: () => tone({ f: 600, f2: 1200, type: 'sine', dur: 0.08, g: 0.06 }),
  },

  // Nuit étoilée : clochettes, carillon, scintillements
  etoiles: {
    click: () => bell({ f: 1568, dur: 0.18, g: 0.05 }),
    select: () => { bell({ f: 1046.5, dur: 0.4, g: 0.09 }); bell({ f: 1568, t: 0.05, dur: 0.35, g: 0.05 }); },
    pop: () => bell({ f: 2093, dur: 0.2, g: 0.06 }),
    place: () => bell({ f: 784, dur: 0.35, g: 0.1 }),
    correct: () => {
      [1046.5, 1318.5, 1568, 2093].forEach((f, i) => bell({ f, t: i * 0.06, dur: 0.9, g: 0.09 }));
      [3136, 3520, 4186].forEach((f, i) => tone({ f, type: 'sine', t: 0.28 + i * 0.04, dur: 0.25, g: 0.025 }));
    },
    partial: () => { bell({ f: 1046.5, dur: 0.6, g: 0.09 }); bell({ f: 1174.7, t: 0.1, dur: 0.6, g: 0.08 }); },
    wrong: () => { bell({ f: 233, dur: 1.1, g: 0.16 }); bell({ f: 220, t: 0.04, dur: 1.2, g: 0.12 }); },
    tick: () => bell({ f: 2637, dur: 0.08, g: 0.04 }),
    timeup: () => { bell({ f: 392, dur: 0.8, g: 0.14 }); bell({ f: 293.7, t: 0.22, dur: 1, g: 0.14 }); },
    streak: (n = 2) => {
      const base = semis(1046.5, Math.min(n, 8));
      [0, 2, 4, 7, 9, 12].forEach((sm, i) => bell({ f: semis(base, sm), t: i * 0.035, dur: 0.35, g: 0.045 }));
    },
    finish: (pct = 1) => {
      const notes = pct >= 0.7 ? [523.25, 659.25, 783.99, 1046.5, 1318.5, 1568, 2093] : [440, 523.25, 659.25, 880];
      notes.forEach((f, i) => bell({ f, t: i * 0.11, dur: 1.4, g: 0.09 }));
    },
    whoosh: () => noise({ f: 2500, f2: 7000, dur: 0.35, g: 0.03, type: 'highpass', q: 0.3 }),
  },

  // Pinksoni : clochettes de cristal, scintillements aigus
  pinksoni: {
    click: () => bell({ f: 2093, dur: 0.12, g: 0.05 }),
    select: () => { bell({ f: 1568, dur: 0.25, g: 0.07 }); bell({ f: 2349.3, t: 0.05, dur: 0.3, g: 0.05 }); },
    pop: () => tone({ f: 900, f2: 1700, type: 'sine', dur: 0.08, g: 0.12 }),
    place: () => { pluck({ f: 1046.5, dur: 0.25, g: 0.12 }); bell({ f: 2093, t: 0.02, dur: 0.2, g: 0.03 }); },
    correct: () => [1046.5, 1318.5, 1568, 2093, 2637].forEach((f, i) => bell({ f, t: i * 0.055, dur: 0.7, g: 0.065 })),
    partial: () => [1046.5, 1318.5].forEach((f, i) => bell({ f, t: i * 0.08, dur: 0.5, g: 0.07 })),
    wrong: () => { tone({ f: 466.2, f2: 392, type: 'triangle', dur: 0.22, g: 0.12 }); tone({ f: 349.2, f2: 293.7, type: 'triangle', t: 0.15, dur: 0.38, g: 0.12 }); },
    tick: () => bell({ f: 3136, dur: 0.06, g: 0.03 }),
    timeup: () => { bell({ f: 587.3, dur: 0.6, g: 0.12 }); bell({ f: 440, t: 0.2, dur: 0.9, g: 0.12 }); },
    streak: (n = 2) => {
      const base = semis(1318.5, Math.min(n, 8));
      [0, 4, 7, 12].forEach((sm, i) => bell({ f: semis(base, sm), t: i * 0.04, dur: 0.4, g: 0.045 }));
    },
    finish: (pct = 1) => {
      const notes = pct >= 0.7 ? [1046.5, 1318.5, 1568, 2093, 2637, 3136] : [880, 1046.5, 1318.5];
      notes.forEach((f, i) => bell({ f, t: i * 0.1, dur: 1.3, g: 0.08 }));
    },
    whoosh: () => noise({ f: 1800, f2: 7000, dur: 0.32, g: 0.03, type: 'highpass', q: 0.4 }),
  },

  // Mayuff : bulles de chewing-gum qui éclatent, souffle de fumée
  mayuff: {
    click: () => tone({ f: 520, f2: 1150, type: 'sine', dur: 0.05, g: 0.14 }),
    select: () => { tone({ f: 480, f2: 1400, type: 'sine', dur: 0.08, g: 0.16 }); noise({ f: 3200, dur: 0.04, g: 0.05, type: 'highpass' }); },
    pop: () => tone({ f: 700, f2: 1800, type: 'sine', dur: 0.06, g: 0.15 }),
    place: () => tone({ f: 420, f2: 950, type: 'sine', dur: 0.07, g: 0.15 }),
    correct: () => {
      [0, 0.07, 0.14].forEach((t, i) => tone({ f: 600 + i * 220, f2: 1400 + i * 380, type: 'sine', t, dur: 0.07, g: 0.14 }));
      [784, 1046.5, 1318.5].forEach((f, i) => tone({ f, type: 'triangle', t: 0.2 + i * 0.07, dur: 0.3, g: 0.08 }));
    },
    partial: () => { tone({ f: 600, f2: 1400, type: 'sine', dur: 0.07, g: 0.14 }); tone({ f: 880, type: 'triangle', t: 0.1, dur: 0.25, g: 0.07 }); },
    wrong: () => { noise({ f: 1100, f2: 260, dur: 0.5, g: 0.1, type: 'lowpass', q: 0.5 }); tone({ f: 220, f2: 140, type: 'sawtooth', dur: 0.35, g: 0.06 }); },
    tick: () => tone({ f: 1300, f2: 1800, type: 'sine', dur: 0.03, g: 0.05 }),
    timeup: () => { tone({ f: 400, f2: 160, type: 'sine', dur: 0.5, g: 0.2 }); noise({ f: 900, f2: 200, t: 0.05, dur: 0.6, g: 0.07, type: 'lowpass' }); },
    streak: (n = 2) => {
      const base = semis(700, Math.min(n, 8));
      [0, 0.06, 0.12, 0.18].forEach((t, i) => tone({ f: semis(base, i * 3), f2: semis(base, i * 3 + 12), type: 'sine', t, dur: 0.06, g: 0.12 }));
    },
    finish: (pct = 1) => {
      const notes = pct >= 0.5 ? [523.25, 659.25, 783.99, 1046.5] : [440, 392, 329.6];
      notes.forEach((f, i) => tone({ f, type: 'triangle', t: i * 0.12, dur: 0.5, g: 0.1 }));
      noise({ f: 500, f2: 2400, t: notes.length * 0.12, dur: 0.7, g: 0.05, type: 'lowpass', q: 0.3 });
    },
    whoosh: () => noise({ f: 400, f2: 2400, dur: 0.6, g: 0.06, type: 'lowpass', q: 0.3 }),
  },

  // Warfare : menus militaires, clics métalliques, radio
  warfare: {
    // survol / navigation : petit « tik » numérique, sec et discret
    click: () => { noise({ f: 3800, dur: 0.018, g: 0.11, q: 1.5 }); tone({ f: 1600, type: 'sine', dur: 0.02, g: 0.035 }); },
    // validation : « tchk-boum » mécanique, coup grave, résonance métallique, courte queue sourde
    select: () => {
      noise({ f: 1800, dur: 0.035, g: 0.18, q: 1.1 });
      tone({ f: 130, f2: 52, type: 'sine', dur: 0.22, g: 0.38 });
      tone({ f: 1250, type: 'triangle', t: 0.008, dur: 0.09, g: 0.02 });
      tone({ f: 1985, type: 'triangle', t: 0.008, dur: 0.07, g: 0.014 });
      noise({ f: 380, t: 0.02, dur: 0.3, g: 0.05, type: 'lowpass', q: 0.5 });
    },
    pop: () => { noise({ f: 3800, dur: 0.03, g: 0.1, type: 'highpass' }); tone({ f: 1250, f2: 700, type: 'triangle', dur: 0.06, g: 0.08 }); },
    place: () => { noise({ f: 2600, dur: 0.04, g: 0.14, q: 2 }); tone({ f: 1760, type: 'square', dur: 0.025, g: 0.04 }); },
    correct: () => {
      // deux impacts secs, puis bip radio montant
      noise({ f: 4200, dur: 0.03, g: 0.22, type: 'highpass', q: 0.8 });
      noise({ f: 4200, t: 0.05, dur: 0.03, g: 0.18, type: 'highpass', q: 0.8 });
      tone({ f: 1320, type: 'square', t: 0.09, dur: 0.07, g: 0.05 });
      tone({ f: 1760, type: 'square', t: 0.17, dur: 0.11, g: 0.05 });
    },
    partial: () => { noise({ f: 4200, dur: 0.03, g: 0.2, type: 'highpass', q: 0.8 }); tone({ f: 1320, type: 'square', t: 0.06, dur: 0.1, g: 0.05 }); },
    wrong: () => {
      noise({ f: 1500, dur: 0.32, g: 0.12, q: 0.4 });
      tone({ f: 110, type: 'sawtooth', dur: 0.3, g: 0.07 });
      tone({ f: 104, type: 'sawtooth', dur: 0.3, g: 0.05 });
    },
    tick: () => { tone({ f: 2100, type: 'square', dur: 0.015, g: 0.035 }); noise({ f: 6000, dur: 0.015, g: 0.05, type: 'highpass' }); },
    timeup: () => { [0, 0.22].forEach((t) => { tone({ f: 880, type: 'square', t, dur: 0.1, g: 0.06 }); tone({ f: 660, type: 'square', t: t + 0.1, dur: 0.1, g: 0.06 }); }); },
    streak: (n = 2) => {
      const base = semis(880, Math.min(n, 8));
      [0, 0.08, 0.16].forEach((t, i) => tone({ f: semis(base, i * 7), type: 'square', t, dur: 0.06, g: 0.045 }));
      noise({ f: 4200, dur: 0.03, g: 0.15, type: 'highpass' });
    },
    finish: (pct = 1) => {
      const chord = pct >= 0.5 ? [146.8, 185, 220, 293.7] : [146.8, 174.6, 220];
      chord.forEach((f) => { tone({ f, type: 'sawtooth', dur: 1.6, a: 0.08, g: 0.05 }); tone({ f: f * 1.005, type: 'sawtooth', dur: 1.6, a: 0.08, g: 0.04 }); });
      tone({ f: 70, f2: 40, type: 'sine', dur: 0.8, g: 0.4 });
    },
    whoosh: () => { noise({ f: 300, f2: 3200, dur: 0.28, g: 0.07, q: 0.6 }); tone({ f: 90, f2: 50, type: 'sine', dur: 0.2, g: 0.2 }); },
  },
};

/** Pour js/sons.js : les briques de synthèse et l'ajout de packs. */
export const synth = { tone, noise, pluck, bell, semis };
export function addPacks(packs) { Object.assign(PACKS, packs); }

/* Sons enregistrés : un thème peut remplacer un son synthétisé par un fichier
   (voir assets/audio/<thème>/pistes.json, rubrique "sons"). */
let samples = {};
function playSample(buf) {
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(master);
  src.start();
}

/** Contexte audio et sortie principale (pour la musique). null si le son est coupé. */
export function audioOut() {
  if (!enabled || !ensure()) return null;
  return { ctx, master };
}

export const sound = {
  /** À appeler lors d'un premier geste (clic, touche) pour autoriser le son. */
  unlock() { if (enabled) ensure(); },
  play(name, ...args) {
    if (!enabled) return;
    if (!ensure()) return;
    if (samples[name]) { playSample(samples[name]); return; }
    const fn = (PACKS[packName] || PACKS.officine)[name];
    try { fn?.(...args); } catch (e) { console.warn('Son impossible :', name, e); }
  },
  setEnabled(v) { enabled = !!v; },
  setVolume(v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  },
  setPack(name) { packName = PACKS[name] ? name : 'officine'; samples = {}; },
  /** name → AudioBuffer, pour le thème en cours */
  setSamples(map) { samples = map || {}; },
  /** Décode un fichier audio (pour les sons et musiques des thèmes). */
  async decode(url) {
    if (!ensure()) return null;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url} : ${res.status}`);
    return ctx.decodeAudioData(await res.arrayBuffer());
  },
  get enabled() { return enabled; },
};
