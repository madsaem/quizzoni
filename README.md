# Quizzoni

Site de révision pour les étudiants infirmiers de 2e année (IFSI de Bastia).
Quiz courts, 13 types de questions, 14 thèmes avec leurs propres sons, progression enregistrée dans le navigateur (et sur un compte, une fois les comptes activés).

Aucune installation, aucun framework : HTML, CSS et JavaScript.

**En ligne : https://madsaem.github.io/quizzoni/**

## Lancer le site en local

Le site doit passer par un petit serveur local (un double-clic sur `index.html` ne suffit pas).

- **Mac** : double-clic sur `start.command`, puis ouvrir http://localhost:8080 (s'ouvre tout seul).
  La première fois, si macOS bloque : clic droit sur le fichier, puis « Ouvrir ».
- **Windows** : double-clic sur `start.bat` (utilise PowerShell, déjà présent sur Windows).

## Le site en ligne

Le site est hébergé gratuitement par GitHub Pages, depuis le dépôt https://github.com/madsaem/quizzoni (branche `main`).

Pour mettre en ligne une modification (nouvelles questions, correction…) :

```
git add -A
git commit -m "Ce qui a changé"
git push
```

GitHub reconstruit le site tout seul : la nouvelle version est en ligne 1 à 2 minutes après. Si elle n'apparaît pas, recharger la page sans le cache (Cmd + Maj + R sur Mac, Ctrl + F5 sur Windows).

La progression des étudiants est enregistrée dans leur navigateur : une mise à jour du site ne l'efface pas.

## Organisation

```
index.html            page unique
css/themes.css        polices + couleurs des premiers thèmes
css/themes/           un fichier par thème ajouté (Automne, Scarlet, Gilded, Grunge, IFSI, David, Bazaar)
css/base.css          touches en relief, champs, dialogues
css/home.css          accueil, boîtes 3D, page d'un quiz
css/play.css          partie, types de questions, résultats
css/ambiances.css     fonds animés, contours et lueurs propres à certains thèmes
js/main.js            démarrage et navigation
js/views/             écrans : accueil, notice, partie, résultats
js/types/             un fichier par type de question
js/audio.js           sons synthétisés (un pack par thème)
js/sons.js            packs de sons des thèmes ajoutés
js/music.js           musique des thèmes (menu, victoire, défaite)
js/backdrop.js        fonds animés (ciel étoilé, étoiles et cœurs, hologramme)
js/fonds.js           fonds animés des thèmes ajoutés (feuilles, manoir, pièces, cave, drapeau, souk)
js/puffs.js           les deux puffs 3D du thème Mayuff (WebGL)
js/themefx.js         effets de réponse propres à un thème (fleurs, feuilles, pièces, couteaux, fond rose ou rouge)
js/compte.js          comptes : connexion et synchronisation de la progression
js/compte-config.js   configuration Firebase des comptes (à remplir, voir « Comptes »)
js/fx.js              confettis, secousse, tracé d'ECG
js/state.js           sauvegarde locale (records, erreurs, réglages)
data/catalog.json     rayons et liste des quiz
data/quizzes/*.json   les questions
assets/schemas/       images des questions (SVG, PNG, JPG…)
assets/mayuff/        photos des deux puffs du thème Mayuff (textures 3D et monogrammes)
assets/audio/         musiques des thèmes (voir « Thèmes et sons »)
assets/fonts/         polices (libres : licence OFL, voir les fichiers de licence)
```

## Ajouter un quiz

1. Copier un fichier de `data/quizzes/`, par exemple `calculs-de-doses.json`, et le renommer (`mon-quiz.json`, sans espace ni accent).
2. Ajouter `"mon-quiz"` dans la liste `quizzes` de `data/catalog.json`.
3. Remplir l'en-tête :

