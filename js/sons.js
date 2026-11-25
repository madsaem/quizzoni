// Packs de sons des thèmes ajoutés le 25/11/2026 (synthétisés, aucun fichier).
// Mêmes noms que dans audio.js : click, select, pop, place, correct, partial, wrong,
// tick, timeup, streak(n), finish(pct), whoosh.
import { synth, addPacks } from './audio.js';

const { tone, noise, pluck, bell, semis } = synth;

const D4 = 293.66;   // ré : base de la gamme orientale (hijaz / freygish : 1, b2, 3, 4, 5, b6, b7)
const hz = (base, steps) => steps.map((n) => semis(base, n));

/** Clavecin : corde pincée brillante. */
const harpsi = ({ f, t = 0, g = .06, dur = .45 }) => {
  tone({ f, type: 'sawtooth', t, dur, g, a: .002 });
  tone({ f: f * 2, type: 'square', t, dur: dur * .3, g: g * .35, a: .002 });
};
/** Oud : corde grave, attaque nette, vite éteinte. */
const oud = ({ f, t = 0, g = .12, dur = .5 }) => {
  tone({ f, type: 'triangle', t, dur, g, a: .003 });
  tone({ f: f * 2.01, type: 'sawtooth', t, dur: dur * .25, g: g * .18, a: .002 });
};
const dum = (t = 0, g = .35) => tone({ f: 95, f2: 58, type: 'sine', t, dur: .28, g });
const tek = (t = 0, g = .1) => noise({ f: 3800, t, dur: .05, g, type: 'highpass', q: .6 });
/** Tintement de pièce : partiels inharmoniques. */
const coin = (t = 0, g = .05, f = 3520) => { tone({ f, type: 'sine', t, dur: .22, g, a: .001 }); tone({ f: f * 1.414, type: 'sine', t, dur: .16, g: g * .7, a: .001 }); tone({ f: f * 2.21, type: 'sine', t, dur: .08, g: g * .4, a: .001 }); };
/** Coup sur une plaque de métal. */
const clank = (t = 0, g = .05, f = 330) => { [1, 2.76, 5.4, 8.93].forEach((m, i) => tone({ f: f * m, type: 'sine', t, dur: .5 / (i + 1), g: g / (i + 1), a: .001 })); noise({ f: 2500, t, dur: .04, g: g * 1.5, q: 1.2 }); };

