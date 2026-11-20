// Baglamas tuning and note naming. Strings are listed top line to bottom line of the tab.

export const MAX_FRET = 19;

export const STRINGS = Object.freeze([
  { key: 'd', label: 'D', open: 'D' }, // top course, most used
  { key: 'a', label: 'A', open: 'A' }, // middle course
  { key: 'D', label: 'D', open: 'D' }, // bass course, bottom line
]);

export const STRING_KEYS = STRINGS.map((string) => string.key);

const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

const GREEK_NAMES = Object.freeze({
  C: 'Ντο', 'C#': 'Ντο#', D: 'Ρε', 'D#': 'Ρε#', E: 'Μι', F: 'Φα',
  'F#': 'Φα#', G: 'Σολ', 'G#': 'Σολ#', A: 'Λα', 'A#': 'Λα#', B: 'Σι',
});

export function isStringKey(key) {
  return STRING_KEYS.includes(key);
}

export function isValidFret(fret) {
  return Number.isInteger(fret) && fret >= 0 && fret <= MAX_FRET;
}

function findString(stringKey) {
  const string = STRINGS.find((candidate) => candidate.key === stringKey);
  if (!string) throw new Error(`Unknown string "${stringKey}"`);
  return string;
}

export function noteAt(stringKey, fret) {
  if (!isValidFret(fret)) throw new Error(`Fret must be 0–${MAX_FRET}, got ${fret}`);
  const openIndex = CHROMATIC.indexOf(findString(stringKey).open);
  return CHROMATIC[(openIndex + fret) % CHROMATIC.length];
}

export function greekNoteAt(stringKey, fret) {
  return GREEK_NAMES[noteAt(stringKey, fret)];
}