```json
{
  "title": "Soins d'urgence",
  "short": "Urgences",              // texte sur la tranche de la boîte
  "subtitle": "RCP, Glasgow, anaphylaxie",
  "ue": "UE 4.3",
  "badge": "S4",
  "shelf": "S4",                    // id d'un rayon de catalog.json
  "color": "c6",                    // c1 à c6 : suit le thème choisi
  "icon": "pill",                   // logo en filigrane : pill, lungs, virus, talk, vial, syringe (js/icons.js)
  "wip": "Texte affiché sur la notice", // facultatif : ruban « En construction » sur la boîte
  "description": "Texte de la notice.",
  "tags": ["mots", "pour", "la recherche"],
  "time": { "number": 90 },         // facultatif : secondes par type en mode Défi
  "categories": [                   // facultatif : chapitres à cocher avant la partie
    { "id": "anticoag", "title": "Anticoagulants" },
    { "id": "cardio", "title": "Cardiovasculaire" }
  ],
  "questions": [ ... ]
}
```

Les commentaires `//` ci-dessus sont là pour l'explication : un vrai fichier JSON n'en accepte pas.

Si une question est mal écrite, elle est ignorée et un bandeau jaune l'indique sur l'accueil ; le détail s'affiche dans la console du navigateur (F12).

## Les types de questions

Champs communs à toutes les questions : `type`, `prompt` (l'énoncé), `explain` (la correction, facultative mais conseillée), `time` (secondes en mode Défi, facultatif), `media` (une image au-dessus de l'énoncé : `{ "src": "assets/schemas/x.png", "alt": "description" }`).

`variants` : d'autres façons de poser **la même** question. À chaque tirage, le site choisit au hasard entre `prompt` et ses variantes (jamais deux fois de suite la même), pour qu'on ne reconnaisse pas une question à sa formulation. Ce n'est pas une nouvelle question : le compteur, les records et « Mes erreurs » ne changent pas. Chaque variante doit garder les mêmes données et la même réponse (pour un vrai/faux, la même vérité).

```json
{ "type": "truefalse", "prompt": "La théophylline a une marge thérapeutique étroite.",
  "variants": ["La zone thérapeutique de la théophylline est étroite.",
               "Entre dose efficace et dose toxique, la théophylline laisse peu de marge."],
  "answer": true }
```

Deux champs servent aux réglages de partie :
- `level` : difficulté, `1` (facile), `2` (moyen) ou `3` (difficile). Sans ce champ, la question est « moyenne ». Les questions moyennes rapportent 25 % de points en plus, les difficiles 50 %.
- `cat` : l'`id` d'une des `categories` du quiz. Obligatoire si le quiz a des catégories, sinon la question est ignorée.

```json
{ "cat": "anticoag", "level": 3, "type": "text", "prompt": "Antidote du dabigatran ?", "answers": ["Praxbind", "idarucizumab"] }
```

Deux champs facultatifs aident à faire évoluer une boîte :
- `id` : identifiant fixe (ex. `28-avc-01`). Sans lui, la question est reconnue par son énoncé : la reformuler la ferait sortir de la liste « Mes erreurs » des étudiants. Avec un `id`, on peut la réécrire librement.
- `src` : le document d'où vient la question (ex. `memo`), décrit dans la liste `sources` du quiz. Pratique pour repérer les recoupements quand un nouveau cours arrive.

Une question doit se comprendre seule : les questions sont tirées au hasard, celle d'avant n'est donc pas forcément affichée.

Mise en forme possible dans les textes : `**gras**`, `*italique*`, `O~2~` (indice), `m^2^` (exposant).

| Type | À quoi ça sert |
|---|---|
| `choice` | QCM de 2 à 6 propositions, une ou plusieurs bonnes réponses |
| `truefalse` | Vrai ou faux |
| `text` | Réponse à écrire, fautes de frappe tolérées |
| `number` | Calcul, avec unité et marge d'erreur |
| `slider` | Placer une valeur sur un curseur |
| `range` | Placer une fourchette (deux bornes) |
| `hotspot` | Cliquer au bon endroit d'une image |
| `label` | Légender un schéma |
| `order` | Remettre des étapes dans l'ordre |
| `match` | Associer deux colonnes |
| `suffix` | Des noms sans leur fin : écrire le suffixe commun (-pril, -olol…) |
| `cite` | Citer plusieurs éléments (« Cite 3 HBPM »), dans n'importe quel ordre |
| `sort` | Glisser des étiquettes dans 2 à 5 familles |

