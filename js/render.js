// Turns tab events into aligned plain-text tablature.
// Each event becomes a "column": one cell per string, all cells the same width.

import { STRINGS, greekNoteAt } from './music.js';

export const FORMATS = Object.freeze({ numbers: 'numbers', greek: 'greek' });

const FILLER = '-';
const GAP = '--';

function cellForString(event, stringKey, format) {
  if (!(stringKey in event.frets)) return '';
  const fret = event.frets[stringKey];
  return format === FORMATS.greek ? greekNoteAt(stringKey, fret) : String(fret);
}

function rawCells(event, format) {
  switch (event.type) {
    case 'note':
      return STRINGS.map((string) => cellForString(event, string.key, format));
    case 'bar':
      return STRINGS.map(() => '|');
    case 'space':
      return STRINGS.map(() => '');
    case 'rest':
      return [event.value, '', ''];
    case 'repeat':
      return event.value.startsWith('x') ? [event.value, '', ''] : STRINGS.map(() => event.value);
    default:
      throw new Error(`Unknown event type "${event.type}"`);
  }
}

export function renderColumn(event, format = FORMATS.numbers) {
  const cells = rawCells(event, format);
  const width = Math.max(1, ...cells.map((cell) => cell.length));
  return cells.map((cell) => cell.padEnd(width, FILLER));
}

export function renderLine(events, format = FORMATS.numbers) {
  const columns = events.map((event) => renderColumn(event, format));
  return STRINGS.map((string, row) => {
    const body = columns.map((column) => GAP + column[row]).join('');
    return `${string.label}${FILLER}${body}${GAP}`;
  });
}

export function renderTab(lines, format = FORMATS.numbers) {
  return lines
    .filter((line) => line.length > 0)
    .map((line) => renderLine(line, format).join('\n'))
    .join('\n\n');
}

export function renderTabDocument(tab, format = FORMATS.numbers) {
  const header = [tab.title, tab.artist && `Artist: ${tab.artist}`, tab.genre && `Genre: ${tab.genre}`]
    .filter(Boolean)
    .join('\n');
  const notes = tab.notes ? `\n\n${tab.notes}` : '';
  return `${header}${notes}\n\n${renderTab(tab.lines, format)}\n`;
}
