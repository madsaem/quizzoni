// Page d'un quiz, présentée comme une notice : contenu de la boîte, record,
// puis les réglages de la partie (catégories, difficulté, nombre de questions, mode).
import { h, fmt, sample } from '../utils.js';
import { icon } from '../icons.js';
import * as store from '../state.js';
import { getQuiz, typeCounts, LEVELS } from '../data.js';
import { startSession } from '../session.js';
import { sound } from '../audio.js';
import { levelPills } from '../ui.js';
import { renderBox, quizColorVars } from './box.js';

const MODES = [
  { id: 'entrainement', title: 'Entraînement', icon: 'book', desc: 'Sans chrono, à ton rythme. La correction s\'affiche après chaque question.' },
  { id: 'defi', title: 'Défi', icon: 'bolt', desc: 'Chrono sur chaque question. Réponds vite et enchaîne les bonnes réponses pour gagner plus de points.' },
];
const COUNTS = [10, 20, 30];

export function renderIntro(root, id) {
  const quiz = getQuiz(id);
  const back = h('a', { class: 'backlink', href: '#/' }, icon('back'), 'Retour aux rayons');

  if (!quiz) {
    root.replaceChildren(h('div', { class: 'wrap view' }, back,
      h('div', { class: 'notice', style: { marginTop: '1.5rem' } },
        h('h1', { class: 'notice__title' }, 'Boîte introuvable'),
        h('p', { class: 'notice__desc' }, 'Ce quiz n\'existe pas ou a été renommé. Retourne aux rayons pour choisir une autre boîte.'))));
    return;
  }

  store.markSeen(quiz.id);
  const prog = store.progressFor(quiz.id);
  const cats = quiz.categories || null;
  const prefs = store.quizPrefs(quiz.id) || {};

  /* ---------------------------------------------------- État des réglages */
  let mode = store.settings().lastMode || 'entrainement';
  let selCats = new Set(cats ? (prefs.cats || cats.map((c) => c.id)).filter((cid) => cats.some((c) => c.id === cid)) : []);
  if (cats && !selCats.size) selCats = new Set(cats.map((c) => c.id));
  let level = [0, 1, 2, 3].includes(prefs.level) ? prefs.level : 0;
  let count = prefs.count ?? (quiz.questions.length > 15 ? 10 : 0);
  // types de questions présents dans la boîte (les plus nombreux d'abord)
  const types = typeCounts(quiz);
  const typeIds = types.map((t) => t.type);
  let selTypes = new Set((Array.isArray(prefs.types) ? prefs.types : typeIds).filter((t) => typeIds.includes(t)));
  if (!selTypes.size) selTypes = new Set(typeIds);

  const inCats = (q) => !cats || selCats.has(q.cat);
  const atLevel = (q, lv = level) => !lv || q.level === lv;
  const ofType = (q) => selTypes.has(q.type);
  const pool = () => quiz.questions.filter((q) => inCats(q) && atLevel(q) && ofType(q));

  /* ------------------------------------------- Boîte qu'on peut faire tourner */
  const box = renderBox(quiz, { sticker: false });
  const body = box.querySelector('.box__body');
  const stageEl = h('div', { class: 'intro__stage', 'aria-hidden': 'true' }, box);
  let drag = null;
  stageEl.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, id: e.pointerId };
    stageEl.setPointerCapture(e.pointerId);
    body.style.transition = 'none';
  });
  stageEl.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;
    const ry = Math.max(-80, Math.min(40, -18 + dx * 0.45));
    const rx = Math.max(-35, Math.min(20, -8 - dy * 0.25));
    body.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
  });
  const release = () => {
    if (!drag) return;
    drag = null;
    body.style.transition = 'transform .9s cubic-bezier(.34, 1.56, .64, 1)';
    body.style.transform = '';
  };
  stageEl.addEventListener('pointerup', release);
  stageEl.addEventListener('pointercancel', release);

  /* ----------------------------------------------------------- Catégories */
  let catBlock = null;
  let catChips = [];
  if (cats) {
    catChips = cats.map((c) => {
      const countEl = h('span', { class: 'cat-chip__count' });
      const chip = h('button', {
        type: 'button',
        class: 'cat-chip',
        dataset: { cat: c.id },
        onClick: () => {
          if (selCats.has(c.id)) selCats.delete(c.id); else selCats.add(c.id);
          sound.play('click');
          refresh();
        },
      }, h('span', { class: 'cat-chip__box', 'aria-hidden': 'true' }, icon('check')), h('span', { class: 'cat-chip__name' }, c.title), countEl);
      chip._count = countEl;
      return chip;
    });
    const toggleAll = h('button', {
      type: 'button',
      class: 'linkbtn',
      onClick: () => {
        selCats = selCats.size === cats.length ? new Set() : new Set(cats.map((c) => c.id));
        sound.play('click');
        refresh();
      },
    });
    catBlock = h('section', { class: 'notice__block' },
      h('div', { class: 'block-head' }, h('h2', {}, 'Catégories'), toggleAll),
      h('div', { class: 'cat-chips', role: 'group', 'aria-label': 'Catégories à réviser' }, catChips));
    catBlock._toggle = toggleAll;
  }

  /* ---------------------------------------------------- Types de questions */
  let typeBlock = null;
  let typeChips = [];
  if (types.length > 1) {
    typeChips = types.map((t) => {
      const countEl = h('span', { class: 'cat-chip__count' });
      const chip = h('button', {
        type: 'button',
        class: 'cat-chip',
        onClick: () => {
          if (selTypes.has(t.type)) selTypes.delete(t.type); else selTypes.add(t.type);
          sound.play('click');
          refresh();
        },
      }, h('span', { class: 'cat-chip__box', 'aria-hidden': 'true' }, icon('check')), h('span', { class: 'cat-chip__name' }, t.label), countEl);
      chip._type = t.type;
      chip._count = countEl;
      return chip;
    });
    const toggleAll = h('button', {
      type: 'button',
      class: 'linkbtn',
      onClick: () => {
        selTypes = selTypes.size === typeIds.length ? new Set() : new Set(typeIds);
        sound.play('click');
        refresh();
      },
    });
    typeBlock = h('section', { class: 'notice__block' },
      h('div', { class: 'block-head' }, h('h2', {}, 'Types de questions'), toggleAll),
      h('div', { class: 'cat-chips', role: 'group', 'aria-label': 'Types de questions à garder' }, typeChips));
    typeBlock._toggle = toggleAll;
  }

  /* ----------------------------------------------------------- Difficulté */
  const levelOpts = [{ id: 0, label: 'Tous' }, ...LEVELS].map((lv) => {
    const countEl = h('span', { class: 'seg__count' });
    const b = h('button', {
      type: 'button',
      class: 'seg__opt',
      role: 'radio',
      onClick: () => { level = lv.id; sound.play('click'); refresh(); },
    }, lv.id ? levelPills(lv.id) : null, h('span', {}, lv.label), countEl);
    b._lv = lv.id;
    b._count = countEl;
    return b;
  });
  const levelBlock = h('section', { class: 'notice__block' },
    h('h2', {}, 'Difficulté'),
    h('div', { class: 'seg', role: 'radiogroup', 'aria-label': 'Difficulté' }, levelOpts),
    h('p', { class: 'notice__hint' }, 'Les questions moyennes rapportent 25 % de points en plus, les difficiles 50 %.'));

  /* --------------------------------------------------- Nombre de questions */
  const countOpts = [...COUNTS, 0].map((n) => {
    const b = h('button', {
      type: 'button',
      class: 'seg__opt',
      role: 'radio',
      onClick: () => { count = n; customInput.value = ''; sound.play('click'); refresh(); },
    }, n ? String(n) : 'Toutes');
    b._n = n;
    return b;
  });

  // nombre libre : l'étudiant tape la quantité voulue
  const customInput = h('input', {
    type: 'number',
    class: 'seg__input',
    min: 1,
    step: 1,
    inputmode: 'numeric',
    placeholder: '…',
    'aria-label': 'Nombre de questions au choix',
    onInput: () => {
      const v = parseInt(customInput.value, 10);
      if (Number.isFinite(v) && v >= 1) { count = v; refresh(); }
    },
    onChange: () => {
      const v = parseInt(customInput.value, 10);
      const max = pool().length;
      if (!Number.isFinite(v) || v < 1) { customInput.value = isCustom() ? String(count) : ''; return; }
      // au-delà du stock, c'est « Toutes »
      if (v >= max) { count = 0; customInput.value = ''; }
      sound.play('click');
      refresh();
    },
    onKeydown: (e) => { if (e.key === 'Enter') { e.preventDefault(); customInput.blur(); } },
  });
  const customOpt = h('label', { class: 'seg__opt seg__custom', role: 'radio' },
    h('span', {}, 'Autre'), customInput);
  customOpt.addEventListener('click', (e) => { if (e.target !== customInput) customInput.focus(); });
  const isCustom = () => count > 0 && !COUNTS.includes(count);

  const countBlock = h('section', { class: 'notice__block' },
    h('h2', {}, 'Nombre de questions'),
    h('div', { class: 'seg seg--count', role: 'radiogroup', 'aria-label': 'Nombre de questions' }, countOpts, customOpt));

  /* ---------------------------------------------------------------- Mode */
  const modes = h('div', { class: 'modes', role: 'radiogroup', 'aria-label': 'Mode de jeu' },
    MODES.map((m) => h('label', { class: 'mode' },
      h('input', {
        type: 'radio', name: 'mode', value: m.id, checked: mode === m.id,
        onChange: () => { mode = m.id; sound.play('click'); },
      }),
      h('span', { class: 'mode__check', 'aria-hidden': 'true' }),
      h('span', { class: 'mode__title' }, icon(m.icon), m.title),
      h('span', { class: 'mode__desc' }, m.desc))));

  /* ------------------------------------------------------------- Lancement */
  const summary = h('p', { class: 'intro__cta-hint', 'aria-live': 'polite' });
  const startBtn = h('button', { type: 'button', class: 'key', onClick: () => start() }, 'Commencer');

  function effectiveCount(p) { return count && count < p.length ? count : p.length; }

  function refresh() {
    const p = pool();

    // catégories : nombre de questions au niveau choisi
    catChips.forEach((chip) => {
      const cid = chip.dataset.cat;
      chip.setAttribute('aria-pressed', String(selCats.has(cid)));
      const n = quiz.questions.filter((q) => q.cat === cid && atLevel(q) && ofType(q)).length;
      chip._count.textContent = String(n);
      chip.dataset.empty = String(n === 0);
    });
    if (catBlock) catBlock._toggle.textContent = selCats.size === cats.length ? 'Tout décocher' : 'Tout cocher';

    // types : nombre de questions de ce type dans les catégories et la difficulté choisies
    typeChips.forEach((chip) => {
      chip.setAttribute('aria-pressed', String(selTypes.has(chip._type)));
      const n = quiz.questions.filter((q) => q.type === chip._type && inCats(q) && atLevel(q)).length;
      chip._count.textContent = String(n);
      chip.dataset.empty = String(n === 0);
    });
    if (typeBlock) typeBlock._toggle.textContent = selTypes.size === typeIds.length ? 'Tout décocher' : 'Tout cocher';

    // difficulté : nombre de questions dans les catégories et types choisis
    levelOpts.forEach((b) => {
      b.setAttribute('aria-checked', String(b._lv === level));
      b._count.textContent = String(quiz.questions.filter((q) => inCats(q) && ofType(q) && atLevel(q, b._lv)).length);
    });

    // nombre : on grise les tailles impossibles
    countOpts.forEach((b) => {
      b.setAttribute('aria-checked', String(b._n === count));
      b.disabled = b._n > 0 && b._n >= p.length;
      if (b._n === 0) b.textContent = `Toutes (${p.length})`;
    });
    const tooMany = count > 0 && count >= p.length;
    if (tooMany) countOpts.forEach((b) => b.setAttribute('aria-checked', String(b._n === 0)));
    customOpt.setAttribute('aria-checked', String(isCustom() && !tooMany));
    customInput.max = String(Math.max(1, p.length));
    if (document.activeElement !== customInput) customInput.value = isCustom() && !tooMany ? String(count) : '';

    const n = effectiveCount(p);
    startBtn.disabled = n === 0;
    if (!p.length) {
      summary.textContent = cats && !selCats.size
        ? 'Choisis au moins une catégorie.'
        : !selTypes.size
          ? 'Choisis au moins un type de question.'
          : 'Aucune question ne correspond. Change la difficulté, ajoute des catégories ou des types.';
    } else if (n < p.length) {
      summary.textContent = `${n} questions tirées au hasard parmi ${p.length}`;
    } else {
      summary.textContent = `${n} question${n > 1 ? 's' : ''}, ${quiz.shuffle === false ? 'dans l\'ordre' : 'dans le désordre'}`;
    }
  }

  function start() {
    const p = pool();
    const n = effectiveCount(p);
    if (!n) return;
    const questions = n < p.length ? sample(p, n) : p;
    store.setSetting('lastMode', mode);
    store.setQuizPrefs(quiz.id, { cats: [...selCats], level, count, types: [...selTypes] });
    startSession({
      questions,
      mode,
      title: quiz.title,
      quizId: quiz.id,
      quiz,
      shuffleQuestions: quiz.shuffle !== false || n < p.length,
      filters: {
        level,
        allCats: !cats || selCats.size === cats.length,
        catTitles: cats ? cats.filter((c) => selCats.has(c.id)).map((c) => c.title) : null,
        allTypes: selTypes.size === typeIds.length,
        typeLabels: types.filter((t) => selTypes.has(t.type)).map((t) => t.label),
      },
    });
    sound.play('whoosh');
    location.hash = '#/play';
  }

  /* ------------------------------------------------------------- Notice */
  const contents = h('ul', { class: 'contents', role: 'list' },
    typeCounts(quiz).map(({ n, label }) => h('li', {}, `${label} × ${n}`)));

  const record = prog
    ? h('p', { class: 'record' }, h('b', {}, `${prog.bestPct} %`),
      h('span', {}, `${fmt(prog.best)} points au mieux, ${prog.plays} partie${prog.plays > 1 ? 's' : ''} jouée${prog.plays > 1 ? 's' : ''}`))
    : h('p', { class: 'record' }, h('span', {}, 'Pas encore joué. Ton premier score sera ton record.'));

  const notice = h('article', { class: 'notice', style: quizColorVars(quiz) },
    quiz.ue ? h('p', { class: 'notice__ue' }, quiz.ue) : null,
    h('h1', { class: 'notice__title' }, quiz.title),
    quiz.description ? h('p', { class: 'notice__desc' }, quiz.description) : null,
    quiz.wip ? h('p', { class: 'notice__wip', role: 'note' }, h('b', {}, 'Boîte en construction. '), quiz.wip) : null,
    h('section', { class: 'notice__block' }, h('h2', {}, 'Dans la boîte'), contents),
    h('section', { class: 'notice__block' }, h('h2', {}, 'Ton record'), record),
    catBlock,
    typeBlock,
    levelBlock,
    countBlock,
    h('section', { class: 'notice__block' }, h('h2', {}, 'Mode de jeu'), modes),
    h('div', { class: 'intro__cta' }, startBtn, summary));

  refresh();

  const layout = h('div', { class: 'intro', style: quizColorVars(quiz) },
    h('div', {}, stageEl, h('p', { class: 'intro__hint' }, 'Fais tourner la boîte')),
    notice);

  root.replaceChildren(h('div', { class: 'wrap view' }, back, layout,
    h('footer', { class: 'site-footer' }, h('p', {}, 'Raccourcis pendant la partie : touches 1 à 6 pour répondre, Entrée pour valider ou continuer, Échap pour quitter.'))));
}
