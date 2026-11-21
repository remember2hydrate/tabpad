// Tab content as data, plus pure editing operations on an editor state.
// An editor state is { lines: Event[][], cursor: { line, index } }.
// cursor.index is the insert position; the event just before it is the "selected" one.

import { isStringKey, isValidFret } from './music.js';

export const REST_VALUES = Object.freeze(['_', 'ξ', 'j']);
export const REPEAT_VALUES = Object.freeze(['{', '}', 'x2', 'x3', 'x4']);

export const noteEvent = (frets) => ({ type: 'note', frets: { ...frets } });
export const barEvent = () => ({ type: 'bar' });
export const spaceEvent = () => ({ type: 'space' }); // empty column, for timing
export const restEvent = (value) => ({ type: 'rest', value });
export const repeatEvent = (value) => ({ type: 'repeat', value });

export function createEditorState(lines = [[]]) {
  const safeLines = lines.length > 0 ? lines.map((line) => [...line]) : [[]];
  const lastLine = safeLines.length - 1;
  return { lines: safeLines, cursor: { line: lastLine, index: safeLines[lastLine].length } };
}

function makeState(lines, cursor) {
  return { lines, cursor };
}

function replaceLine(lines, lineIndex, newLine) {
  return lines.map((line, index) => (index === lineIndex ? newLine : line));
}

export function insertEvent(state, event) {
  const { line, index } = state.cursor;
  const current = state.lines[line];
  const updated = [...current.slice(0, index), event, ...current.slice(index)];
  return makeState(replaceLine(state.lines, line, updated), { line, index: index + 1 });
}

function selectedEvent(state) {
  const { line, index } = state.cursor;
  return index > 0 ? state.lines[line][index - 1] : null;
}

function canJoinChord(event, stringKey) {
  return event?.type === 'note' && !(stringKey in event.frets);
}

export function addNote(state, stringKey, fret, { chord = false } = {}) {
  if (!isStringKey(stringKey)) throw new Error(`Unknown string "${stringKey}"`);
  if (!isValidFret(fret)) throw new Error(`Invalid fret ${fret}`);

  const previous = selectedEvent(state);
  if (!chord || !canJoinChord(previous, stringKey)) {
    return insertEvent(state, noteEvent({ [stringKey]: fret }));
  }
  const { line, index } = state.cursor;
  const merged = noteEvent({ ...previous.frets, [stringKey]: fret });
  const updated = state.lines[line].map((event, position) => (position === index - 1 ? merged : event));
  return makeState(replaceLine(state.lines, line, updated), state.cursor);
}

function mergeWithPreviousLine(state) {
  const { line } = state.cursor;
  const previousLine = state.lines[line - 1];
  const joined = [...previousLine, ...state.lines[line]];
  const lines = [...state.lines.slice(0, line - 1), joined, ...state.lines.slice(line + 1)];
  return makeState(lines, { line: line - 1, index: previousLine.length });
}

export function removeSelected(state) {
  const { line, index } = state.cursor;
  if (index === 0) {
    return line > 0 ? mergeWithPreviousLine(state) : state;
  }
  const updated = state.lines[line].filter((_, position) => position !== index - 1);
  return makeState(replaceLine(state.lines, line, updated), { line, index: index - 1 });
}

export function splitLine(state) {
  const { line, index } = state.cursor;
  const current = state.lines[line];
  const lines = [
    ...state.lines.slice(0, line),
    current.slice(0, index),
    current.slice(index),
    ...state.lines.slice(line + 1),
  ];
  return makeState(lines, { line: line + 1, index: 0 });
}

export function setCursor(state, line, index) {
  const safeLine = Math.min(Math.max(line, 0), state.lines.length - 1);
  const safeIndex = Math.min(Math.max(index, 0), state.lines[safeLine].length);
  return makeState(state.lines, { line: safeLine, index: safeIndex });
}

export function moveCursor(state, delta) {
  const { line, index } = state.cursor;
  const target = index + delta;
  if (target < 0 && line > 0) return setCursor(state, line - 1, state.lines[line - 1].length);
  if (target > state.lines[line].length && line < state.lines.length - 1) return setCursor(state, line + 1, 0);
  return setCursor(state, line, target);
}

export function isEmptyTab(lines) {
  return lines.every((line) => line.length === 0);
}

// Drops empty lines so saved tabs stay tidy; keeps one empty line for an empty tab.
export function compactLines(lines) {
  const kept = lines.filter((line) => line.length > 0);
  return kept.length > 0 ? kept : [[]];
}
