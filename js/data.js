// Chargement des quiz (dossier data/) et vérification des questions.
import { getType } from './types/index.js';
import { hash } from './utils.js';

let catalog = null;

/** Niveaux de difficulté (champ "level" des questions). */
export const LEVELS = [
  { id: 1, label: 'Facile' },
  { id: 2, label: 'Moyen' },
  { id: 3, label: 'Difficile' },
];
export function levelLabel(n) { return LEVELS.find((l) => l.id === n)?.label || 'Moyen'; }

async function fetchJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url} : ${res.status}`);
  return res.json();
}

export async function loadCatalog() {
  if (catalog) return catalog;
  const index = await fetchJSON('data/catalog.json');
  const problems = [];
  const quizzes = [];

  for (const id of index.quizzes) {
    let quiz;
    try {
      quiz = await fetchJSON(`data/quizzes/${id}.json`);
    } catch (e) {
      problems.push(`Quiz « ${id} » introuvable ou mal écrit (${e.message}).`);
      continue;
    }
    quiz.id = id;
    const seen = new Set();
    const catIds = Array.isArray(quiz.categories) && quiz.categories.length
      ? new Set(quiz.categories.map((c) => c.id)) : null;
    if (!catIds) delete quiz.categories;
    quiz.questions = (quiz.questions || []).filter((q, i) => {
      const where = `${id}, question ${i + 1}`;
      const type = getType(q.type);
      if (!type) { problems.push(`${where} : type « ${q.type} » inconnu.`); return false; }
      if (!q.prompt) { problems.push(`${where} : il manque "prompt".`); return false; }
      if (q.variants != null && (!Array.isArray(q.variants) || q.variants.some((v) => typeof v !== 'string' || !v.trim()))) {
        problems.push(`${where} : "variants" doit être une liste d'énoncés (ignorée).`);
        delete q.variants;
      }
      const err = type.validate(q);
      if (err) { problems.push(`${where} : ${err}.`); return false; }
      if (q.level == null) q.level = 2;
      else if (![1, 2, 3].includes(q.level)) { problems.push(`${where} : "level" doit valoir 1, 2 ou 3 (mis à 2).`); q.level = 2; }
      if (catIds && !catIds.has(q.cat)) {
        problems.push(`${where} : "cat" doit être l'id d'une catégorie du quiz (${[...catIds].join(', ')}).`);
        return false;
      }
      // identifiant stable, basé sur le texte (ou "id" si fourni)
      q.qid = q.id || hash(`${q.type}|${q.prompt}`);
      if (seen.has(q.qid)) q.qid = `${q.qid}-${i}`;
      seen.add(q.qid);
      q.quizId = id;
      return true;
    });
    if (quiz.questions.length) quizzes.push(quiz);
  }

  if (problems.length) {
    console.group(`Quizzoni : ${problems.length} problème(s) dans les questions`);
    problems.forEach((p) => console.warn(p));
    console.groupEnd();
  }

  catalog = { shelves: index.shelves || [], quizzes, problems };
  return catalog;
}

export function getQuiz(id) { return catalog?.quizzes.find((q) => q.id === id) || null; }

/** Une question par son identifiant. Si elle a changé de boîte, on la cherche dans les autres. */
export function findQuestion(quizId, qid) {
  return getQuiz(quizId)?.questions.find((q) => q.qid === qid)
    || allQuestions().find((q) => q.qid === qid) || null;
}

/** Catégorie d'une question (objet { id, title }) ou null. */
export function categoryOf(q) {
  return getQuiz(q.quizId)?.categories?.find((c) => c.id === q.cat) || null;
}

export function allQuestions() { return catalog ? catalog.quizzes.flatMap((q) => q.questions) : []; }

/** "7 calculs, 2 QCM…" : contenu d'une boîte. */
export function typeCounts(quiz) {
  const counts = new Map();
  quiz.questions.forEach((q) => counts.set(q.type, (counts.get(q.type) || 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([type, n]) => ({ type, n, label: getType(type).label }));
}
