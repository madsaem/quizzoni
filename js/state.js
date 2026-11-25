// Sauvegarde locale (dans le navigateur) : réglages, records, erreurs à revoir.
import { todayKey } from './utils.js';

const KEY = 'quizzoni:v1';

const DEFAULTS = {
  settings: {
    theme: 'officine',
    sound: true,
    music: true,
    volume: 0.7,
    reducedMotion: false,
    lastMode: 'entrainement',
  },
  progress: {},   // quizId → { best, bestPct, plays, lastPct, lastAt }
  mistakes: {},   // "quizId/qid" → { quizId, qid, count, at }
  stats: { answered: 0, correct: 0, bestStreak: 0, days: [] },
  prefs: {},      // quizId → { cats, level, count } : derniers choix sur la notice
  seen: {},       // quizId → true : boîte déjà ouverte (plus d'étiquette « Nouveau »)
  sync: { uid: null, dirty: false }, // compte lié à cet appareil, changements pas encore envoyés
};

let data = load();
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    // les questions qui changent de boîte gardent leur identifiant : les erreurs les suivent (data.findQuestion)
    return {
      settings: { ...DEFAULTS.settings, ...parsed.settings },
      progress: parsed.progress || {},
      mistakes: parsed.mistakes || {},
      stats: { ...DEFAULTS.stats, ...parsed.stats },
      prefs: parsed.prefs || {},
      seen: parsed.seen || {},
      sync: { ...DEFAULTS.sync, ...parsed.sync },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function write() {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* stockage plein ou privé */ }
}
function save() {
  if (data.sync.uid) data.sync.dirty = true;
  write();
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

/* -------------------------------------------- Boîtes déjà ouvertes */
export function isSeen(quizId) { return !!data.seen[quizId]; }
export function markSeen(quizId) {
  if (data.seen[quizId]) return;
  data.seen[quizId] = true;
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
    // la même question a pu être ratée quand elle était dans une autre boîte
    Object.keys(data.mistakes).forEach((key) => { if (data.mistakes[key].qid === qid) delete data.mistakes[key]; });
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
  data = { ...structuredClone(DEFAULTS), settings: data.settings, prefs: data.prefs, seen: data.seen, sync: data.sync };
  save();
}

/* ------------------------------------------------------ Compte (synchronisation)
   Ce qui part en ligne : records, erreurs à revoir, statistiques, boîtes ouvertes.
   Pas les réglages ni les choix de partie, propres à chaque appareil. */
export function progressSnapshot() {
  return { v: 1, progress: data.progress, mistakes: data.mistakes, stats: data.stats, seen: data.seen };
}
export function syncState() { return data.sync; }
/** Envoi réussi : plus rien en attente (sans prévenir les écouteurs, pour ne pas renvoyer). */
export function markSynced(uid) {
  data.sync = { uid, dirty: false };
  write();
}
export function unlinkAccount() {
  data.sync = { uid: null, dirty: false };
  write();
}

/**
 * Fusionne la progression du compte avec celle de l'appareil.
 *   première liaison de cet appareil au compte : on additionne tout (rien ne se perd) ;
 *   appareil déjà lié, sans changement en attente : le compte fait foi ;
 *   appareil déjà lié avec des changements pas encore envoyés : on garde le meilleur des deux.
 */
export function mergeProgress(remote, uid) {
  const r = remote && remote.v === 1 ? remote : null;
  const mode = data.sync.uid !== uid ? 'link' : data.sync.dirty ? 'both' : 'remote';
  if (r) {
    const max = (a, b) => Math.max(a || 0, b || 0);
    const progress = mode === 'remote' ? {} : { ...data.progress };
    Object.entries(r.progress || {}).forEach(([id, rp]) => {
      const lp = progress[id];
      progress[id] = !lp ? rp : {
        best: max(lp.best, rp.best),
        bestPct: max(lp.bestPct, rp.bestPct),
        plays: mode === 'link' ? (lp.plays || 0) + (rp.plays || 0) : max(lp.plays, rp.plays),
        lastPct: (rp.lastAt || 0) > (lp.lastAt || 0) ? rp.lastPct : lp.lastPct,
        lastAt: max(lp.lastAt, rp.lastAt),
      };
    });
    const mistakes = mode === 'remote' ? {} : { ...data.mistakes };
    Object.entries(r.mistakes || {}).forEach(([k, rm]) => {
      const lm = mistakes[k];
      mistakes[k] = !lm ? rm : { ...rm, count: max(lm.count, rm.count), at: max(lm.at, rm.at) };
    });
    const rs = { ...DEFAULTS.stats, ...r.stats };
    const ls = data.stats;
    const stats = mode === 'remote' ? rs : {
      answered: mode === 'link' ? ls.answered + rs.answered : max(ls.answered, rs.answered),
      correct: mode === 'link' ? ls.correct + rs.correct : max(ls.correct, rs.correct),
      bestStreak: max(ls.bestStreak, rs.bestStreak),
      days: [...new Set([...ls.days, ...rs.days])].sort().slice(-60),
    };
    data.progress = progress;
    data.mistakes = mistakes;
    data.stats = stats;
    data.seen = { ...data.seen, ...r.seen };
  }
  data.sync = { uid, dirty: mode !== 'remote' || !r };   // à renvoyer si l'appareil a apporté quelque chose
  write();
  listeners.forEach((fn) => fn(data));
  return data.sync.dirty;
}
