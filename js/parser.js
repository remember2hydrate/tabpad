// Text input format, one tab line per text line, tokens separated by spaces:
//   d5  a0  D12     note on string d (top), a (middle), D (bass) at a fret
//   d5+a7           chord: several strings in one column
//   |               bar separator
//   _  ξ  j         rests (4/4, 2/4, 1/4)
//   {  }  x2 x3 x4  repeats

import { MAX_FRET, isStringKey, STRING_KEYS } from './music.js';
import { REST_VALUES, REPEAT_VALUES, noteEvent, barEvent, restEvent, repeatEvent } from './tab-model.js';

const NOTE_PATTERN = /^(.)(\d{1,2})$/u;

function parseNotePart(part) {
  const match = NOTE_PATTERN.exec(part);
  if (!match || !isStringKey(match[1])) {
    return { error: `"${part}" is not a note. Use d, a or D followed by a fret, e.g. d5` };
  }
  const fret = Number(match[2]);
  if (fret > MAX_FRET) return { error: `Fret ${fret} is above ${MAX_FRET}` };
  return { stringKey: match[1], fret };
}

function parseNoteToken(token) {
  const frets = {};
  for (const part of token.split('+')) {
    const parsed = parseNotePart(part);
    if (parsed.error) return { error: parsed.error };
    if (parsed.stringKey in frets) return { error: `String ${parsed.stringKey} appears twice in "${token}"` };
    frets[parsed.stringKey] = parsed.fret;
  }
  return { event: noteEvent(frets) };
}

export function parseToken(token) {
  if (token === '|') return { event: barEvent() };
  if (REST_VALUES.includes(token)) return { event: restEvent(token) };
  if (REPEAT_VALUES.includes(token)) return { event: repeatEvent(token) };
  return parseNoteToken(token);
}

export function parseText(text) {
  const lines = [];
  const errors = [];
  text.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const tokens = rawLine.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return;
    const events = [];
    for (const token of tokens) {
      const result = parseToken(token);
      if (result.error) errors.push({ line: lineIndex + 1, token, message: result.error });
      else events.push(result.event);
    }
    lines.push(events);
  });
  return { lines: lines.length > 0 ? lines : [[]], errors };
}

function serializeEvent(event) {
  switch (event.type) {
    case 'note':
      return STRING_KEYS.filter((key) => key in event.frets).map((key) => `${key}${event.frets[key]}`).join('+');
    case 'bar':
      return '|';
    default:
      return event.value;
  }
}

export function serializeText(lines) {
  return lines
    .filter((line) => line.length > 0)
    .map((line) => line.map(serializeEvent).join(' '))
    .join('\n');
}
