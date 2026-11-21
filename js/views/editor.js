// Editor: fretboard clicks, keyboard entry and text entry all edit one editor state.

import { h, showToast } from '../dom.js';
import { STRINGS } from '../music.js';
import { renderColumn } from '../render.js';
import { parseText, serializeText } from '../parser.js';
import { createKeyboardInput } from '../keyboard.js';
import { createFretboard } from '../fretboard.js';
import { newTabId } from '../store.js';
import {
  createEditorState, addNote, insertEvent, removeSelected, splitLine, moveCursor, setCursor,
  compactLines, isEmptyTab, barEvent, restEvent, repeatEvent, REST_VALUES, REPEAT_VALUES,
} from '../tab-model.js';
import { createFormatToggle } from './format-toggle.js';

const REST_LABELS = Object.freeze({ _: '4/4 _', ξ: '2/4 ξ', j: '1/4 j' });
const LINE_LABEL = STRINGS.map((string) => `${string.label}-`).join('\n');
const LINE_END = STRINGS.map(() => '--').join('\n');

function isTypingInField(event) {
  return event.target.closest('input, textarea, select, [contenteditable]') !== null;
}

function emptyTab() {
  return { id: newTabId(), title: '', artist: '', genre: '', notes: '', lines: [[]] };
}

function field(label, control, hint) {
  return h('label', { class: 'field' }, h('span', { class: 'field__label' }, label), control, hint ?? null);
}

