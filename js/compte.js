// Comptes : connexion (Google, Microsoft, GitHub, e-mail…) et synchronisation de la progression.
// Firebase Authentication pour la connexion, Firestore (API REST) pour stocker un seul document
// par personne : progression/<uid> = { data: progression en JSON, updatedAt }.
// Firebase n'est chargé que si on ouvre la fenêtre Compte ou si on est déjà connecté sur cet appareil.
import { FIREBASE, PROVIDERS } from './compte-config.js';
import * as store from './state.js';
import { h } from './utils.js';
import { sound } from './audio.js';
import { toast } from './ui.js';

const CDN = 'https://www.gstatic.com/firebasejs/13.4.0';
const FLAG = 'quizzoni:compte';   // présent quand un compte est connecté sur cet appareil

let fb = null;                    // { auth, m } une fois Firebase chargé
let user = null;
let state = 'idle';               // idle, sync, ok, error
let lastSync = 0;
let timer = 0;

export const configured = () => !!(FIREBASE && FIREBASE.apiKey && FIREBASE.projectId);
export const currentUser = () => user;

const PROVIDER_INFO = {
  google: { label: 'Google', make: (m) => new m.GoogleAuthProvider() },
  microsoft: { label: 'Microsoft', make: (m) => new m.OAuthProvider('microsoft.com') },
  github: { label: 'GitHub', make: (m) => new m.GithubAuthProvider() },
  facebook: { label: 'Facebook', make: (m) => new m.FacebookAuthProvider() },
  twitter: { label: 'X (Twitter)', make: (m) => new m.TwitterAuthProvider() },
  yahoo: { label: 'Yahoo', make: (m) => new m.OAuthProvider('yahoo.com') },
};

const ERRORS = {
  'auth/invalid-credential': 'E-mail ou mot de passe incorrect.',
  'auth/wrong-password': 'E-mail ou mot de passe incorrect.',
  'auth/user-not-found': 'Aucun compte avec cet e-mail. Crée-le avec « Créer un compte ».',
  'auth/email-already-in-use': 'Un compte existe déjà avec cet e-mail : connecte-toi.',
  'auth/weak-password': 'Mot de passe trop court : 6 caractères minimum.',
  'auth/invalid-email': 'Cette adresse e-mail n\'est pas valide.',
  'auth/missing-password': 'Écris ton mot de passe.',
  'auth/too-many-requests': 'Trop d\'essais. Réessaie dans quelques minutes.',
  'auth/network-request-failed': 'Pas de connexion internet.',
  'auth/operation-not-allowed': 'Ce moyen de connexion n\'est pas encore activé sur le site.',
  'auth/configuration-not-found': 'La connexion n\'est pas encore activée sur le site. Réessaie un peu plus tard.',
  'auth/unauthorized-domain': 'Ce site n\'est pas encore autorisé dans Firebase (domaines autorisés).',
  'auth/account-exists-with-different-credential': 'Cet e-mail est déjà lié à un autre moyen de connexion : utilise celui-là.',
};
const errText = (e) => ERRORS[e?.code] || 'La connexion a échoué. Réessaie.';

/* --------------------------------------------------------------- Firebase */
async function sdk() {
  if (fb) return fb;
  const [app, m] = await Promise.all([import(`${CDN}/firebase-app.js`), import(`${CDN}/firebase-auth.js`)]);
  const auth = m.getAuth(app.initializeApp(FIREBASE));
  auth.languageCode = 'fr';
  fb = { auth, m };
  m.onAuthStateChanged(auth, onUser);
  return fb;
}

async function onUser(u) {
  user = u;
  if (u) {
    localStorage.setItem(FLAG, '1');
    await pull();
  } else {
    localStorage.removeItem(FLAG);
    state = 'idle';
  }
  refresh();
}

