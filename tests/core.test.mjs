import { test } from 'node:test';
import assert from 'node:assert/strict';

import { noteAt, greekNoteAt } from '../js/music.js';
import {
  createEditorState, addNote, removeSelected, splitLine, insertEvent, barEvent, moveCursor,
} from '../js/tab-model.js';
import { renderLine, renderTab, FORMATS } from '../js/render.js';
import { parseText, serializeText } from '../js/parser.js';
import { createKeyboardInput } from '../js/keyboard.js';
import { validateLibraryFile } from '../js/validate.js';

// music
test('open d string is D', () => assert.equal(noteAt('d', 0), 'D'));
test('middle string fret 3 is C', () => assert.equal(noteAt('a', 3), 'C'));
test('fret 12 wraps to the octave', () => assert.equal(noteAt('D', 12), 'D'));
test('greek name for d fret 1 is Ρε#', () => assert.equal(greekNoteAt('d', 1), 'Ρε#'));
test('fret above 19 is rejected', () => assert.throws(() => noteAt('d', 20)));

// model
const twoNotes = () => addNote(addNote(createEditorState(), 'd', 0), 'a', 2);

test('notes outside chord mode make separate columns', () => assert.equal(twoNotes().lines[0].length, 2));
test('chord mode stacks a new string into the previous column', () => {
  const state = addNote(addNote(createEditorState(), 'd', 5), 'a', 7, { chord: true });
  assert.deepEqual(state.lines[0][0].frets, { d: 5, a: 7 });
});
test('chord mode on a used string starts a new column', () => {
  const state = addNote(addNote(createEditorState(), 'd', 5), 'd', 7, { chord: true });
  assert.equal(state.lines[0].length, 2);
});
test('remove deletes the event before the cursor', () => {
  assert.deepEqual(removeSelected(twoNotes()).lines[0][0].frets, { d: 0 });
});
test('split line moves events after the cursor to a new line', () => {
  const state = splitLine(moveCursor(twoNotes(), -1));
  assert.equal(state.lines[1].length, 1);
});
test('remove at line start merges with the previous line', () => {
  const state = removeSelected(splitLine(moveCursor(twoNotes(), -1)));
  assert.equal(state.lines.length, 1);
});
test('insert places event at the cursor', () => {
  const state = insertEvent(moveCursor(twoNotes(), -1), barEvent());
  assert.equal(state.lines[0][1].type, 'bar');
});

// render
test('renders numbers like the existing site format', () => {
  const lines = parseText('d0 d0 a2').lines[0];
  assert.deepEqual(renderLine(lines), ['D---0--0-----', 'A---------2--', 'D------------']);
});
test('renders greek names padded to equal width', () => {
  const line = parseText('d1 a3').lines[0];
  assert.deepEqual(renderLine(line, FORMATS.greek), ['D---Ρε#-------', 'A--------Ντο--', 'D-------------']);
});
test('two-digit frets widen the whole column', () => {
  assert.deepEqual(renderLine(parseText('d12+a5').lines[0]), ['D---12--', 'A---5---', 'D-------']);
});
test('bar renders on every string', () => {
  assert.deepEqual(renderLine(parseText('|').lines[0]), ['D---|--', 'A---|--', 'D---|--']);
});
test('lines are separated by a blank line', () => {
  assert.equal(renderTab(parseText('d0\nd2').lines).split('\n').length, 7);
});

// parser
test('parses chords, rests and repeats', () => {
  assert.equal(parseText('{ d5+a7 _ | } x2').lines[0].length, 6);
});
test('reports unknown tokens instead of skipping them', () => {
  assert.equal(parseText('d5 q3').errors[0].token, 'q3');
});
test('rejects fret 20', () => assert.equal(parseText('d20').errors.length, 1));
test('serialize then parse round-trips', () => {
  const text = 'd0 a2+D0 | ξ x3\nD12';
  assert.equal(serializeText(parseText(text).lines), text);
});

// keyboard
function typeKeys(keys) {
  const notes = [];
  const commands = [];
  const keyboard = createKeyboardInput({
    onNote: (stringKey, fret) => notes.push(`${stringKey}${fret}`),
    onCommand: (command) => commands.push(command),
    onPendingChange: () => {},
    onError: () => {},
  });
  keys.forEach((key) => keyboard.handleKey(key));
  return { notes, commands };
}

test('d then 5 commits immediately', () => assert.deepEqual(typeKeys(['d', '5']).notes, ['d5']));
test('a then 1 then 2 commits fret 12', () => assert.deepEqual(typeKeys(['a', '1', '2']).notes, ['a12']));
test('D then 1 then Shift commits fret 1', () => assert.deepEqual(typeKeys(['D', '1', 'Shift']).notes, ['D1']));
test('Shift before D keeps the pending note', () => assert.deepEqual(typeKeys(['d', '1', 'Shift', 'D', '3']).notes, ['d1', 'D3']));
test('Space commits the pending fret then adds a space', () => assert.deepEqual(typeKeys(['d', '1', ' ']).commands, ['space']));
test('space renders as an empty column on every string', () => {
  assert.deepEqual(renderLine(parseText('d0 - d2').lines[0]), ['D---0-----2--', 'A------------', 'D------------']);
});
test('space round-trips through text', () => assert.equal(serializeText(parseText('d0 - a2').lines), 'd0 - a2'));
test('greek layout δ maps to d', () => assert.deepEqual(typeKeys(['δ', '3']).notes, ['d3']));
test('1 then 9 commits fret 19', () => assert.deepEqual(typeKeys(['d', '1', '9']).notes, ['d19']));
test('Backspace with nothing pending removes', () => assert.deepEqual(typeKeys(['Backspace']).commands, ['remove']));
test('Backspace with a pending string cancels it', () => assert.deepEqual(typeKeys(['d', 'Backspace']).commands, []));

// validate
test('valid file has no errors', () => {
  assert.deepEqual(validateLibraryFile({ tabs: [{ id: 'a', title: 'T', lines: [[{ type: 'bar' }]] }] }), []);
});
test('duplicate ids are reported', () => {
  const tab = { id: 'a', title: 'T', lines: [] };
  assert.equal(validateLibraryFile({ tabs: [tab, tab] }).length, 1);
});
