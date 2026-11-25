// Accueil : comptoir (révision express, erreurs), ticket de stats, rayons de boîtes.
import { h, fmt, normalize, sample } from '../utils.js';
import { icon } from '../icons.js';
import * as store from '../state.js';
import { allQuestions, findQuestion } from '../data.js';
import { startSession } from '../session.js';
import { sound } from '../audio.js';
import { renderBox } from './box.js';
import { currentUser } from '../compte.js';

const EXPRESS_COUNT = 10;
const MISTAKES_MAX = 15;

export function renderHome(root, catalog) {
  let query = '';
  let shelfFilter = 'all';

  const validMistakes = () => store.mistakes().filter((m) => findQuestion(m.quizId, m.qid));

  function startExpress() {
    const qs = sample(allQuestions(), EXPRESS_COUNT);
    startSession({ questions: qs, mode: store.settings().lastMode, title: 'Révision express', source: 'express' });
    sound.play('whoosh');
    location.hash = '#/play';
  }

  function startMistakes() {
    const ms = validMistakes().sort((a, b) => b.count - a.count || b.at - a.at).slice(0, MISTAKES_MAX);
    const qs = ms.map((m) => findQuestion(m.quizId, m.qid));
    if (!qs.length) return;
    startSession({ questions: qs, mode: 'entrainement', title: 'Mes erreurs', source: 'mistakes' });
    sound.play('whoosh');
    location.hash = '#/play';
  }

  /* ------------------------------------------------------------ Comptoir */
  const nbMistakes = validMistakes().length;
  const quick = h('div', { class: 'quick' },
    h('button', { type: 'button', class: 'key quick__tile quick__tile--express', onClick: startExpress },
      h('span', { class: 'quick__top' }, icon('shuffle', 'quick__icon'), h('span', { class: 'quick__count' }, String(EXPRESS_COUNT))),
      h('span', {},
        h('span', { class: 'quick__title' }, 'Révision express'),
        h('span', { class: 'quick__desc' }, 'Questions tirées au hasard dans toutes les boîtes'))),
    h('button', {
      type: 'button',
      class: 'key quick__tile quick__tile--errors',
      onClick: startMistakes,
      disabled: nbMistakes === 0,
    },
      h('span', { class: 'quick__top' }, icon('retry', 'quick__icon'), h('span', { class: 'quick__count' }, String(Math.min(nbMistakes, MISTAKES_MAX)))),
      h('span', {},
        h('span', { class: 'quick__title' }, 'Mes erreurs'),
        h('span', { class: 'quick__desc' }, nbMistakes
          ? 'Les questions ratées reviennent ici jusqu\'à ce que tu les réussisses'
          : 'Rien à revoir pour l\'instant. Les questions ratées s\'ajouteront ici'))));

  const st = store.stats();
  const played = catalog.quizzes.filter((q) => store.progressFor(q.id)).length;
  const today = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const row = (label, value) => h('div', { class: 'receipt__row' }, h('dt', {}, label), h('span', { class: 'receipt__lead', 'aria-hidden': 'true' }), h('dd', {}, value));
  const streak = store.dayStreak();
  const receipt = h('aside', { class: 'receipt', 'aria-label': 'Tes statistiques' },
    h('div', { class: 'receipt__head' }, h('span', { class: 'receipt__title' }, 'Ton ticket'), h('span', { class: 'receipt__date' }, today)),
    h('dl', { class: 'receipt__rows' },
      row('Réponses données', fmt(st.answered)),
      row('Réussite', st.answered ? `${Math.round((st.correct / st.answered) * 100)} %` : '–'),
      row('Jours d\'affilée', fmt(streak)),
      row('Boîtes ouvertes', `${played} sur ${catalog.quizzes.length}`)),
    h('p', { class: 'receipt__foot' }, st.bestStreak > 1
      ? `Meilleure série : ${st.bestStreak} bonnes réponses d'affilée. ${currentUser() ? 'Progression synchronisée avec ton compte.' : 'Progression enregistrée sur cet appareil.'}`
      : currentUser() ? 'Ta progression est synchronisée avec ton compte.' : 'Ta progression est enregistrée sur cet appareil. Connecte-toi (bouton Compte) pour la retrouver partout.'));

  const hero = h('section', { class: 'hero' },
    h('div', {},
      h('h1', { class: 'hero__title' }, 'On révise quoi aujourd\'hui\u00a0?'),
      h('p', { class: 'hero__lead' }, 'Des quiz courts sur le programme de 2e année : pharmaco, processus obstructifs, calculs de doses, et les valeurs à connaître par cœur.'),
      quick),
    receipt);

  /* ------------------------------------------------------------- Filtres */
  const searchInput = h('input', {
    class: 'field',
    type: 'search',
    placeholder: 'Chercher un thème, une UE…',
    'aria-label': 'Chercher un quiz',
    onInput: (e) => { query = e.target.value; renderShelves(); },
  });
  const chipDefs = [{ id: 'all', title: 'Tout' }, ...catalog.shelves];
  const chips = chipDefs.map((c) => h('button', {
    type: 'button',
    class: 'chip',
    'aria-pressed': String(c.id === shelfFilter),
    onClick: () => {
      shelfFilter = c.id;
      chips.forEach((b, i) => b.setAttribute('aria-pressed', String(chipDefs[i].id === shelfFilter)));
      sound.play('click');
      renderShelves();
    },
  }, c.title));
  const filters = h('div', { class: 'filters' },
    h('div', { class: 'search' }, icon('search'), searchInput),
    h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtrer par rayon' }, chips));

  /* -------------------------------------------------------------- Rayons */
  const shelvesEl = h('div', { class: 'shelves' });
  function renderShelves() {
    const nq = normalize(query);
    const match = (quiz) => !nq || normalize([quiz.title, quiz.subtitle, quiz.ue, quiz.description, ...(quiz.tags || [])].join(' ')).includes(nq);
    const sections = catalog.shelves
      .filter((sh) => shelfFilter === 'all' || sh.id === shelfFilter)
      .map((sh) => {
        const items = catalog.quizzes.filter((q) => q.shelf === sh.id && match(q));
        if (!items.length) return null;
        return h('section', { class: 'shelf', 'aria-labelledby': `shelf-${sh.id}` },
          h('div', { class: 'shelf__head' },
            h('h2', { class: 'shelf__title', id: `shelf-${sh.id}` }, sh.title),
            sh.note ? h('p', { class: 'shelf__note' }, sh.note) : null),
          h('div', { class: 'shelf__grid' }, items.map((q) => h('div', { class: 'shelf__item' }, renderBox(q, { href: `#/quiz/${q.id}` })))));
      })
      .filter(Boolean);
    shelvesEl.replaceChildren(...(sections.length ? sections : [
      h('p', { class: 'shelf__empty' }, `Aucune boîte ne correspond à « ${query} ». Essaie un autre mot, ou un numéro d'UE comme 4.4.`),
    ]));
  }
  renderShelves();

  const warning = catalog.problems.length
    ? h('p', { class: 'dev-warning cut', role: 'status' },
      `${catalog.problems.length} question(s) ignorée(s) car mal écrite(s). Le détail est dans la console du navigateur (touche F12).`)
    : null;

  const footer = h('footer', { class: 'site-footer' },
    h('p', {}, 'Quizzoni est fait par des étudiants de l\'IFSI de Bastia, pour réviser entre deux stages.'),
    h('p', {}, 'Les questions ne remplacent ni les cours ni les protocoles de ton service. En cas de doute, ce sont eux qui font foi.'));

  root.replaceChildren(h('div', { class: 'wrap view' }, hero, warning, filters, shelvesEl, footer));
}