/* ------------------------------------------------------- Synchronisation */
const docUrl = () => `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents/progression/${user.uid}`;
async function api(method, body) {
  const token = await user.getIdToken();
  const url = method === 'PATCH' ? `${docUrl()}?updateMask.fieldPaths=data&updateMask.fieldPaths=updatedAt` : docUrl();
  return fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/** Récupère la progression du compte et la fusionne avec celle de l'appareil. */
async function pull() {
  if (!user) return;
  state = 'sync'; refresh();
  try {
    const res = await api('GET');
    let remote = null;
    if (res.ok) remote = JSON.parse((await res.json()).fields?.data?.stringValue || 'null');
    else if (res.status !== 404) throw new Error(`lecture : ${res.status}`);
    const changed = store.mergeProgress(remote, user.uid);
    if (changed) await push();
    else { state = 'ok'; lastSync = Date.now(); }
    document.dispatchEvent(new CustomEvent('progressreset'));   // l'écran affiché se met à jour
  } catch (e) {
    console.warn('Compte : synchronisation impossible', e);
    state = 'error';
  }
  refresh();
}

async function push() {
  if (!user) return;
  state = 'sync'; refresh();
  try {
    const res = await api('PATCH', {
      fields: {
        data: { stringValue: JSON.stringify(store.progressSnapshot()) },
        updatedAt: { integerValue: String(Date.now()) },
      },
    });
    if (!res.ok) throw new Error(`écriture : ${res.status}`);
    store.markSynced(user.uid);
    state = 'ok';
    lastSync = Date.now();
  } catch (e) {
    console.warn('Compte : envoi impossible', e);
    state = 'error';   // les changements restent marqués « en attente » et repartiront plus tard
  }
  refresh();
}

/** Après chaque changement de progression : envoi groupé quelques secondes plus tard. */
function schedule() {
  if (!user || !store.syncState().dirty) return;
  clearTimeout(timer);
  timer = setTimeout(push, 2500);
}

/* ------------------------------------------------------------ Démarrage */
export function initAccount() {
  if (!configured()) return;
  store.onChange(schedule);
  if (localStorage.getItem(FLAG)) sdk().catch((e) => console.warn('Compte : Firebase indisponible', e));
  // en revenant sur l'onglet, on récupère ce qui a pu changer ailleurs
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && user && Date.now() - lastSync > 60000) pull();
  });
  window.addEventListener('online', () => { if (user && store.syncState().dirty) push(); });
}

/* ------------------------------------------------------- Bouton du haut */
const listeners = new Set();
function refresh() { listeners.forEach((fn) => fn()); }
export function onAccountChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

export function accountButtonLabel() {
  if (!user) return 'Compte';
  const name = user.displayName || user.email || 'Compte';
  return name.split(/[\s@]/)[0].slice(0, 14);
}

