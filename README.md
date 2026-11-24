# Quizzoni

Site de révision pour les étudiants infirmiers de 2e année (IFSI de Bastia).
Quiz courts, 10 types de questions, 3 thèmes avec leurs propres sons, progression enregistrée dans le navigateur.

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
css/themes.css        polices + couleurs des 3 thèmes
css/base.css          touches en relief, champs, dialogues
css/home.css          accueil, boîtes 3D, page d'un quiz
css/play.css          partie, types de questions, résultats
js/main.js            démarrage et navigation
js/views/             écrans : accueil, notice, partie, résultats
js/types/             un fichier par type de question
js/audio.js           sons synthétisés (un pack par thème)
js/fx.js              confettis, secousse, tracé d'ECG
js/state.js           sauvegarde locale (records, erreurs, réglages)
data/catalog.json     rayons et liste des quiz
data/quizzes/*.json   les questions
assets/schemas/       images des questions (SVG, PNG, JPG…)
```

## Ajouter un quiz

1. Copier un fichier de `data/quizzes/`, par exemple `soins-urgence.json`, et le renommer (`mon-quiz.json`, sans espace ni accent).
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
```

Remarques :
- Les nombres s'écrivent avec un point dans le JSON (`2.5`) ; l'étudiant peut taper `2,5`.
- `choice` mélange les propositions ; `"shuffle": false` garde l'ordre (utile pour « Palier 1, 2, 3 »).
- `order` : écrire les étapes **dans le bon ordre**, le site les mélange.
- `slider` et `range` donnent une partie des points quand on est proche sans être dans la marge.

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

Trois thèmes : Officine (clair), Garde de nuit (sombre), Cap Corse. Chacun a ses couleurs (`css/themes.css`) et son pack de sons (`js/audio.js`), générés par le navigateur, sans fichier audio.

Pour ajouter un thème : copier un bloc `[data-theme="…"]` dans `css/themes.css`, ajouter le thème dans la liste `THEMES` de `js/ui.js`, et un pack du même nom dans `PACKS` de `js/audio.js`.

## Ajouter un type de question

Copier un fichier de `js/types/` (par exemple `truefalse.js`), l'adapter, puis l'ajouter dans `js/types/index.js`. Le haut de `index.js` décrit ce que chaque type doit fournir.

## Réglages d'une partie

Sur la page d'un quiz (la « notice »), avant de commencer :
- **Catégories** (si le quiz en a) : on coche les chapitres à réviser ;
- **Difficulté** : tous niveaux, facile, moyen ou difficile ;
- **Nombre de questions** : 10, 20, 30 ou toutes, tirées au hasard ;
- **Mode** : Entraînement ou Défi.

Le nombre de questions disponibles s'affiche à chaque choix, et les réglages sont mémorisés pour chaque quiz.

## Contenu

La boîte Pharmacologie reprend la fiche de révision pharmaco S3 (anticoagulants, anti-infectieux, cardio, asthme et BPCO, digestif, anti-inflammatoires, urologie, vaccins). Les questions ont été rédigées à partir des repères usuels de la formation (référentiel 2009, numéros d'UE indicatifs). Elles doivent être relues par des étudiants ou des formateurs avant une diffusion large : certaines valeurs varient selon les laboratoires et les protocoles des services.