```json
{ "type": "choice", "prompt": "…", "options": ["A", "B", "C", "D"], "answer": 0 }
{ "type": "choice", "prompt": "…", "options": ["A", "B", "C"], "answer": [0, 2] }
{ "type": "truefalse", "prompt": "…", "answer": true }
{ "type": "text", "prompt": "…", "answers": ["nœud sinusal", "nœud sino-atrial"] }
{ "type": "text", "prompt": "…", "answers": ["15"], "match": "exact" }
{ "type": "number", "prompt": "…", "answer": 41.67, "tolerance": 1, "unit": "gouttes/min",
  "answerText": "environ 42 gouttes/min" }
{ "type": "slider", "prompt": "…", "min": 80, "max": 100, "step": 1, "answer": 95,
  "tolerance": 1, "unit": "%" }
{ "type": "range", "prompt": "…", "min": 2, "max": 7, "step": 0.1, "answer": [3.5, 5.0],
  "tolerance": 0.2, "unit": "mmol/L" }
{ "type": "order", "prompt": "…", "items": ["Étape 1", "Étape 2", "Étape 3"] }
{ "type": "match", "prompt": "…", "left": "Médicament", "right": "Antidote",
  "pairs": [["AVK", "Vitamine K"], ["Morphine", "Naloxone"]] }
{ "type": "suffix", "prompt": "…", "words": ["Ramipril", "Périndopril", "Énalapril"], "suffix": "pril" }
{ "type": "cite", "prompt": "Cite 3 HBPM.", "need": 3,
  "answers": [["énoxaparine", "Lovenox"], ["tinzaparine", "Innohep"], "daltéparine"] }
{ "type": "sort", "prompt": "…", "groups": [
    { "name": "IEC", "items": ["Ramipril", "Périndopril"] },
    { "name": "ARA II", "items": ["Losartan", "Valsartan"] } ] }
```

Remarques :
- Les nombres s'écrivent avec un point dans le JSON (`2.5`) ; l'étudiant peut taper `2,5`.
- `choice` mélange les propositions ; `"shuffle": false` garde l'ordre (utile pour « Palier 1, 2, 3 »).
- `order` : écrire les étapes **dans le bon ordre**, le site les mélange.
- `slider` et `range` donnent une partie des points quand on est proche sans être dans la marge.
- `suffix` : chaque mot de `words` doit finir par `suffix` ; le site affiche le début du mot et l'étudiant écrit la fin.
- `cite` : un élément peut avoir des synonymes (`["énoxaparine", "Lovenox"]`) qui ne comptent qu'une fois. Sans `need`, il faut tout citer. Les fautes de frappe sont tolérées, sauf sur la première lettre.
- `sort` : on glisse les étiquettes à la souris ou au doigt, ou on touche une étiquette puis sa zone (au clavier : chiffres 1 à 5). Entre 4 et 24 étiquettes.
- QCM à plusieurs réponses : le nombre de bonnes réponses s'affiche au-dessus des propositions.

### Questions sur image

Les positions sont en **pourcentage** de l'image (0 à 100, depuis le coin haut gauche), donc elles restent justes quelle que soit la taille de l'écran.

```json
{
  "type": "hotspot",
  "prompt": "Clique sur le ventricule gauche.",
  "image": "assets/schemas/coeur.svg",
  "alt": "Schéma du cœur vu de face, sans légende",
  "zones": [
    { "id": "vg", "label": "le ventricule gauche", "shape": "rect", "x": 52.5, "y": 56.4, "w": 34, "h": 37 },
    { "id": "od", "label": "l'oreillette droite", "shape": "circle", "x": 33, "y": 45, "r": 12 }
  ],
  "answer": "vg"
}
```

- `rect` : `x`, `y` = coin haut gauche, `w`, `h` = largeur et hauteur. `circle` : `x`, `y` = centre, `r` = rayon (en % de la largeur).
- `answer` peut être une liste (`["qrs1", "qrs2"]`) quand plusieurs zones sont justes.
- Les zones qui ne sont pas la réponse servent à dire à l'étudiant où il a cliqué (« Ton repère est sur : … »).

