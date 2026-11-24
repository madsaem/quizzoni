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

  // Cap Corse : notes pincées façon marimba, ressac pour les transitions
  corse: {
    click: () => pluck({ f: 1175, dur: 0.08, g: 0.08 }),
    select: () => pluck({ f: 880, dur: 0.18, g: 0.14 }),
    pop: () => pluck({ f: 1318.5, dur: 0.1, g: 0.12 }),
    place: () => pluck({ f: 587.3, dur: 0.2, g: 0.16 }),
    correct: () => [587.3, 740, 880, 1174.7].forEach((f, i) => pluck({ f, t: i * 0.075, dur: 0.45, g: 0.17 })),
    partial: () => { pluck({ f: 740, dur: 0.3, g: 0.15 }); pluck({ f: 880, t: 0.1, dur: 0.35, g: 0.13 }); },
    wrong: () => { pluck({ f: 220, dur: 0.5, g: 0.22 }); pluck({ f: 207.7, t: 0.12, dur: 0.6, g: 0.2 }); },
    tick: () => pluck({ f: 1760, dur: 0.04, g: 0.05 }),
    timeup: () => { pluck({ f: 293.7, dur: 0.4, g: 0.2 }); pluck({ f: 220, t: 0.16, dur: 0.6, g: 0.2 }); },
    streak: (n = 2) => {
      const base = semis(587.3, Math.min(n, 10));
      [0, 4, 7, 12].forEach((s, i) => pluck({ f: semis(base, s), t: i * 0.05, dur: 0.25, g: 0.1 }));
    },
    finish: (pct = 1) => {
      const notes = pct >= 0.7 ? [587.3, 740, 880, 1174.7, 1480, 1760] : [440, 587.3, 740];
      notes.forEach((f, i) => pluck({ f, t: i * 0.1, dur: 0.6, g: 0.16 }));
    },
    whoosh: () => noise({ f: 250, f2: 1400, dur: 0.6, g: 0.045, type: 'lowpass', q: 0.4 }),
  },
};

export const sound = {
  /** À appeler lors d'un premier geste (clic, touche) pour autoriser le son. */
  unlock() { if (enabled) ensure(); },
  play(name, ...args) {
    if (!enabled) return;
    if (!ensure()) return;
    const fn = (PACKS[packName] || PACKS.officine)[name];
    try { fn?.(...args); } catch (e) { console.warn('Son impossible :', name, e); }
  },
  setEnabled(v) { enabled = !!v; },
  setVolume(v) {
    volume = v;
    if (master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.02);
  },
  setPack(name) { packName = PACKS[name] ? name : 'officine'; },
  get enabled() { return enabled; },
};
