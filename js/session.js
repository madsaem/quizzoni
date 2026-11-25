// Une partie : liste de questions, mode, score, série.
import { shuffle } from './utils.js';
import { getType } from './types/index.js';

let current = null;
let lastResults = null;

/* ------------------------------------------------- Formulations variables
   Une question peut avoir plusieurs énoncés ("variants") : c'est la même
   question (même identifiant, mêmes records), seule la formulation change.
   On évite de reproposer la formulation vue la dernière fois. */
const SEEN_KEY = 'quizzoni:formulations';
let seen = {};
try { seen = JSON.parse(localStorage.getItem(SEEN_KEY)) || {}; } catch { seen = {}; }

export function promptsOf(q) {
  return [q.prompt, ...(Array.isArray(q.variants) ? q.variants : [])].filter((p) => typeof p === 'string' && p.trim());
}

function pickPrompt(q) {
  const all = promptsOf(q);
  if (all.length < 2) return q.prompt;
  const key = `${q.quizId}/${q.qid}`;
  const last = seen[key];
  let i = Math.floor(Math.random() * all.length);
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (all.length - 1))) % all.length;
  seen[key] = i;
  return all[i];
}
function saveSeen() {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify(seen)); } catch { /* stockage plein ou privé */ }
}

/**
 * @param {object} o
 * @param {Array} o.questions   questions (avec quizId)
 * @param {string} o.mode       'entrainement' | 'defi'
 * @param {string} o.title      titre affiché
 * @param {string|null} o.quizId  quiz d'origine (null pour un mélange)
 * @param {object} [o.quiz]     quiz d'origine (couleur, temps par défaut)
 */
export function startSession({ questions, mode, title, quizId = null, quiz = null, shuffleQuestions = true, source, filters = null }) {
  current = {
    filters,
    id: Date.now(),
    title,
    quizId,
    quiz,
    mode,
    source: source || (quizId ? 'quiz' : 'mix'),
    // copie de chaque question avec l'énoncé tiré au sort pour cette partie
    questions: (shuffleQuestions ? shuffle(questions) : questions.slice()).map((q) => ({ ...q, shown: pickPrompt(q) })),
    index: 0,
    points: 0,
    streak: 0,
    bestStreak: 0,
    results: [],
  };
  saveSeen();
  return current;
}

export function session() { return current; }
export function endSession(results) { lastResults = results; current = null; }
export function results() { return lastResults; }

/** Temps accordé en mode Défi. */
export function timeFor(q, quiz) {
  return q.time || quiz?.time?.[q.type] || getType(q.type).time || 30;
}

/** Les questions plus difficiles rapportent plus. */
export const LEVEL_BONUS = { 1: 1, 2: 1.25, 3: 1.5 };

/**
 * Points d'une réponse.
 * Base 1000 × score × bonus de difficulté. En Défi : jusqu'à -50 % si on répond
 * à la dernière seconde, puis +100 par bonne réponse d'affilée (plafonné à +500).
 */
export function pointsFor({ score, mode, elapsed, limit, streak, level = 2 }) {
  if (score <= 0) return 0;
  let pts = 1000 * score * (LEVEL_BONUS[level] || 1);
  if (mode === 'defi' && limit) pts *= 1 - 0.5 * Math.min(1, elapsed / limit);
  pts = Math.round(pts / 10) * 10;
  if (mode === 'defi' && score >= 1 && streak > 1) pts += Math.min(5, streak - 1) * 100;
  return pts;
}