```json
{
  "type": "label",
  "prompt": "Légende le schéma du cœur.",
  "image": "assets/schemas/coeur.svg",
  "pins": [ { "x": 33, "y": 45.5, "answer": "Oreillette droite" } ],
  "distractors": ["Veine porte"]
}
```

Pour trouver les coordonnées d'un point : ouvrir l'image dans un logiciel qui affiche la position de la souris, puis diviser par la largeur (ou la hauteur) de l'image et multiplier par 100.

## Thèmes et sons

Quatorze thèmes, choisis avec le bouton **Thèmes** en haut à droite :

- **Officine** (clair), **Garde de nuit** (sombre), **Contraste élevé** (noir, contours jaunes et blancs), **Nuit étoilée** (ciel animé) ;
- **Pinksoni** : rose, étoiles filantes qui éclatent en cœurs, fleurs qui éclosent sur les bonnes réponses ;
- **Mayuff** : deux puffs en 3D (WebGL, cernées de noir), fumée dans les touches, fond rose ou rouge selon la réponse ;
- **Warfare** : hologramme vert, police façon Bank Gothic, musique de menu, de victoire et de défaite ;
- **Automne** : soleil bas, arbres roux, feuilles qui tombent, boutons en tricot jacquard, feuilles qui jaillissent des bonnes réponses ;
- **Scarlet** : manoir écarlate sous une lune de sang, chauves-souris, lance rouge qui traverse le ciel, arrêt du temps avec couteaux d'argent ;
- **Gilded** : cuir frappé d'un monogramme doré et irisé, boutons cousus aux rivets dorés, pièces d'or ;
- **Grunge** : cave rouillée, ampoule qui grésille, toiles d'araignée, tôle larmée sur les boutons, bruit de fond inquiétant ;
- **IFSI** : feuille d'écolier à carreaux Seyès, titres manuscrits, boutons de site des années 2000 ;
- **David** : drapeau bleu et blanc qui flotte en fond, Hava Nagila au menu ;
- **Bazaar** : souk en grès, arcades, lanternes, enseignes en arabe, boutons en zellige, musique à l'oud et au darbouka.

Chacun a ses couleurs (`css/themes.css` ou `css/themes/<thème>.css`), parfois un décor animé (`js/backdrop.js`, `js/fonds.js`) et son pack de sons (`js/audio.js`, `js/sons.js`), générés par le navigateur.

Pour ajouter un thème : copier un fichier de `css/themes/` et le lier dans `index.html`, ajouter le thème dans la liste `THEMES` de `js/ui.js`, et un pack de sons du même nom dans `js/sons.js`.

