// Registre des types de questions.
// Pour créer un nouveau type : copier un fichier existant de ce dossier,
// l'adapter, puis l'ajouter ici. Chaque type fournit :
//   label        nom affiché ("QCM", "Calcul"…)
//   time         secondes par défaut en mode Défi
//   validate(q)  renvoie un message si la question est mal écrite, sinon null
//   hint(q)      petite consigne sous la question (facultatif)
//   mount(q, api) construit l'interface et renvoie { el, lock, reveal, focus, key? }
//   grade(q, réponse, composant) → { score: 0…1, note? }
//   answerText(q) bonne réponse en toutes lettres
import choice from './choice.js';
import truefalse from './truefalse.js';
import text from './text.js';
import number from './number.js';
import slider from './slider.js';
import range from './range.js';
import hotspot from './hotspot.js';
import label from './label.js';
import order from './order.js';
import match from './match.js';
import suffix from './suffix.js';
import cite from './cite.js';
import sort from './sort.js';

export const TYPES = { choice, truefalse, text, number, slider, range, hotspot, label, order, match, suffix, cite, sort };

export function getType(name) { return TYPES[name] || null; }