/* --------------------------------------------------------------- Fenêtre */
export function openAccount() {
  const dlg = h('dialog', { class: 'dialog dialog--account', 'aria-labelledby': 'acc-title' });
  const body = h('div', { class: 'account' });
  const close = () => { off(); dlg.close(); dlg.remove(); };
  const off = onAccountChange(() => render());

  function render() {
    if (!configured()) {
      body.replaceChildren(
        h('p', { class: 'dialog__lead' }, 'Bientôt : un compte pour retrouver tes records et tes erreurs à revoir sur tous tes appareils.'),
        h('p', { class: 'account__note' }, 'En attendant, ta progression est enregistrée sur cet appareil.'));
      return;
    }
    if (!fb) {
      body.replaceChildren(h('p', { class: 'dialog__lead' }, 'Chargement…'));
      sdk().then(render, () => body.replaceChildren(h('p', { class: 'account__msg account__msg--bad' }, 'Connexion impossible pour l\'instant. Vérifie ta connexion internet.')));
      return;
    }
    body.replaceChildren(...(user ? signedIn() : signedOut()));
  }

  function signedIn() {
    const name = user.displayName || user.email || 'Ton compte';
    const when = lastSync ? new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(lastSync) : '';
    const status = {
      sync: 'Synchronisation…',
      ok: `Progression synchronisée${when ? ` à ${when}` : ''}.`,
      error: 'Synchronisation impossible pour l\'instant : tes changements sont gardés et repartiront plus tard.',
      idle: '',
    }[state];
    return [
      h('div', { class: 'account__who' },
        user.photoURL
          ? h('img', { class: 'account__avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
          : h('span', { class: 'account__avatar', 'aria-hidden': 'true' }, name.slice(0, 1).toUpperCase()),
        h('div', {}, h('b', {}, name), user.email && user.displayName ? h('small', {}, user.email) : null)),
      pseudoForm(),
      h('p', { class: `account__msg${state === 'error' ? ' account__msg--bad' : ''}`, role: 'status' }, status),
      h('p', { class: 'account__note' }, 'Enregistré sur ton compte : records, erreurs à revoir, statistiques. Tes réglages (thème, son) restent propres à chaque appareil.'),
      h('div', { class: 'dialog__actions', style: { justifyContent: 'space-between' } },
        h('button', { type: 'button', class: 'key key--ghost key--sm', onClick: async () => { sound.play('click'); clearTimeout(timer); if (store.syncState().dirty) await push(); await fb.m.signOut(fb.auth); store.unlinkAccount(); toast('Déconnecté. Ta progression reste aussi sur cet appareil.'); } }, 'Se déconnecter'),
        h('button', { type: 'button', class: 'key key--sm', onClick: () => { sound.play('click'); pull(); } }, 'Synchroniser')),
    ];
  }

  /** Changer de pseudonyme (nom affiché sur le bouton du haut et dans cette fenêtre). */
  function pseudoForm() {
    const input = h('input', { class: 'field', type: 'text', maxlength: 30, value: user.displayName || '', placeholder: 'Ton pseudo', 'aria-label': 'Pseudonyme', autocomplete: 'nickname' });
    const save = async (e) => {
      e.preventDefault();
      const name = input.value.trim().slice(0, 30);
      if (!name || name === user.displayName) return;
      sound.play('click');
      try { await fb.m.updateProfile(user, { displayName: name }); toast(`Pseudo changé : ${name}`); refresh(); }
      catch (err) { toast(errText(err)); }
    };
    return h('form', { class: 'account__pseudo', onSubmit: save },
      h('label', { class: 'account__label' }, 'Pseudo', input),
      h('button', { type: 'submit', class: 'key key--ghost key--sm' }, 'Changer'));
  }

  function signedOut() {
    const msg = h('p', { class: 'account__msg', role: 'alert' });
    const fail = (e) => { if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') { msg.textContent = errText(e); msg.className = 'account__msg account__msg--bad'; } };
    const social = PROVIDERS.filter((p) => PROVIDER_INFO[p]).map((p) => h('button', {
      type: 'button', class: `key account__provider account__provider--${p}`,
      onClick: async () => {
        sound.play('click');
        const provider = PROVIDER_INFO[p].make(fb.m);
        try { await fb.m.signInWithPopup(fb.auth, provider); toast('Connecté : ta progression est synchronisée.'); }
        catch (e) {
          if (e?.code === 'auth/popup-blocked') fb.m.signInWithRedirect(fb.auth, provider);
          else fail(e);
        }
      },
    }, h('span', { class: 'account__logo', 'aria-hidden': 'true' }, PROVIDER_INFO[p].label.slice(0, 1)), `Continuer avec ${PROVIDER_INFO[p].label}`));

    let form = null;
    if (PROVIDERS.includes('email')) {
      const email = h('input', { class: 'field', type: 'email', autocomplete: 'email', placeholder: 'ton.adresse@mail.fr', 'aria-label': 'E-mail', required: true });
      const pass = h('input', { class: 'field', type: 'password', autocomplete: 'current-password', placeholder: 'Mot de passe (6 caractères min.)', 'aria-label': 'Mot de passe', minlength: 6 });
      const run = (fn) => async (e) => {
        e?.preventDefault?.();
        sound.play('click');
        msg.textContent = ''; msg.className = 'account__msg';
        try { await fn(); } catch (err) { fail(err); }
      };
      form = h('form', { class: 'account__form', onSubmit: run(() => fb.m.signInWithEmailAndPassword(fb.auth, email.value.trim(), pass.value)) },
        email, pass,
        h('div', { class: 'account__row' },
          h('button', { type: 'submit', class: 'key key--sm' }, 'Se connecter'),
          h('button', { type: 'button', class: 'key key--ghost key--sm', onClick: run(() => fb.m.createUserWithEmailAndPassword(fb.auth, email.value.trim(), pass.value)) }, 'Créer un compte'),
          h('button', {
            type: 'button', class: 'linkbtn',
            onClick: run(async () => {
              if (!email.value.trim()) { msg.textContent = 'Écris d\'abord ton e-mail.'; return; }
              await fb.m.sendPasswordResetEmail(fb.auth, email.value.trim());
              msg.textContent = 'E-mail envoyé : suis le lien pour choisir un nouveau mot de passe.';
            }),
          }, 'Mot de passe oublié ?')));
    }
    return [
      h('p', { class: 'dialog__lead' }, 'Connecte-toi pour retrouver tes records et tes erreurs à revoir sur tous tes appareils.'),
      social.length ? h('div', { class: 'account__providers' }, social) : null,
      form && social.length ? h('p', { class: 'account__or' }, h('span', {}, 'ou avec ton e-mail')) : null,
      form,
      msg,
      h('p', { class: 'account__note' }, 'Seuls tes résultats sont enregistrés : records, erreurs à revoir, statistiques. Ce que tu as fait sur cet appareil est ajouté à ton compte.'),
    ];
  }

  dlg.append(h('div', { class: 'dialog__inner' },
    h('h2', { id: 'acc-title' }, 'Compte'),
    body,
    h('div', { class: 'dialog__actions' }, h('button', { type: 'button', class: 'key key--ghost key--sm', onClick: () => { sound.play('click'); close(); } }, 'Fermer'))));
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dlg.addEventListener('click', (e) => { if (e.target === dlg) close(); });
  document.body.append(dlg);
  render();
  dlg.showModal();
}