addPacks({
  // Automne : bois, feuilles qui craquent, marimba chaleureux
  automne: {
    click: () => { pluck({ f: 660, dur: .16, g: .1 }); noise({ f: 4200, dur: .035, g: .025, type: 'highpass' }); },
    select: () => { pluck({ f: 523.25, dur: .2, g: .12 }); pluck({ f: 783.99, t: .06, dur: .25, g: .1 }); },
    pop: () => tone({ f: 520, f2: 280, type: 'sine', dur: .09, g: .16 }),
    place: () => { pluck({ f: 392, dur: .22, g: .14 }); noise({ f: 3000, dur: .06, g: .03, type: 'highpass' }); },
    correct: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => pluck({ f, t: i * .07, dur: .5, g: .14 })),
    partial: () => [523.25, 659.25].forEach((f, i) => pluck({ f, t: i * .08, dur: .4, g: .13 })),
    wrong: () => { tone({ f: 196, f2: 160, type: 'triangle', dur: .35, g: .14 }); noise({ f: 900, dur: .3, g: .05, type: 'lowpass' }); },
    tick: () => noise({ f: 5000, dur: .02, g: .05, type: 'highpass' }),
    timeup: () => { pluck({ f: 196, dur: .3, g: .2 }); pluck({ f: 164.81, t: .22, dur: .4, g: .2 }); },
    streak: (n = 2) => { const b = semis(523.25, Math.min(n, 8)); [0, 4, 7].forEach((s, i) => pluck({ f: semis(b, s), t: i * .05, dur: .3, g: .1 })); },
    finish: (pct = 1) => {
      (pct >= .5 ? [392, 523.25, 659.25, 783.99, 1046.5] : [440, 392, 329.63]).forEach((f, i) => pluck({ f, t: i * .1, dur: .7, g: .14 }));
      noise({ f: 600, f2: 2600, t: .1, dur: .9, g: .04, q: .5 });
    },
    whoosh: () => noise({ f: 500, f2: 2400, dur: .55, g: .05, q: .4 }),
  },

  // Scarlet : clavecin, horloge, couteaux d'argent, orgue sombre
  scarlet: {
    click: () => harpsi({ f: 1318.5, g: .025, dur: .2 }),
    select: () => { noise({ f: 6500, f2: 9500, dur: .22, g: .05, type: 'highpass', q: .4 }); tone({ f: 2637, type: 'sine', dur: .25, g: .03 }); },
    pop: () => harpsi({ f: 880, g: .035, dur: .25 }),
    place: () => { harpsi({ f: 587.33, g: .04, dur: .3 }); tone({ f: 3136, type: 'sine', dur: .08, g: .02 }); },
    correct: () => [587.33, 698.46, 880, 1174.66, 1396.91].forEach((f, i) => harpsi({ f, t: i * .055, g: .04, dur: .5 })),
    partial: () => [587.33, 880].forEach((f, i) => harpsi({ f, t: i * .07, g: .04 })),
    wrong: () => { tone({ f: 110, type: 'sawtooth', dur: .6, g: .05 }); tone({ f: 116.54, type: 'sawtooth', dur: .6, g: .045 }); tone({ f: 164.81, type: 'triangle', dur: .6, g: .06 }); },
    tick: () => { noise({ f: 2600, dur: .015, g: .07, q: 3 }); tone({ f: 1900, type: 'square', dur: .008, g: .02 }); },
    timeup: () => { bell({ f: 196, dur: 1.4, g: .2 }); bell({ f: 233.08, t: .02, dur: 1.2, g: .08 }); },
    streak: (n = 2) => { const b = semis(880, Math.min(n, 8)); [0, 3, 7, 12].forEach((s, i) => harpsi({ f: semis(b, s), t: i * .04, g: .03, dur: .3 })); },
    finish: (pct = 1) => {
      const notes = pct >= .5 ? [587.33, 739.99, 880, 1174.66, 1479.98, 1760] : [880, 698.46, 587.33, 554.37, 440];
      notes.forEach((f, i) => harpsi({ f, t: i * .09, g: .045, dur: .6 }));
      bell({ f: pct >= .5 ? 293.66 : 220, t: notes.length * .09, dur: 1.4, g: .14 });
    },
    whoosh: () => { noise({ f: 300, f2: 5200, dur: .35, g: .08, q: .5 }); tone({ f: 1200, f2: 300, type: 'sine', dur: .3, g: .04 }); },
  },

  // Gilded : pièces d'or, tiroir-caisse, velours
  gilded: {
    click: () => coin(0, .025, 4186),
    select: () => { coin(0, .045); coin(.06, .03, 4699); },
    pop: () => coin(0, .04, 3136),
    place: () => { tone({ f: 180, f2: 120, type: 'sine', dur: .1, g: .15 }); coin(.02, .03); },
    correct: () => { noise({ f: 1800, dur: .08, g: .06, q: .8 }); [2093, 2637, 3136, 4186].forEach((f, i) => coin(.06 + i * .05, .045, f)); },
    partial: () => [2093, 2637].forEach((f, i) => coin(i * .07, .045, f)),
    wrong: () => { tone({ f: 130, f2: 70, type: 'sine', dur: .3, g: .3 }); noise({ f: 400, dur: .25, g: .05, type: 'lowpass' }); },
    tick: () => coin(0, .015, 5274),
    timeup: () => { tone({ f: 220, f2: 110, type: 'triangle', dur: .6, g: .12 }); coin(.1, .03, 1760); },
    streak: (n = 2) => { for (let i = 0; i < Math.min(n, 8) + 2; i++) coin(i * .045, .035, rand(3000, 4800)); },
    finish: (pct = 1) => {
      const k = pct >= .5 ? 14 : 5;
      for (let i = 0; i < k; i++) coin(i * .07 + Math.random() * .03, .04, rand(2600, 5000));
      (pct >= .5 ? [523.25, 659.25, 783.99, 1046.5] : [440, 349.23]).forEach((f) => tone({ f, type: 'triangle', t: k * .07, dur: 1.2, g: .05 }));
    },
    whoosh: () => noise({ f: 2500, f2: 6000, dur: .4, g: .03, type: 'highpass', q: .3 }),
  },

  // Grunge : métal, gouttes, boîte à musique désaccordée
  grunge: {
    click: () => { tone({ f: 1800, type: 'square', dur: .01, g: .02 }); noise({ f: 4200, dur: .02, g: .05, q: 1.5 }); },
    select: () => clank(0, .05),
    pop: () => tone({ f: 900, f2: 1700, type: 'sine', dur: .06, g: .1 }),
    place: () => clank(0, .04, 220),
    correct: () => { [880, 1046.5, 1318.5, 1760].forEach((f, i) => bell({ f: f * (1 + (Math.random() - .5) * .012), t: i * .09, dur: .9, g: .06 })); tone({ f: 55, type: 'sine', dur: 1.2, g: .12 }); },
    partial: () => [880, 1046.5].forEach((f, i) => bell({ f, t: i * .1, dur: .7, g: .06 })),
    wrong: () => { noise({ f: 900, f2: 500, dur: .5, g: .1, q: 6 }); tone({ f: 82, type: 'sawtooth', dur: .5, g: .06 }); },
    tick: () => tone({ f: 1500, f2: 2200, type: 'sine', dur: .03, g: .05 }),
    timeup: () => { tone({ f: 140, f2: 70, type: 'sawtooth', dur: 1, g: .06 }); clank(.1, .06, 110); },
    streak: (n = 2) => { const b = semis(660, Math.min(n, 8)); [0, 3, 6].forEach((s, i) => bell({ f: semis(b, s), t: i * .07, dur: .4, g: .05 })); },
    finish: (pct = 1) => { clank(0, .08, pct >= .5 ? 196 : 98); (pct >= .5 ? [659.25, 830.61, 987.77] : [622.25, 587.33, 554.37]).forEach((f, i) => bell({ f, t: .3 + i * .15, dur: 1, g: .06 })); },
    whoosh: () => noise({ f: 200, f2: 900, dur: .8, g: .07, type: 'lowpass', q: 2 }),
  },

  // IFSI : stylo, gomme, sonnerie de l'école
  ifsi: {
    click: () => { noise({ f: 5200, dur: .015, g: .06, type: 'highpass' }); tone({ f: 2500, type: 'square', dur: .008, g: .02 }); },
    select: () => { noise({ f: 5200, dur: .015, g: .06, type: 'highpass' }); noise({ f: 4800, t: .07, dur: .015, g: .06, type: 'highpass' }); },
    pop: () => tone({ f: 700, f2: 1100, type: 'triangle', dur: .05, g: .08 }),
    place: () => noise({ f: 2400, dur: .09, g: .05, q: 2 }),
    correct: () => { noise({ f: 3000, f2: 4500, dur: .12, g: .05, q: 2 }); bell({ f: 1568, t: .1, dur: .7, g: .12 }); },
    partial: () => { noise({ f: 3000, dur: .1, g: .04, q: 2 }); bell({ f: 1174.66, t: .08, dur: .5, g: .1 }); },
    wrong: () => { for (let i = 0; i < 4; i++) noise({ f: 1500, t: i * .07, dur: .07, g: .06, q: 2 }); tone({ f: 233, type: 'square', t: .05, dur: .25, g: .04 }); },
    tick: () => noise({ f: 6000, dur: .012, g: .04, type: 'highpass' }),
    timeup: () => { for (let i = 0; i < 10; i++) tone({ f: i % 2 ? 1318.5 : 1046.5, type: 'square', t: i * .05, dur: .05, g: .03 }); },
    streak: (n = 2) => { const b = semis(1046.5, Math.min(n, 8)); bell({ f: b, dur: .4, g: .08 }); },
    finish: () => { for (let i = 0; i < 24; i++) tone({ f: i % 2 ? 1318.5 : 1046.5, type: 'square', t: i * .045, dur: .045, g: .025 }); bell({ f: 1568, t: 1.1, dur: .9, g: .1 }); },
    whoosh: () => noise({ f: 1200, f2: 5000, dur: .25, g: .05, type: 'highpass', q: .4 }),
  },

  // David : clarinette joyeuse en gamme orientale, tambourin
  david: {
    click: () => tone({ f: semis(D4, 24), type: 'triangle', dur: .05, g: .07 }),
    select: () => { noise({ f: 7000, dur: .12, g: .05, type: 'highpass' }); tone({ f: semis(D4, 19), type: 'triangle', dur: .1, g: .08 }); },
    pop: () => tone({ f: semis(D4, 16), f2: semis(D4, 24), type: 'triangle', dur: .07, g: .09 }),
    place: () => tone({ f: semis(D4, 12), type: 'triangle', dur: .1, g: .1 }),
    correct: () => { hz(semis(D4, 12), [0, 1, 4, 5, 7]).forEach((f, i) => tone({ f, type: 'triangle', t: i * .06, dur: .18, g: .1 })); noise({ f: 7000, t: .3, dur: .15, g: .05, type: 'highpass' }); },
    partial: () => hz(semis(D4, 12), [0, 4]).forEach((f, i) => tone({ f, type: 'triangle', t: i * .08, dur: .2, g: .1 })),
    wrong: () => hz(D4, [4, 1, 0]).forEach((f, i) => tone({ f, type: 'triangle', t: i * .12, dur: .2, g: .12 })),
    tick: () => noise({ f: 8000, dur: .03, g: .03, type: 'highpass' }),
    timeup: () => hz(D4, [7, 4, 1, 0]).forEach((f, i) => tone({ f, type: 'square', t: i * .1, dur: .12, g: .04 })),
    streak: (n = 2) => { const b = semis(D4, 12 + Math.min(n, 7)); [0, 4, 7].forEach((s, i) => tone({ f: semis(b, s), type: 'triangle', t: i * .05, dur: .12, g: .08 })); },
    finish: (pct = 1) => {
      const steps = pct >= .5 ? [0, 1, 4, 5, 7, 8, 10, 12, 7, 12] : [7, 5, 4, 1, 0];
      hz(semis(D4, 12), steps).forEach((f, i) => tone({ f, type: 'triangle', t: i * .08, dur: .16, g: .1 }));
      for (let i = 0; i < 6; i++) noise({ f: 7500, t: i * .14, dur: .08, g: .04, type: 'highpass' });
    },
    whoosh: () => noise({ f: 1500, f2: 6000, dur: .3, g: .04, type: 'highpass', q: .3 }),
  },

  // Bazaar : oud, darbouka, ney
  bazaar: {
    click: () => tek(0, .08),
    select: () => { dum(0, .25); oud({ f: semis(D4, 7), t: .02, g: .1, dur: .3 }); },
    pop: () => oud({ f: semis(D4, 12), g: .1, dur: .25 }),
    place: () => { tek(0, .08); oud({ f: D4, g: .1, dur: .3 }); },
    correct: () => { hz(D4, [0, 1, 4, 5, 7]).forEach((f, i) => oud({ f, t: i * .07, g: .12, dur: .4 })); tek(.36); tek(.44); },
    partial: () => hz(D4, [0, 4]).forEach((f, i) => oud({ f, t: i * .09, g: .12 })),
    wrong: () => { dum(0, .35); dum(.2, .3); hz(D4, [1, 0]).forEach((f, i) => oud({ f: f / 2, t: .05 + i * .18, g: .12, dur: .5 })); },
    tick: () => tek(0, .05),
    timeup: () => { dum(0, .35); tek(.15); dum(.3, .35); },
    streak: (n = 2) => { const b = semis(D4, Math.min(n, 7)); [0, 1, 4].forEach((s, i) => oud({ f: semis(b, s), t: i * .05, g: .1, dur: .25 })); },
    finish: (pct = 1) => {
      const steps = pct >= .5 ? [0, 1, 4, 5, 7, 8, 10, 12] : [7, 5, 4, 1, 0];
      hz(D4, steps).forEach((f, i) => oud({ f, t: i * .09, g: .12, dur: .45 }));
      [0, .18, .27, .45].forEach((t, i) => (i % 3 === 0 ? dum(t) : tek(t)));
    },
    whoosh: () => noise({ f: 700, f2: 1600, dur: .5, g: .05, q: 3 }),
  },
});

function rand(a, b) { return a + Math.random() * (b - a); }
