// Résultats, présentés comme une ordonnance de révision.
import { h, md } from '../utils.js';
import { icon } from '../icons.js';
import { getType } from '../types/index.js';
import { levelLabel } from '../data.js';
import { results, startSession } from '../session.js';
import { sound } from '../audio.js';
import { rain, countUp } from '../fx.js';

function verdict(pct) {
  if (pct === 100) return 'Sans faute.';
  if (pct >= 80) return 'Très bon résultat.';
  if (pct >= 60) return 'C\'est en bonne voie.';
  if (pct >= 40) return 'Encore un passage et ça rentre.';
  return 'On reprend la notice tranquillement.';
}

export function renderResults(root) {
  const r = results();
  if (!r) { location.hash = '#/'; return; }

  const date = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());
  const missed = r.items.filter((it) => !it.correct);

  const big = (value, label, id) => h('div', { class: 'rx__cell' }, h('span', { class: 'rx__big', id }, value), h('span', { class: 'rx__label' }, label));
  const pointsEl = big('0', 'points', 'rx-points');
  const pctEl = big('0 %', 'de réussite', 'rx-pct');

  const stamp = r.isRecord
    ? h('div', { class: 'rx__stamp', 'aria-hidden': 'true' }, h('small', {}, 'Nouveau'), 'Record')
    : r.pct === 100 ? h('div', { class: 'rx__stamp', 'aria-hidden': 'true' }, h('small', {}, 'Zéro'), 'Erreur') : null;

  const list = h('ol', { class: 'rx__list', role: 'list' }, r.items.map((it, i) => {
    const kind = it.correct ? 'good' : it.score > 0 ? 'mid' : 'bad';
    const type = getType(it.q.type);
    return h('li', { class: `rx__item is-${kind}` },
      h('span', { class: 'rx__mark', 'aria-label': it.correct ? 'Réussie' : it.score > 0 ? 'En partie réussie' : 'Ratée' },
        icon(kind === 'good' ? 'check' : kind === 'mid' ? 'tilde' : 'x')),
      h('span', { class: 'rx__q', html: `${i + 1}. ${md(it.q.prompt)}` }),
      !it.correct ? h('span', { class: 'rx__a' }, it.timeout ? 'Temps écoulé. ' : '', 'Réponse\u00a0: ', h('b', { html: md(type.answerText(it.q)) })) : null);
  }));

  const replay = () => {
    startSession({ questions: r.items.map((it) => it.q), mode: r.mode, title: r.title, quizId: r.quizId, quiz: r.quiz, source: r.source, filters: r.filters });
    sound.play('whoosh');
    location.hash = '#/play';
  };
  const replayMissed = () => {
    startSession({ questions: missed.map((it) => it.q), mode: 'entrainement', title: `${r.title} : à revoir`, source: 'mistakes' });
    sound.play('whoosh');
    location.hash = '#/play';
  };

  const f = r.filters || {};
  const sub = [
    r.title,
    r.mode === 'defi' ? 'mode Défi' : 'mode Entraînement',
    f.level ? `niveau ${levelLabel(f.level).toLowerCase()}` : null,
    f.catTitles && !f.allCats ? f.catTitles.join(', ') : null,
  ].filter(Boolean).join(', ');
  const rx = h('article', { class: 'rx', 'aria-labelledby': 'rx-title' },
    h('header', { class: 'rx__head' },
      h('div', { class: 'rx__brand' }, h('span', { class: 'cross3d', 'aria-hidden': 'true', style: { '--s': '26px' } },
        h('span', { class: 'cross3d__spin', style: { animation: 'none', transform: 'rotateY(-25deg) rotateX(10deg)' } },
          Array.from({ length: 7 }, (_, i) => h('span', { class: 'cross3d__layer', style: { '--i': i } })))),
        h('span', {}, 'Ordonnance de révision', h('small', {}, 'Quizzoni, IFSI de Bastia'))),
      h('div', { class: 'rx__date' }, date)),
    stamp,
    h('h1', { class: 'rx__title', id: 'rx-title' }, verdict(r.pct)),
    h('p', { class: 'rx__sub' }, sub),
    h('div', { class: 'rx__score' },
      big(`${r.correctCount}/${r.total}`, 'bonnes réponses'),
      pctEl,
      pointsEl),
    r.bestStreak > 1 ? h('p', { class: 'rx__sub', style: { fontSize: 'var(--t-md)' } }, `Meilleure série : ${r.bestStreak} bonnes réponses d'affilée.`) : null,
    h('h2', { class: 'rx__section' }, 'Tes réponses'),
    list,
    h('div', { class: 'rx__actions' },
      missed.length ? h('button', { type: 'button', class: 'key', onClick: replayMissed, style: { '--k-bg': 'var(--c1)', '--k-ink': 'var(--c1-ink)' } }, icon('retry'), `Revoir ${missed.length === 1 ? 'mon erreur' : `mes ${missed.length} erreurs`}`) : null,
      h('button', { type: 'button', class: 'key', onClick: replay, style: { '--k-bg': 'var(--c2)', '--k-ink': 'var(--c2-ink)' } }, icon('shuffle'), 'Rejouer'),
      h('a', { class: 'key key--ghost', href: r.quizId ? `#/quiz/${r.quizId}` : '#/' }, icon('shelf'), r.quizId ? 'Retour à la boîte' : 'Retour aux rayons')));

  root.replaceChildren(h('div', { class: 'wrap results view' }, rx));

  // compteurs animés
  const ptsNode = pointsEl.querySelector('.rx__big');
  const pctNode = pctEl.querySelector('.rx__big');
  countUp(ptsNode, 0, r.points, 1100);
  let shown = 0;
  const t0 = performance.now();
  const step = (now) => {
    const k = Math.min(1, (now - t0) / 900);
    shown = Math.round(r.pct * (1 - Math.pow(1 - k, 3)));
    pctNode.textContent = `${shown} %`;
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  setTimeout(() => sound.play('finish', r.pct / 100), 200);
  if (r.pct >= 70) setTimeout(() => rain(r.pct === 100 ? 200 : 120), 350);
}