export function renderEditor({ store, root, id }) {
  const original = id ? store.get(id) : emptyTab();
  if (!original) {
    root.replaceChildren(h('div', { class: 'page' }, h('h1', {}, 'This tab doesn\'t exist'), h('a', { href: '#/' }, 'Back to all tabs')));
    return {};
  }

  let state = createEditorState(original.lines);
  let history = [];
  let chordMode = false;
  let dirty = false;
  let format;

  // ---- state changes -------------------------------------------------------
  function commit(nextState) {
    if (nextState === state) return;
    history = [...history.slice(-99), state];
    state = nextState;
    dirty = true;
    renderTabEditor();
  }

  function undo() {
    if (history.length === 0) return;
    state = history[history.length - 1];
    history = history.slice(0, -1);
    renderTabEditor();
  }

  const placeNote = (stringKey, fret) => commit(addNote(state, stringKey, fret, { chord: chordMode }));

  const commands = {
    newLine: () => commit(splitLine(state)),
    remove: () => commit(removeSelected(state)),
    cursorLeft: () => { state = moveCursor(state, -1); renderTabEditor(); },
    cursorRight: () => { state = moveCursor(state, 1); renderTabEditor(); },
    bar: () => commit(insertEvent(state, barEvent())),
    toggleChord: () => setChordMode(!chordMode),
    repeatOpen: () => commit(insertEvent(state, repeatEvent('{'))),
    repeatClose: () => commit(insertEvent(state, repeatEvent('}'))),
  };

  // ---- metadata form -------------------------------------------------------
  const titleInput = h('input', { type: 'text', required: true, value: original.title, autocomplete: 'off' });
  const artistInput = h('input', { type: 'text', value: original.artist ?? '', autocomplete: 'off' });
  const genreInput = h('input', { type: 'text', value: original.genre ?? '', list: 'genre-options', autocomplete: 'off' });
  const notesInput = h('textarea', { rows: 2 });
  notesInput.value = original.notes ?? '';
  const genreOptions = h('datalist', { id: 'genre-options' },
    [...new Set(store.list().map((tab) => tab.genre).filter(Boolean))].map((genre) => h('option', { value: genre })));
  [titleInput, artistInput, genreInput, notesInput].forEach((input) => input.addEventListener('input', () => { dirty = true; }));

  // ---- controls -------------------------------------------------------------
  const chordButton = h('button', {
    type: 'button', class: 'button toggle', 'aria-pressed': 'false', title: 'Stack notes into one column (key: c)',
    onClick: () => setChordMode(!chordMode),
  }, 'Chord');

  function setChordMode(enabled) {
    chordMode = enabled;
    chordButton.setAttribute('aria-pressed', String(enabled));
  }

  const smallButton = (label, title, onClick) => h('button', { type: 'button', class: 'button button--small', title, onClick }, label);

  const controls = h('div', { class: 'controls' },
    h('div', { class: 'controls__group' },
      chordButton,
      smallButton('|', 'Bar (key: |)', commands.bar),
      smallButton('New line', 'New line (key: Enter)', commands.newLine)),
    h('div', { class: 'controls__group', 'aria-label': 'Rests' },
      h('span', { class: 'controls__label' }, 'Rest'),
      REST_VALUES.map((value) => smallButton(REST_LABELS[value], `Rest ${REST_LABELS[value]}`, () => commit(insertEvent(state, restEvent(value)))))),
    h('div', { class: 'controls__group', 'aria-label': 'Repeats' },
      h('span', { class: 'controls__label' }, 'Repeat'),
      REPEAT_VALUES.map((value) => smallButton(value, `Repeat ${value}`, () => commit(insertEvent(state, repeatEvent(value)))))),
    h('div', { class: 'controls__group controls__group--end' },
      smallButton('Remove', 'Remove the highlighted column (key: Backspace)', commands.remove),
      smallButton('Undo', 'Undo (Ctrl+Z)', undo)));

  const pendingChip = h('output', { class: 'pending', 'aria-live': 'polite' });
  const keyHelp = h('p', { class: 'key-help' },
    h('kbd', {}, 'd'), ' ', h('kbd', {}, 'a'), ' ', h('kbd', {}, 'D'), ' then fret  ·  ',
    h('kbd', {}, 'Space'), ' after 1 for fret 1  ·  ',
    h('kbd', {}, '←'), h('kbd', {}, '→'), ' move  ·  ',
    h('kbd', {}, 'Enter'), ' new line  ·  ', h('kbd', {}, 'c'), ' chord',
    pendingChip);

  // ---- tab editor -----------------------------------------------------------
  const tabEditor = h('div', { class: 'tab-editor', 'aria-label': 'Tablature editor. Click a column to select it.' });
  const toggle = createFormatToggle((next) => { format = next; renderTabEditor(); });
  format = toggle.format;

  const caret = () => h('span', { class: 'caret', 'aria-hidden': 'true' });

  function columnElement(event, lineIndex, eventIndex) {
    const selected = state.cursor.line === lineIndex && state.cursor.index === eventIndex + 1;
    const text = renderColumn(event, format).map((cell) => `--${cell}`).join('\n');
    return h('button', {
      type: 'button', class: selected ? 'tab-col is-selected' : 'tab-col', tabindex: '-1',
      onClick: () => { state = setCursor(state, lineIndex, eventIndex + 1); renderTabEditor(); },
    }, text);
  }

  function lineElement(events, lineIndex) {
    const parts = [h('button', {
      type: 'button', class: 'tab-col tab-col--label', tabindex: '-1', title: 'Put the cursor at the line start',
      onClick: () => { state = setCursor(state, lineIndex, 0); renderTabEditor(); },
    }, LINE_LABEL)];
    events.forEach((event, eventIndex) => {
      if (state.cursor.line === lineIndex && state.cursor.index === eventIndex) parts.push(caret());
      parts.push(columnElement(event, lineIndex, eventIndex));
    });
    if (state.cursor.line === lineIndex && state.cursor.index === events.length) parts.push(caret());
    parts.push(h('span', { class: 'tab-col tab-col--end', 'aria-hidden': 'true' }, LINE_END));
    const isActive = state.cursor.line === lineIndex;
    return h('div', { class: isActive ? 'tab-line is-active' : 'tab-line' }, parts);
  }

  // The line being edited, pinned under the fretboard so long tabs need no scrolling.
  const activeLineTitle = h('h2', {});
  const activeLineEditor = h('div', { class: 'tab-editor tab-editor--active', 'aria-label': 'Line being edited' });

  function renderActiveLine() {
    const { line } = state.cursor;
    activeLineTitle.textContent = `Editing line ${line + 1} of ${state.lines.length}`;
    activeLineEditor.replaceChildren(lineElement(state.lines[line], line));
  }

  const textInput = h('textarea', { class: 'text-input', rows: 4, spellcheck: false, placeholder: 'd0 d0 a2 | d5+a7 _ x2' });
  const textErrors = h('ul', { class: 'text-errors', 'aria-live': 'polite' });

  function renderTabEditor() {
    renderActiveLine();
    tabEditor.replaceChildren(...state.lines.map(lineElement));
    if (document.activeElement !== textInput) textInput.value = serializeText(state.lines);
  }

  function applyText() {
    const { lines, errors } = parseText(textInput.value);
    textErrors.replaceChildren(...errors.map((error) => h('li', {}, `Line ${error.line}, "${error.token}": ${error.message}`)));
    if (errors.length > 0) return;
    commit(createEditorState(lines));
    showToast('Text applied');
  }

  // ---- keyboard ---------------------------------------------------------------
  const keyboard = createKeyboardInput({
    onNote: placeNote,
    onCommand: (command) => commands[command](),
    onPendingChange: (pending) => { pendingChip.textContent = pending; pendingChip.hidden = pending === ''; },
    onError: (message) => showToast(message, { tone: 'error' }),
  });
  pendingChip.hidden = true;

  function onKeyDown(event) {
    if (isTypingInField(event)) return;
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      undo();
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (keyboard.handleKey(event.key)) event.preventDefault();
  }
  document.addEventListener('keydown', onKeyDown);

  function onBeforeUnload(event) {
    if (dirty) event.preventDefault();
  }
  window.addEventListener('beforeunload', onBeforeUnload);

  // ---- save -----------------------------------------------------------------
  function save() {
    const title = titleInput.value.trim();
    if (title === '') {
      titleInput.focus();
      showToast('Add a title before saving', { tone: 'error' });
      return;
    }
    if (isEmptyTab(state.lines) && !confirm('The tab has no notes. Save anyway?')) return;
    store.save({
      ...original,
      title,
      artist: artistInput.value.trim(),
      genre: genreInput.value.trim(),
      notes: notesInput.value.trim(),
      lines: compactLines(state.lines),
    });
    dirty = false;
    showToast('Saved in this browser. Export JSON to publish.');
    location.hash = `#/tab/${encodeURIComponent(original.id)}`;
  }

  function clearTab() {
    if (isEmptyTab(state.lines) || !confirm('Remove every note from this tab?')) return;
    commit(createEditorState());
  }

  // ---- layout -----------------------------------------------------------------
  root.replaceChildren(h('div', { class: 'page page--editor' },
    h('a', { class: 'back', href: id ? `#/tab/${encodeURIComponent(id)}` : '#/' }, id ? 'Back to tab' : 'All tabs'),
    h('h1', {}, id ? `Edit ${original.title}` : 'New tab'),
    h('div', { class: 'meta-form' },
      field('Title', titleInput), field('Artist', artistInput), field('Genre', genreInput), genreOptions,
      h('div', { class: 'meta-form__notes' }, field('Notes', notesInput))),
    createFretboard(placeNote),
    h('section', { class: 'tab-panel tab-panel--active' }, activeLineTitle, activeLineEditor),
    controls,
    keyHelp,
    h('section', { class: 'tab-panel' },
      h('div', { class: 'tab-panel__head' }, h('h2', {}, 'Tablature'), toggle.element),
      tabEditor),
    h('details', { class: 'text-entry' },
      h('summary', {}, 'Type or paste as text'),
      h('p', { class: 'hint' }, 'One line per tab line. d5 = top string fret 5, a = middle, D = bass. d5+a7 = chord. Also | _ ξ j { } x2 x3 x4.'),
      textInput,
      textErrors,
      h('button', { type: 'button', class: 'button', onClick: applyText }, 'Apply text')),
    h('div', { class: 'editor-actions' },
      h('button', { type: 'button', class: 'button button--quiet', onClick: clearTab }, 'Clear tab'),
      h('a', { class: 'button', href: id ? `#/tab/${encodeURIComponent(id)}` : '#/' }, 'Cancel'),
      h('button', { type: 'button', class: 'button button--primary', onClick: save }, 'Save'))));

  // Mouse clicks on buttons shouldn't steal focus, or the next Space/Enter would press them again.
  // Clicking a button also leaves any text field, so typed notes go to the tab, not the field.
  root.firstElementChild.addEventListener('mousedown', (event) => {
    if (!event.target.closest('button')) return;
    event.preventDefault();
    if (document.activeElement?.matches('input, textarea')) document.activeElement.blur();
  });

  renderTabEditor();
  if (!id) titleInput.focus();

  return {
    canLeave: () => !dirty || confirm('Leave without saving? Your changes will be lost.'),
    cleanup: () => {
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', onBeforeUnload);
      keyboard.cancel();
    },
  };
}
