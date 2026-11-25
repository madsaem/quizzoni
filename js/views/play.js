// La partie : une question à la fois, chrono en Défi, correction après chaque réponse.
import { h, md, fmt, prefersReducedMotion } from '../utils.js';
import { icon } from '../icons.js';
import * as store from '../state.js';
import { getType } from '../types/index.js';
import { getQuiz, categoryOf, levelLabel } from '../data.js';
import { session, endSession, timeFor, pointsFor } from '../session.js';
import { sound } from '../audio.js';
import { burst, shake, floatText, centerOf, countUp, vibrate, createMonitor } from '../fx.js';
import { confirmDialog, levelPills } from '../ui.js';

const TITLES = {
  good: ['Bonne réponse !', 'Exact !', 'Bien vu !', 'C\'est ça !'],
  mid: ['Presque !', 'Pas loin !'],
  bad: ['Raté !', 'Pas cette fois.', 'Non, dommage.'],
};
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export function renderPlay(root) {
  const ses = session();
  if (!ses) { location.hash = '#/'; return; }
  const total = ses.questions.length;
  const defi = ses.mode === 'defi';

  /* -------------------------------------------------------------- Squelette */
  const monitorCanvas = h('canvas', { class: 'stage__monitor', 'aria-hidden': 'true' });
  const cells = ses.questions.map(() => h('span', { class: 'blister__cell' }));
  const blister = h('div', {
    class: `blister${total > 30 ? ' blister--dense' : ''}`, role: 'progressbar',
    'aria-label': 'Progression', 'aria-valuemin': '0', 'aria-valuemax': String(total), 'aria-valuenow': '0',
  }, cells);
  const scoreVal = h('span', { class: 'score__value' }, fmt(ses.points));
  const streakSlot = h('div', { class: 'streak-slot', 'aria-live': 'polite' });
  const quitBtn = h('button', { type: 'button', class: 'key key--sm key--icon stage__quit', 'aria-label': 'Quitter la partie', onClick: () => askQuit() }, icon('x'));
  const bar = h('header', { class: 'stage__bar' }, quitBtn, blister, streakSlot,
    h('div', { class: 'score' }, scoreVal, h('span', { class: 'score__label' }, 'points')));
  const main = h('main', { class: 'stage__main' });
  const feedback = h('section', { class: 'feedback', 'aria-live': 'polite', 'aria-label': 'Correction', inert: true });
  const stage = h('div', { class: 'stage' }, monitorCanvas, bar, main, feedback);
  root.replaceChildren(stage);
  const monitor = createMonitor(monitorCanvas);

  /* ----------------------------------------------------------------- État */
  let q, type, comp, answer, ready, phase, limit;
  let cardWrap, block, validateBtn, actionsEl, timerEl, timerNum, timerFill;
  let tStart = 0, tPaused = 0, tPauseAt = null, tRaf = 0, lastWhole = null;
  let destroyed = false;

  const elapsed = () => ((tPauseAt ?? performance.now()) - tStart - tPaused) / 1000;

  /* --------------------------------------------------------------- Chrono */
  function tick() {
    if (destroyed || phase !== 'answer') return;
    const el = elapsed();
    const left = Math.max(0, limit - el);
    const whole = Math.ceil(left);
    timerNum.textContent = String(whole);
    timerFill.style.transform = `scaleX(${left / limit})`;
    const low = left <= 5;
    timerEl.classList.toggle('is-low', low);
    timerFill.parentElement.classList.toggle('is-low', low);
    if (low && whole !== lastWhole && left > 0) sound.play('tick');
    lastWhole = whole;
    monitor.setBpm(68 + 80 * Math.min(1, el / limit));
    if (left <= 0) { finish(null, { timeout: true }); return; }
    tRaf = requestAnimationFrame(tick);
  }
  function pauseTimer() { if (tPauseAt == null) tPauseAt = performance.now(); cancelAnimationFrame(tRaf); }
  function resumeTimer() {
    if (tPauseAt != null) { tPaused += performance.now() - tPauseAt; tPauseAt = null; }
    if (defi && phase === 'answer') tRaf = requestAnimationFrame(tick);
  }

  /* -------------------------------------------------------------- Question */
  function showQuestion() {
    phase = 'answer';
    answer = null;
    ready = false;
    q = ses.questions[ses.index];
    type = getType(q.type);
    const quiz = ses.quiz || getQuiz(q.quizId);

    cells.forEach((c, i) => c.classList.toggle('is-current', i === ses.index));
    blister.setAttribute('aria-valuenow', String(ses.index));

    const cat = categoryOf(q);
    const typeText = [type.label, cat?.title, ses.source === 'quiz' ? null : (quiz?.short || quiz?.title)].filter(Boolean).join(', ');
    const meta = h('div', { class: 'q-meta' },
      h('span', { class: 'q-count' }, `Question ${ses.index + 1} sur ${total}`),
      h('div', { class: 'q-tags' },
        h('span', { class: 'q-level', title: `Difficulté : ${levelLabel(q.level)}` }, levelPills(q.level), levelLabel(q.level)),
        h('span', { class: 'q-type' }, typeText)));

    let timerBlock = null;
    if (defi) {
      limit = timeFor(q, quiz);
      timerNum = h('span', { class: 'timer__num', 'aria-hidden': 'true' }, String(limit));
      timerEl = h('div', { class: 'timer' }, icon('timer'), timerNum);
      timerFill = h('div', { class: 'timer-bar__fill' });
      meta.insertBefore(timerEl, meta.lastChild);
      timerBlock = h('div', { class: 'timer-bar', role: 'timer', 'aria-label': `${limit} secondes pour répondre` }, timerFill);
    }

    const hint = q.hint || type.hint?.(q);
    const card = h('div', { class: `q-card q-card--${q.type}` },
      h('h1', { class: 'q-prompt', html: md(q.shown || q.prompt) }),
      hint ? h('p', { class: 'q-hint' }, hint) : null,
      q.media ? h('figure', { class: 'q-media' }, h('img', { src: q.media.src, alt: q.media.alt || '' })) : null);
    cardWrap = h('div', { class: 'q-card-wrap' }, card);

    const api = {
      setAnswer(a, r) {
        answer = a;
        ready = !!r;
        if (validateBtn) validateBtn.disabled = !ready;
      },
      submit(a, origin) { answer = a; finish(origin); },
      sound: (name) => sound.play(name),
    };
    validateBtn = null;
    comp = type.mount(q, api);

    const instant = q.type === 'truefalse' || (q.type === 'choice' && !Array.isArray(q.answer));
    actionsEl = h('div', { class: 'q-actions' });
    if (!instant) {
      validateBtn = h('button', { type: 'button', class: 'key q-validate', disabled: !ready, onClick: () => finish(validateBtn) }, icon('check'), 'Valider');
      actionsEl.append(validateBtn);
    }
    actionsEl.hidden = !actionsEl.childElementCount;

    // la question (énoncé + réponses) est centrée dans l'écran, sous le compteur
    block = h('div', { class: 'q-block', dataset: { type: q.type } }, cardWrap, h('div', { class: 'q-answer' }, comp.el), actionsEl);
    main.classList.remove('has-feedback');
    main.replaceChildren(...[meta, timerBlock, block].filter(Boolean));
    stage.scrollTo({ top: 0 });

    if (['text', 'number', 'suffix', 'cite'].includes(q.type)) comp.focus?.();

    tStart = performance.now(); tPaused = 0; tPauseAt = null; lastWhole = null;
    monitor.setBpm(68);
    if (defi) tRaf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ Correction */
  function finish(origin, { timeout = false } = {}) {
    if (phase !== 'answer') return;
    if (!timeout && !ready && answer == null) return;
    phase = 'feedback';
    cancelAnimationFrame(tRaf);
    const spent = elapsed();
    comp.lock();

    const given = timeout ? null : answer;
    const res = type.grade(q, given, comp) || { score: 0 };
    const score = Math.max(0, Math.min(1, res.score || 0));
    const correct = score >= 0.999;
    const kind = correct ? 'good' : score > 0 ? 'mid' : 'bad';

    ses.streak = correct ? ses.streak + 1 : 0;
    ses.bestStreak = Math.max(ses.bestStreak, ses.streak);
    const pts = pointsFor({ score, mode: ses.mode, elapsed: spent, limit, streak: ses.streak, level: q.level });
    const before = ses.points;
    ses.points += pts;
    ses.results.push({ q, answer: given, score, correct, pts, timeout, note: res.note });
    store.recordAnswer(q.quizId, q.qid, correct);

    comp.reveal(res, given);
    cells[ses.index].classList.remove('is-current');
    cells[ses.index].classList.add(`is-${kind}`);
    blister.setAttribute('aria-valuenow', String(ses.index + 1));
    countUp(scoreVal, before, ses.points);

    // effets
    const from = centerOf(origin && origin.isConnected ? origin : cardWrap);
    if (kind === 'good') {
      sound.play('correct');
      monitor.kick('good');
      burst(from.x, from.y, { count: ses.streak >= 3 ? 60 : 34, power: ses.streak >= 3 ? 1.25 : 1 });
      if (ses.streak >= 2) setTimeout(() => sound.play('streak', ses.streak), 260);
    } else if (kind === 'mid') {
      sound.play('partial');
      monitor.kick('mid');
      burst(from.x, from.y, { count: 12, power: 0.7 });
    } else {
      sound.play(timeout ? 'timeup' : 'wrong');
      monitor.kick('bad');
      shake(cardWrap);
      vibrate(70);
    }
    if (pts > 0) floatText(`+${fmt(pts)}`, from.x, from.y - 10);

    streakSlot.replaceChildren(defi && ses.streak >= 2
      ? h('span', { class: 'streak' }, icon('flame'), `Série de ${ses.streak}`)
      : '');

    actionsEl.hidden = true;
    showFeedback({ kind, pts, res, timeout });
  }

  function showFeedback({ kind, pts, res, timeout }) {
    const last = ses.index === total - 1;
    const title = timeout ? 'Temps écoulé' : pick(TITLES[kind]);
    const iconName = kind === 'good' ? 'check' : kind === 'mid' ? 'tilde' : 'x';
    const goBtn = h('button', { type: 'button', class: 'key feedback__go', onClick: next }, last ? 'Voir le résultat' : 'Question suivante');

    const expected = kind !== 'good' && !type.inlineReveal
      ? h('p', { class: 'feedback__expected' }, 'Réponse attendue\u00a0: ', h('b', { html: md(type.answerText(q)) }))
      : null;
    const explainParts = [res.note, q.explain].filter(Boolean);

    feedback.replaceChildren(h('div', { class: 'feedback__inner' },
      h('div', { class: 'feedback__icon', 'aria-hidden': 'true' }, icon(iconName)),
      h('div', { class: 'feedback__head' },
        h('h2', { class: 'feedback__title' }, title),
        h('span', { class: 'feedback__points' }, pts > 0 ? `+${fmt(pts)} points` : '0 point')),
      expected,
      explainParts.length ? h('div', { class: 'feedback__explain' }, explainParts.map((t) => h('p', { html: md(t) }))) : null,
      goBtn));
    feedback.className = `feedback feedback--${kind}`;
    feedback.inert = false;
    void feedback.offsetWidth;
    feedback.classList.add('is-open');
    // la question remonte pour laisser la place à la correction (sans saut brusque)
    const top0 = block.getBoundingClientRect().top;
    main.classList.add('has-feedback');
    const dy = top0 - block.getBoundingClientRect().top;
    if (dy && block.animate && !prefersReducedMotion()) {
      block.animate([{ transform: `translateY(${dy}px)` }, { transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' });
    }
    setTimeout(() => { if (!destroyed) goBtn.focus({ preventScroll: true }); }, 120);
  }

  function next() {
    if (phase !== 'feedback') return;
    phase = 'transition';
    sound.play('whoosh');
    feedback.classList.remove('is-open');
    feedback.inert = true;
    if (ses.index >= total - 1) { end(); return; }
    ses.index += 1;
    showQuestion();
  }

  function end() {
    const sum = ses.results.reduce((a, r) => a + r.score, 0);
    const pct = Math.round((sum / total) * 100);
    const correctCount = ses.results.filter((r) => r.correct).length;
    const isRecord = store.recordSession({ quizId: ses.source === 'quiz' ? ses.quizId : null, points: ses.points, pct, bestStreak: ses.bestStreak });
    endSession({
      title: ses.title,
      mode: ses.mode,
      quizId: ses.quizId,
      quiz: ses.quiz,
      source: ses.source,
      filters: ses.filters,
      points: ses.points,
      pct,
      correctCount,
      total,
      bestStreak: ses.bestStreak,
      isRecord,
      firstTime: ses.source === 'quiz' && store.progressFor(ses.quizId)?.plays === 1,
      items: ses.results.map((r) => ({ q: r.q, correct: r.correct, score: r.score, timeout: r.timeout })),
    });
    location.hash = '#/resultats';
  }

  /* --------------------------------------------------------------- Quitter */
  async function askQuit() {
    if (document.querySelector('dialog[open]')) return;
    sound.play('click');
    pauseTimer();
    const ok = await confirmDialog({
      title: 'Quitter la partie ?',
      text: 'Les réponses déjà données comptent dans tes statistiques, mais cette partie ne sera pas enregistrée comme terminée.',
      confirm: 'Quitter',
      cancel: 'Continuer la partie',
      danger: true,
    });
    if (ok) { endSession(null); location.hash = ses.quizId ? `#/quiz/${ses.quizId}` : '#/'; }
    else resumeTimer();
  }

  /* --------------------------------------------------------------- Clavier */
  function onKey(e) {
    if (document.querySelector('dialog[open]')) return;
    const t = e.target;
    const typing = t instanceof HTMLInputElement && (t.type === 'text' || t.type === 'search');
    if (e.key === 'Escape') { e.preventDefault(); askQuit(); return; }
    if (phase === 'feedback') {
      if (e.key === 'Enter' && !(t instanceof HTMLButtonElement)) { e.preventDefault(); next(); }
      return;
    }
    if (phase !== 'answer') return;
    if (e.key === 'Enter') {
      if (t instanceof HTMLButtonElement && !typing) return; // le bouton fait son travail
      if (validateBtn && ready) { e.preventDefault(); finish(validateBtn); }
      return;
    }
    if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
    if (comp.key?.(e.key)) e.preventDefault();
  }
  document.addEventListener('keydown', onKey);

  showQuestion();

  return () => {
    destroyed = true;
    cancelAnimationFrame(tRaf);
    monitor.destroy();
    document.removeEventListener('keydown', onKey);
  };
}