Musiques : Warfare (fichiers fournis), David (Hava Nagila, enregistrement du domaine public venant de Wikimedia Commons), Grunge et Bazaar (composées par le navigateur), Scarlet (en attente d'un fichier : le déposer dans `assets/audio/scarlet/` et écrire son nom dans `pistes.json`). Chaque thème musical a son `assets/audio/<thème>/pistes.json`.

### Musique du thème Warfare

Le thème Warfare joue une musique sur les menus (Opening Titles), se tait pendant la partie, puis joue un extrait de victoire (Extraction Point, de 2:20 à 2:34 avec fondu, à partir de 50 % de réussite) ou de défaite (Mission Failed). Elles se coupent dans Réglages (« Musique des thèmes ») ou avec le bouton son. Sans fichier, des musiques composées par le navigateur prennent le relais.

Les fichiers publiés sont des versions préparées (`menu.mp3`, `victoire.mp3`, `defaite.mp3`) ; les originaux restent dans `assets/audio/warfare/originaux/`, ignoré par git. Pour changer de fichier, le déposer dans `assets/audio/warfare/` puis écrire son nom dans `assets/audio/warfare/pistes.json` :

```json
"menu":     { "fichier": "menu.mp3", "volume": 0.5 },
"victoire": { "fichier": "victoire.mp3", "debut": 0, "duree": 0, "volume": 0.8 },
"defaite":  { "fichier": "defaite.mp3", "debut": 0, "duree": 0, "volume": 0.8 }
```

- `debut` : la seconde à laquelle commencer (pour partir directement du refrain, par exemple).
- `duree` : combien de secondes jouer avant le fondu (0 = jusqu'à la fin).
- La rubrique `sons` remplace les bruitages : `"click": "clic.wav"`, `"correct": "…"`, `"wrong": "…"`, `"select": "…"`, `"whoosh": "…"`.

Le dépôt GitHub et le site sont publics : tout fichier poussé dans `assets/audio/` est téléchargeable. Pour qu'un fichier reste sur ton ordinateur, ajoute son nom dans `.gitignore` : il jouera en local mais ne sera pas envoyé en ligne.

## Comptes

Le bouton **Compte** en haut à droite permet de se connecter (Google, Microsoft, GitHub, e-mail et mot de passe…) pour retrouver sa progression sur tous ses appareils. Seuls les résultats partent en ligne : records, erreurs à revoir, statistiques, boîtes déjà ouvertes. Les réglages restent propres à chaque appareil.

Tant que les comptes ne sont pas activés, le bouton annonce qu'ils arrivent bientôt. Pour les activer (gratuit, une dizaine de minutes) :

1. Sur https://console.firebase.google.com, créer un projet (par exemple `quizzoni`), sans Google Analytics.
2. **Authentication** > Commencer > Sign-in method : activer **Google** et **Adresse e-mail/Mot de passe**. Microsoft, GitHub, Facebook demandent en plus de créer une application chez eux (la console explique quoi copier).
3. **Authentication** > Settings > Domaines autorisés : ajouter `madsaem.github.io`.
4. **Firestore Database** > Créer une base (mode production, région Europe), puis onglet Règles, coller et publier :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /progression/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow write: if request.auth != null && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['data', 'updatedAt'])
        && request.resource.data.data is string
        && request.resource.data.data.size() < 500000;
    }
  }
}
```

5. Paramètres du projet > Vos applications > icône web `</>` : enregistrer l'application, copier l'objet `firebaseConfig` dans `js/compte-config.js` (constante `FIREBASE`), et ajuster la liste `PROVIDERS` selon les moyens de connexion activés.
6. Pousser sur GitHub : le bouton Compte propose alors la connexion.

## Ajouter un type de question

Copier un fichier de `js/types/` (par exemple `truefalse.js`), l'adapter, puis l'ajouter dans `js/types/index.js`. Le haut de `index.js` décrit ce que chaque type doit fournir.

## Réglages d'une partie

Sur la page d'un quiz (la « notice »), avant de commencer :
- **Catégories** (si le quiz en a) : on coche les chapitres à réviser ;
- **Types de questions** (si la boîte en a plusieurs) : on garde seulement les types voulus (QCM, vrai ou faux…). Les compteurs tiennent compte des catégories et de la difficulté choisies ;
- **Difficulté** : tous niveaux, facile, moyen ou difficile ;
- **Nombre de questions** : 10, 20, 30, toutes, ou un nombre au choix (« Autre »), tirées au hasard ;
- **Mode** : Entraînement ou Défi.

Le nombre de questions disponibles s'affiche à chaque choix, et les réglages sont mémorisés pour chaque quiz.

## Contenu

Rayon **Semestre 3** : Pharmacologie (UE 2.11), Processus obstructifs (UE 2.8), Processus infectieux (UE 2.5, en construction : VIH pour l'instant), Soins éducatifs et préventifs (UE 4.6, en construction : éducation thérapeutique pour l'instant). Rayon **Spécialisées** : Valeurs normales et Calculs de doses.

La boîte Pharmacologie reprend la fiche de révision pharmaco S3 (anticoagulants, anti-infectieux, cardio, asthme et BPCO, digestif, anti-inflammatoires, urologie, vaccins). Quelques questions vont au-delà de la fiche (statines, antifongiques, types de vaccins) : elles portent `"src": "complement"`. Les questions ont été rédigées à partir des repères usuels de la formation (référentiel 2009, numéros d'UE indicatifs). Elles doivent être relues par des étudiants ou des formateurs avant une diffusion large : certaines valeurs varient selon les laboratoires et les protocoles des services.
