// Sauvegarde locale (dans le navigateur) : réglages, records, erreurs à revoir.
import { todayKey } from './utils.js';

const KEY = 'quizzoni:v1';

const DEFAULTS = {
  settings: {
    theme: 'officine',
    sound: true,
    volume: 0.7,
    reducedMotion: false,
    lastMode: 'entrainement',
  },
  progress: {},   // quizId → { best, bestPct, plays, lastPct, lastAt }
  mistakes: {},   // "quizId/qid" → { quizId, qid, count, at }
  stats: { answered: 0, correct: 0, bestStreak: 0, days: [] },
  prefs: {},      // quizId → { cats, level, count } : derniers choix sur la notice
};

let data = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return {
      settings: { ...DEFAULTS.settings, ...parsed.settings },
      progress: parsed.progress || {},
      mistakes: parsed.mistakes || {},
      stats: { ...DEFAULTS.stats, ...parsed.stats },
      prefs: parsed.prefs || {},
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* stockage plein ou privé */ }
  listeners.forEach((fn) => fn(data));
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* ------------------------------------------------------------- Réglages */
export function settings() { return data.settings; }
export function setSetting(key, value) {
  data.settings[key] = value;
  save();
}

/* ------------------------------------------- Choix mémorisés par quiz */
export function quizPrefs(quizId) { return data.prefs[quizId] || null; }
export function setQuizPrefs(quizId, prefs) {
  data.prefs[quizId] = prefs;
  save();
}

/* ----------------------------------------------------------- Progression */
export function progressFor(quizId) { return data.progress[quizId] || null; }

/** Enregistre une réponse : stats globales + banque d'erreurs. */
export function recordAnswer(quizId, qid, correct) {
  const k = `${quizId}/${qid}`;
  data.stats.answered += 1;
  if (correct) {
    data.stats.correct += 1;
    delete data.mistakes[k];
  } else {
    const prev = data.mistakes[k];
    data.mistakes[k] = { quizId, qid, count: (prev?.count || 0) + 1, at: Date.now() };
  }
  const today = todayKey();
  if (!data.stats.days.includes(today)) {
    data.stats.days.push(today);
    data.stats.days = data.stats.days.slice(-60);
  }
  save();
}

/** Fin de partie : met à jour le record d'un quiz. Renvoie true si nouveau record. */
export function recordSession({ quizId, points, pct, bestStreak }) {
  let isRecord = false;
  if (quizId) {
    const p = data.progress[quizId] || { best: 0, bestPct: 0, plays: 0 };
    isRecord = p.plays > 0 && (pct > p.bestPct || (pct === p.bestPct && points > p.best));
    p.plays += 1;
    p.best = Math.max(p.best, points);
    p.bestPct = Math.max(p.bestPct, pct);
    p.lastPct = pct;
    p.lastAt = Date.now();
    data.progress[quizId] = p;
  }
  data.stats.bestStreak = Math.max(data.stats.bestStreak, bestStreak || 0);
  save();
  return isRecord;
}

export function mistakes() { return Object.values(data.mistakes); }
export function stats() { return data.stats; }

/** Nombre de jours d'affilée avec au moins une réponse (aujourd'hui ou hier inclus). */
export function dayStreak() {
  const days = new Set(data.stats.days);
  const d = new Date();
  if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

export function resetProgress() {
  data = { ...structuredClone(DEFAULTS), settings: data.settings, prefs: data.prefs };
  save();
}
