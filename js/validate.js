// Checks the shape of data/tabs.json and imported files. Returns a list of error messages.

import { STRING_KEYS, isValidFret } from './music.js';
import { REST_VALUES, REPEAT_VALUES } from './tab-model.js';

const TEXT_FIELDS = ['title', 'artist', 'genre', 'notes'];

function eventError(event) {
  switch (event?.type) {
    case 'note': {
      const keys = Object.keys(event.frets ?? {});
      if (keys.length === 0) return 'note without frets';
      const bad = keys.find((key) => !STRING_KEYS.includes(key) || !isValidFret(event.frets[key]));
      return bad ? `bad fret for string "${bad}"` : null;
    }
    case 'bar':
      return null;
    case 'rest':
      return REST_VALUES.includes(event.value) ? null : `unknown rest "${event.value}"`;
    case 'repeat':
      return REPEAT_VALUES.includes(event.value) ? null : `unknown repeat "${event.value}"`;
    default:
      return `unknown event type "${event?.type}"`;
  }
}

function tabErrors(tab, position) {
  const where = `tab #${position + 1}${tab?.title ? ` ("${tab.title}")` : ''}`;
  if (typeof tab?.id !== 'string' || tab.id === '') return [`${where}: missing id`];
  if (typeof tab.title !== 'string' || tab.title.trim() === '') return [`${where}: missing title`];
  const badField = TEXT_FIELDS.find((field) => field in tab && typeof tab[field] !== 'string');
  if (badField) return [`${where}: ${badField} must be text`];
  if (!Array.isArray(tab.lines) || !tab.lines.every(Array.isArray)) return [`${where}: lines must be a list of lists`];
  return tab.lines.flat().map(eventError).filter(Boolean).map((message) => `${where}: ${message}`);
}

export function validateLibraryFile(file) {
  if (!file || !Array.isArray(file.tabs)) return ['file must contain a "tabs" list'];
  const errors = file.tabs.flatMap(tabErrors);
  const ids = file.tabs.map((tab) => tab?.id);
  const duplicate = ids.find((id, index) => ids.indexOf(id) !== index);
  if (duplicate) errors.push(`duplicate id "${duplicate}"`);
  return errors;
}
