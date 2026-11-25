// Comptes : configuration du projet Firebase (voir README, « Comptes »).
// Tant que FIREBASE vaut null, le bouton Compte annonce que la connexion arrive bientôt
// et la progression reste sur l'appareil, comme avant.
//
// Une fois le projet créé, coller ici l'objet donné par la console Firebase, par exemple :
// export const FIREBASE = {
//   apiKey: 'AIza…',
//   authDomain: 'quizzoni-xxxx.firebaseapp.com',
//   projectId: 'quizzoni-xxxx',
//   appId: '1:…:web:…',
// };
// Ces valeurs ne sont pas secrètes : elles identifient le projet. La sécurité vient des règles
// Firestore (chacun ne peut lire et écrire que sa propre progression).
export const FIREBASE = {
  apiKey: 'AIzaSyCeRk9m174pGdA83fRKWVA8_ZAESXi4YOI',
  authDomain: 'quizzoni.firebaseapp.com',
  projectId: 'quizzoni',
  appId: '1:161186753643:web:97a27a5cec6a24c281552e',
};

// Moyens de connexion proposés, dans cet ordre. Chacun doit aussi être activé dans la console
// (Authentication > Sign-in method). Possibles : google, microsoft, github, facebook, twitter, yahoo, email.
export const PROVIDERS = ['google', 'email'];
